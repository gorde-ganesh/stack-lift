import { select, checkbox, confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { detectStack } from './stack-detector.js';
import { analyzeDependencies } from './dependency-analyzer.js';
import { planUpgrade } from './upgrade-planner.js';
import { analyzeBreakingChanges } from './breaking-change-analyzer.js';
import { applyRefactors } from './refactor-engine.js';
import { writeArtifacts } from './artifact-writer.js';
import { readSession, updateSession, clearSession } from './session.js';
import { getReplacementEntry } from '../knowledge/replacements.js';
import { ANGULAR_SUPPORTED_VERSIONS, getAngularLatestVersion } from '../knowledge/angular.js';
import { REACT_SUPPORTED_VERSIONS, getReactLatestVersion } from '../knowledge/react.js';
import type {
  StackInfo,
  MigrationObjective,
  MigrationDecisions,
  BackupStrategy,
  ArtifactFormat,
  PackageReplacement,
  UpgradeReport,
} from '../types/index.js';
import { execSync } from 'node:child_process';

// ── Helpers ───────────────────────────────────────────────────────────────────

function divider() {
  console.log(chalk.dim('  ─────────────────────────────────────────'));
}

function phaseHeader(label: string) {
  console.log('');
  console.log(chalk.bold.blue(`  ◆ ${label}`));
  divider();
}

function countOccurrences(projectPath: string, packageName: string): number {
  const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.html']);
  const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.angular', 'coverage']);
  let count = 0;

  function walk(dir: string) {
    let entries: ReturnType<typeof fs.readdirSync>;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) walk(full);
      } else if (SOURCE_EXTS.has(path.extname(e.name))) {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          const matches = content.match(new RegExp(packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
          if (matches) count += matches.length;
        } catch { /* skip unreadable files */ }
      }
    }
  }

  walk(projectPath);
  return count;
}

function versionTargets(stack: StackInfo): Array<{ version: string; label: string; effort: string; recommended: boolean }> {
  const from = parseInt(stack.frameworkVersion.split('.')[0] ?? '0', 10);
  const latest = stack.framework === 'Angular'
    ? parseInt(getAngularLatestVersion(), 10)
    : parseInt(getReactLatestVersion(), 10);
  const supported = stack.framework === 'Angular' ? ANGULAR_SUPPORTED_VERSIONS : REACT_SUPPORTED_VERSIONS;

  const targets: ReturnType<typeof versionTargets> = [];

  for (const ver of supported) {
    const v = parseInt(ver, 10);
    if (v <= from) continue;

    let effort: string;
    const hops = v - from;
    if (hops === 1) effort = 'lower risk — 1 hop';
    else if (hops === 2) effort = 'moderate — 2 hops';
    else effort = `higher effort — ${hops} hops`;

    const recommended = v === latest;
    const tag = recommended ? chalk.green(' (recommended stable)') : v > latest ? chalk.yellow(' (latest)') : '';
    targets.push({ version: ver, label: `${stack.framework} ${ver}${tag} — ${effort}`, effort, recommended });
  }

  return targets;
}

// ── Phase 1: Discovery ────────────────────────────────────────────────────────

function printDiscovery(stack: StackInfo) {
  phaseHeader('Phase 1 — Discovery');
  console.log(`  ${chalk.dim('Framework     ')} ${chalk.cyan(`${stack.framework} ${stack.frameworkVersion}`)}`);
  if (stack.typescript) console.log(`  ${chalk.dim('TypeScript    ')} ${stack.typescript}${stack.tsconfig?.strict ? chalk.green(' (strict mode on)') : chalk.yellow(' (strict mode off)')}`);
  if (stack.rxjs)       console.log(`  ${chalk.dim('RxJS          ')} ${stack.rxjs}`);
  console.log(`  ${chalk.dim('Build tool    ')} ${stack.buildTool}`);
  console.log(`  ${chalk.dim('Pkg manager   ')} ${stack.packageManager}`);
  if (stack.nodeVersion) console.log(`  ${chalk.dim('Node          ')} ${stack.nodeVersion}`);
  console.log(`  ${chalk.dim('Lockfile      ')} ${stack.lockfileParsed ? chalk.green('parsed (exact versions)') : chalk.yellow('not found (using declared ranges)')}`);
  if (stack.isMonorepo) console.log(`  ${chalk.yellow('⚠  Monorepo detected')} — root + workspace deps will be shown`);
  console.log('');
}

// ── Phase 2: Intent ───────────────────────────────────────────────────────────

async function askObjective(): Promise<MigrationObjective> {
  return select<MigrationObjective>({
    message: 'Migration objective?',
    choices: [
      { name: 'Minimal risk — just make the build pass, touch as little as possible', value: 'minimal-risk' },
      { name: 'Security cleanup — remove vulnerable and deprecated packages first', value: 'security' },
      { name: 'Modernization — best practices, standalone components, strict types', value: 'modernization' },
      { name: 'Performance — move to Vite/esbuild, reduce bundle size', value: 'performance' },
      { name: 'Full migration — do everything: framework, deps, tooling, patterns', value: 'full-migration' },
    ],
  });
}

async function askTargetVersion(stack: StackInfo, objective: MigrationObjective): Promise<string> {
  const targets = versionTargets(stack);
  if (targets.length === 0) {
    console.log(chalk.green(`  ✔ ${stack.framework} ${stack.frameworkVersion} is already the latest supported version.`));
    return stack.frameworkVersion.split('.')[0] ?? stack.frameworkVersion;
  }

  // Pre-select based on objective
  let defaultIdx = targets.findIndex(t => t.recommended);
  if (objective === 'minimal-risk') {
    defaultIdx = 0; // next hop only
  }

  return select<string>({
    message: `Target ${stack.framework} version?`,
    choices: targets.map((t, i) => ({ name: t.label, value: t.version, ...(i === defaultIdx ? {} : {}) })),
    default: targets[defaultIdx]?.version,
  });
}

// ── Phase 3: Analysis ─────────────────────────────────────────────────────────

async function runAnalysis(stack: StackInfo) {
  const spinner = ora('Querying npm registry and analyzing dependencies…').start();
  const result = await analyzeDependencies(stack);
  spinner.succeed(`Found ${result.outdated.length} outdated package(s), ${result.peerConflicts.length} peer conflict(s)`);
  return result;
}

// ── Phase 4: Decisions ────────────────────────────────────────────────────────

async function askPackageReplacements(
  stack: StackInfo,
  deprecatedNames: string[],
): Promise<PackageReplacement[]> {
  const replacements: PackageReplacement[] = [];

  for (const pkg of deprecatedNames) {
    const entry = getReplacementEntry(pkg);
    if (!entry) continue;

    const occurrences = countOccurrences(stack.projectPath, pkg);
    const effortStr = occurrences === 0
      ? chalk.dim('(not found in source — may be transitive)')
      : chalk.yellow(`found in ${occurrences} location(s)`);

    console.log('');
    console.log(`  ${chalk.bold.red('⚠')} ${chalk.bold(pkg)} — ${entry.reason}`);
    console.log(`  ${effortStr}`);
    console.log('');

    const choices = [
      ...entry.alternatives.map(alt => ({
        name: [
          chalk.bold(alt.name),
          chalk.dim(`—`),
          alt.description,
          alt.apiSimilarity === 'high' ? chalk.green('[API similar]') : alt.apiSimilarity === 'medium' ? chalk.yellow('[some changes]') : chalk.red('[new API]'),
          chalk.dim(`effort: ${alt.migrationEffort}`),
          alt.bundleNote ? chalk.cyan(`[${alt.bundleNote}]`) : '',
        ].filter(Boolean).join(' '),
        value: alt.name,
        description: alt.notes ?? '',
      })),
      { name: chalk.dim(entry.skipOption), value: '__skip__', description: '' },
    ];

    const chosen = await select<string>({
      message: `Replace ${chalk.bold(pkg)} with?`,
      choices,
    });

    replacements.push({
      package: pkg,
      chosen: chosen === '__skip__' ? null : chosen,
      occurrences,
    });
  }

  return replacements;
}

async function askBackupStrategy(): Promise<BackupStrategy> {
  return select<BackupStrategy>({
    message: 'Create a backup before starting?',
    choices: [
      { name: 'Create a git branch (git checkout -b upgrade/stack-lift)', value: 'branch' },
      { name: 'Create a git tag  (git tag pre-upgrade-backup)', value: 'tag' },
      { name: 'No backup — I will manage it myself', value: 'none' },
    ],
  });
}

async function askOutputFormats(): Promise<ArtifactFormat[]> {
  return checkbox<ArtifactFormat>({
    message: 'Generate artifacts',
    choices: [
      { name: 'Markdown report', value: 'markdown', checked: true },
      { name: 'JSON report (for CI / tooling)', value: 'json', checked: true },
    ],
  });
}

async function askOutputDir(): Promise<string> {
  return input({
    message: 'Output directory',
    default: './stacklift-output',
  });
}

// ── Git backup ────────────────────────────────────────────────────────────────

function applyBackup(projectPath: string, strategy: BackupStrategy): void {
  try {
    if (strategy === 'branch') {
      execSync('git checkout -b upgrade/stack-lift', { cwd: projectPath, stdio: 'pipe' });
      console.log(chalk.green('  ✔ Created branch: upgrade/stack-lift'));
    } else if (strategy === 'tag') {
      execSync('git tag pre-upgrade-backup', { cwd: projectPath, stdio: 'pipe' });
      console.log(chalk.green('  ✔ Created tag: pre-upgrade-backup'));
    }
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ Could not create backup (${String(err)}). Continuing.`));
  }
}

// ── Checklist printer ─────────────────────────────────────────────────────────

function printChecklist(report: UpgradeReport, replacements: PackageReplacement[], artifacts: Array<{ format: string; filePath: string }>) {
  phaseHeader('Migration Checklist');

  for (const { format, filePath } of artifacts) {
    console.log(`  ${chalk.green('✔')} ${format.toUpperCase()} report → ${chalk.cyan(filePath)}`);
  }
  console.log('');

  console.log(chalk.bold('  Framework upgrade steps:'));
  for (const [i, step] of report.plan.steps.entries()) {
    console.log(`  ${chalk.cyan(`${i + 1}.`)} ${step.fromVersion} → ${step.toVersion}  ${chalk.dim(step.description)}`);
    for (const action of step.manualActions) {
      console.log(`     ${chalk.yellow('□')} ${action}`);
    }
    if (step.referenceUrl) {
      console.log(`     ${chalk.dim('📖')} ${chalk.dim(step.referenceUrl)}`);
    }
  }
  console.log('');

  const chosen = replacements.filter(r => r.chosen !== null);
  if (chosen.length > 0) {
    console.log(chalk.bold('  Package replacements to apply:'));
    for (const r of chosen) {
      console.log(`  ${chalk.yellow('□')} Replace ${chalk.bold(r.package)} → ${chalk.cyan(r.chosen ?? '')}  ${chalk.dim(`(${r.occurrences} occurrence(s) in source)`)}`);
    }
    console.log('');
  }

  const skipped = replacements.filter(r => r.chosen === null);
  if (skipped.length > 0) {
    console.log(chalk.bold('  Deferred (skipped) packages:'));
    for (const r of skipped) {
      console.log(`  ${chalk.dim('○')} ${r.package} — ${chalk.dim('marked for later')}`);
    }
    console.log('');
  }

  console.log(chalk.bold('  Code issues found in source:'));
  const allSuggestions = report.refactorResults.flatMap(r => r.suggestions);
  if (allSuggestions.length === 0) {
    console.log(`  ${chalk.green('✔')} No code issues detected.\n`);
  } else {
    console.log(`  ${chalk.yellow(String(allSuggestions.length))} location(s) require attention — see the report for details.\n`);
  }

  console.log(chalk.bold('  After each hop, run:'));
  console.log(`  ${chalk.dim('$')} ${report.stack.packageManager === 'yarn' ? 'yarn build && yarn test' : report.stack.packageManager === 'pnpm' ? 'pnpm build && pnpm test' : 'npm run build && npm test'}`);
  console.log('');
}

// ── Main interactive flow ─────────────────────────────────────────────────────

export interface InteractiveRunResult {
  report: UpgradeReport;
  decisions: MigrationDecisions;
  artifacts: Array<{ format: string; filePath: string }>;
}

export async function runInteractive(projectPath: string): Promise<InteractiveRunResult> {
  const resolved = path.resolve(projectPath);

  console.log('');
  console.log(chalk.bold.blue('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('  ║        stack-lift interactive migrate      ║'));
  console.log(chalk.bold.blue('  ╚══════════════════════════════════════════╝'));

  // ── Check for existing session ─────────────────────────────────────────────
  const existing = readSession(resolved);
  if (existing && existing.phase !== 'done') {
    const resume = await confirm({
      message: `Resume previous session from ${chalk.cyan(existing.lastUpdatedAt)}?`,
      default: true,
    });
    if (!resume) clearSession(resolved);
  }

  // ── Phase 1: Discovery ─────────────────────────────────────────────────────
  const spinner = ora('Scanning project…').start();
  let stack: StackInfo;
  try {
    stack = detectStack(resolved);
    spinner.succeed(`Detected: ${chalk.cyan(`${stack.framework} ${stack.frameworkVersion}`)}`);
  } catch (err) {
    spinner.fail(String(err));
    throw err;
  }

  printDiscovery(stack);

  const shouldContinue = await confirm({ message: 'Continue with this project?', default: true });
  if (!shouldContinue) {
    console.log(chalk.dim('  Aborted.\n'));
    process.exit(0);
  }

  // ── Phase 2: Intent ────────────────────────────────────────────────────────
  phaseHeader('Phase 2 — Intent');
  const objective = await askObjective();
  const targetVersion = await askTargetVersion(stack, objective);

  updateSession(resolved, { phase: 'decisions', decisions: { objective, targetVersion } });

  // ── Phase 3: Analysis ──────────────────────────────────────────────────────
  phaseHeader('Phase 3 — Analysis');
  const { outdated, peerConflicts } = await runAnalysis(stack);

  // Show peer conflicts if any
  if (peerConflicts.length > 0) {
    console.log('');
    console.log(chalk.bold(`  ${chalk.red('!')} Peer dependency conflicts (${peerConflicts.length}):`));
    for (const c of peerConflicts) {
      console.log(`  ${chalk.red('●')} ${chalk.bold(c.package)} ${chalk.dim(c.installedVersion)} does not satisfy ${chalk.cyan(c.requiredRange)} required by ${chalk.bold(c.requiredBy)}`);
    }
  }

  const deprecated = outdated.filter(d => d.deprecated);
  if (deprecated.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Deprecated packages found (${deprecated.length}):`));
    for (const d of deprecated) {
      console.log(`  ${chalk.red('●')} ${chalk.bold(d.name)} ${chalk.dim(d.current)} — ${d.reason ?? 'deprecated'}`);
    }
  }

  const outdatedOnly = outdated.filter(d => !d.deprecated);
  if (outdatedOnly.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Outdated packages (${outdatedOnly.length}):`));
    for (const d of outdatedOnly.slice(0, 8)) {
      const latest = d.latest === 'unknown' ? chalk.dim('unknown') : chalk.cyan(d.latest);
      console.log(`  ${chalk.yellow('●')} ${chalk.bold(d.name.padEnd(40))} ${chalk.dim(d.current)} → ${latest}`);
    }
    if (outdatedOnly.length > 8) console.log(`  ${chalk.dim(`… and ${outdatedOnly.length - 8} more`)}`);
  }

  console.log('');
  const phase3ok = await confirm({ message: 'Analysis complete. Continue to decisions?', default: true });
  if (!phase3ok) {
    console.log(chalk.dim('  Paused. Re-run to resume.\n'));
    process.exit(0);
  }

  // ── Phase 4: Decisions ─────────────────────────────────────────────────────
  phaseHeader('Phase 4 — Decisions');

  const deprecatedWithReplacements = deprecated.filter(d => getReplacementEntry(d.name));
  let packageReplacements: PackageReplacement[] = [];
  if (deprecatedWithReplacements.length > 0) {
    console.log('  For each deprecated package, choose a replacement or defer:\n');
    packageReplacements = await askPackageReplacements(stack, deprecatedWithReplacements.map(d => d.name));
  }

  console.log('');
  const backupStrategy = await askBackupStrategy();
  const outputFormats = await askOutputFormats();
  const outputDir = await askOutputDir();

  updateSession(resolved, {
    phase: 'planning',
    decisions: { packageReplacements, backupStrategy, outputFormats, outputDir },
  });

  const decisions: MigrationDecisions = {
    objective,
    targetVersion,
    packageReplacements,
    backupStrategy,
    outputFormats,
    outputDir,
    autoApply: false,
  };

  // ── Confirmation ───────────────────────────────────────────────────────────
  console.log('');
  divider();
  console.log(`  ${chalk.bold('Objective')}  ${objective}`);
  console.log(`  ${chalk.bold('Target')}     ${stack.framework} ${targetVersion}`);
  console.log(`  ${chalk.bold('Backup')}     ${backupStrategy}`);
  console.log(`  ${chalk.bold('Output')}     ${outputFormats.join(', ')} → ${outputDir}`);
  const chosen = packageReplacements.filter(r => r.chosen !== null);
  const skipped = packageReplacements.filter(r => r.chosen === null);
  if (chosen.length > 0) console.log(`  ${chalk.bold('Replace')}    ${chosen.map(r => `${r.package} → ${r.chosen}`).join(', ')}`);
  if (skipped.length > 0) console.log(`  ${chalk.bold('Defer')}      ${skipped.map(r => r.package).join(', ')}`);
  divider();
  console.log('');

  const goAhead = await confirm({ message: 'Generate plan and write artifacts?', default: true });
  if (!goAhead) {
    console.log(chalk.dim('  Cancelled. Session saved — re-run to resume.\n'));
    process.exit(0);
  }

  // ── Backup ─────────────────────────────────────────────────────────────────
  if (backupStrategy !== 'none') {
    applyBackup(resolved, backupStrategy);
  }

  // ── Planning + analysis ────────────────────────────────────────────────────
  const planSpinner = ora('Building upgrade plan…').start();
  const plan = planUpgrade(stack, targetVersion);
  planSpinner.succeed(`Plan ready: ${plan.steps.length} step(s), effort ${plan.estimatedEffort}`);

  const codeSpinner = ora('Scanning source files for breaking-change patterns…').start();
  const codeSuggestions = analyzeBreakingChanges(resolved, plan);
  codeSpinner.succeed(`Found ${codeSuggestions.length} code location(s) to review`);

  const byFile = new Map<string, typeof codeSuggestions>();
  for (const s of codeSuggestions) {
    const list = byFile.get(s.file) ?? [];
    list.push(s);
    byFile.set(s.file, list);
  }
  const refactorResults = Array.from(byFile.entries()).map(([file, suggestions]) => ({ file, suggestions }));
  const manualActions = [...new Set(plan.steps.flatMap(s => s.manualActions))];

  const report: UpgradeReport = {
    stack,
    plan,
    outdatedDependencies: outdated,
    peerConflicts,
    refactorResults,
    manualActions,
    buildStatus: 'skipped',
    generatedAt: new Date().toISOString(),
  };

  // ── Write artifacts ────────────────────────────────────────────────────────
  const writeSpinner = ora(`Writing artifacts to ${outputDir}…`).start();
  const resolvedOutputDir = path.resolve(resolved, outputDir);
  let artifacts: Array<{ format: string; filePath: string }> = [];
  try {
    artifacts = writeArtifacts(report, resolvedOutputDir, outputFormats);
    writeSpinner.succeed(`Wrote ${artifacts.length} artifact(s)`);
  } catch (err) {
    writeSpinner.fail(`Could not write artifacts: ${String(err)}`);
  }

  // ── Apply automated refactors (always off in interactive mode) ─────────────
  // Users confirm per-file before applying — this is a future phase.
  // Here we just report what could be auto-fixed.
  const autoFixable = codeSuggestions.filter(s => s.change.automated);
  if (autoFixable.length > 0) {
    console.log('');
    console.log(chalk.bold(`  ${chalk.green(String(autoFixable.length))} location(s) can be auto-fixed.`));
    console.log(chalk.dim(`  Re-run with ${chalk.white('stack-lift upgrade . --apply')} to apply them.`));
  }

  // ── Checklist ──────────────────────────────────────────────────────────────
  printChecklist(report, packageReplacements, artifacts);

  // ── Done ───────────────────────────────────────────────────────────────────
  updateSession(resolved, { phase: 'done', decisions });
  console.log(chalk.bold.green('  ✔ Migration plan complete.\n'));

  return { report, decisions, artifacts };
}
