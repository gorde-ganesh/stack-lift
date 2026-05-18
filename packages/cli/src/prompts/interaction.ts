import { select, checkbox, confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  detectStack,
  analyzeDependencies,
  planUpgrade,
  analyzeBreakingChanges,
  applyRefactors,
  analyzeConfigMigrations,
  applyConfigMigrations,
  writeArtifacts,
  writeMachineArtifacts,
  readSession,
  updateSession,
  clearSession,
  computeFingerprint,
  isFingerprintStale,
  getReplacementEntry,
  getApplicableReplacements,
  REACT_SUPPORTED_VERSIONS,
  getReactLatestVersion,
  validateBuild,
  RollbackManager,
  executeCommands,
} from '@stack-lift/core';
import type { ExecuteCommandsResult } from '@stack-lift/core';
import {
  ANGULAR_SUPPORTED_VERSIONS,
  getAngularLatestVersion,
  registerAngularProvider,
} from '@stack-lift/angular-provider';
import type {
  StackInfo,
  MigrationObjective,
  MigrationDecisions,
  BackupStrategy,
  ArtifactFormat,
  PackageReplacement,
  UpgradeReport,
  UpgradePlan,
  NonInteractiveOptions,
  BuildValidationResult,
  ExecutionMode,
  PackageManager,
  CommandExecutionRecord,
} from '@stack-lift/shared';
import { execSync } from 'node:child_process';

registerAngularProvider();

// ── Helpers ───────────────────────────────────────────────────────────────────

function divider() {
  console.log(chalk.dim('  ─────────────────────────────────────────'));
}

function phaseHeader(label: string) {
  console.log('');
  console.log(chalk.bold.blue(`  ◆ ${label}`));
  divider();
}

const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.angular', 'coverage']);

function countOccurrences(projectPath: string, packageName: string): number {
  const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.html']);
  let count = 0;

  function walk(dir: string) {
    let entries: fs.Dirent<string>[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true, encoding: 'utf8' });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) walk(full);
      } else if (SOURCE_EXTS.has(path.extname(e.name))) {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          const matches = content.match(
            new RegExp(packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          );
          if (matches) count += matches.length;
        } catch {
          /* skip unreadable files */
        }
      }
    }
  }

  walk(projectPath);
  return count;
}

function countSpecFiles(projectPath: string): number {
  let count = 0;
  function walk(dir: string) {
    let entries: fs.Dirent<string>[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true, encoding: 'utf8' });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) walk(path.join(dir, e.name));
      } else if (
        e.name.endsWith('.spec.ts') ||
        e.name.endsWith('.spec.js') ||
        e.name.endsWith('.test.ts') ||
        e.name.endsWith('.test.js')
      ) {
        count++;
      }
    }
  }
  walk(projectPath);
  return count;
}

function detectPackageUsage(
  projectPath: string,
  pkg: string,
): { inUse: boolean; evidence: string; occurrences: number } {
  switch (pkg) {
    case 'karma': {
      const hasConf =
        fs.existsSync(path.join(projectPath, 'karma.conf.js')) ||
        fs.existsSync(path.join(projectPath, 'karma.conf.ts'));
      const specCount = countSpecFiles(projectPath);
      const inUse = hasConf || specCount > 0;
      const parts = [
        hasConf && 'karma.conf.js found',
        specCount > 0 && `${specCount} spec file(s)`,
      ].filter(Boolean);
      return {
        inUse,
        evidence: inUse ? parts.join(', ') : 'no karma.conf.js or spec files detected',
        occurrences: specCount,
      };
    }
    case 'tslint': {
      const hasConfig = fs.existsSync(path.join(projectPath, 'tslint.json'));
      return {
        inUse: hasConfig,
        evidence: hasConfig ? 'tslint.json found' : 'no tslint.json found',
        occurrences: hasConfig ? 1 : 0,
      };
    }
    case 'codelyzer': {
      const hasTslint = fs.existsSync(path.join(projectPath, 'tslint.json'));
      const occ = countOccurrences(projectPath, 'codelyzer');
      return {
        inUse: hasTslint || occ > 0,
        evidence: hasTslint
          ? 'tslint.json found (codelyzer rules)'
          : `${occ} occurrence(s) in source`,
        occurrences: occ,
      };
    }
    default: {
      const occ = countOccurrences(projectPath, pkg);
      return {
        inUse: occ > 0,
        evidence: occ > 0 ? `${occ} occurrence(s) in source` : 'not found in source',
        occurrences: occ,
      };
    }
  }
}

function versionTargets(
  stack: StackInfo,
  objective?: MigrationObjective,
): Array<{ version: string; label: string; effort: string; recommended: boolean }> {
  const from = parseInt(stack.frameworkVersion.split('.')[0] ?? '0', 10);
  const latest =
    stack.framework === 'Angular'
      ? parseInt(getAngularLatestVersion(), 10)
      : parseInt(getReactLatestVersion(), 10);
  const supported =
    stack.framework === 'Angular' ? ANGULAR_SUPPORTED_VERSIONS : REACT_SUPPORTED_VERSIONS;

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
    const tag = recommended
      ? chalk.green(' (recommended stable)')
      : v > latest
        ? chalk.yellow(' (latest)')
        : '';
    targets.push({
      version: ver,
      label: `${stack.framework} ${ver}${tag} — ${effort}`,
      effort,
      recommended,
    });
  }

  // For minimal-risk: only expose the next safe hop to keep the plan conservative
  if (objective === 'minimal-risk' && targets.length > 1) {
    return [targets[0]!];
  }

  return targets;
}

// ── Phase 1: Discovery ────────────────────────────────────────────────────────

function printDiscovery(stack: StackInfo) {
  phaseHeader('Phase 1 — Discovery');
  console.log(
    `  ${chalk.dim('Framework     ')} ${chalk.cyan(`${stack.framework} ${stack.frameworkVersion}`)}`,
  );
  if (stack.typescript)
    console.log(
      `  ${chalk.dim('TypeScript    ')} ${stack.typescript}${stack.tsconfig?.strict ? chalk.green(' (strict mode on)') : chalk.yellow(' (strict mode off)')}`,
    );
  if (stack.rxjs) console.log(`  ${chalk.dim('RxJS          ')} ${stack.rxjs}`);
  console.log(`  ${chalk.dim('Build tool    ')} ${stack.buildTool}`);
  console.log(`  ${chalk.dim('Pkg manager   ')} ${stack.packageManager}`);
  if (stack.nodeVersion) console.log(`  ${chalk.dim('Node          ')} ${stack.nodeVersion}`);
  console.log(
    `  ${chalk.dim('Lockfile      ')} ${stack.lockfileParsed ? chalk.green('parsed (exact versions)') : chalk.yellow('not found (using declared ranges)')}`,
  );
  if (stack.isMonorepo)
    console.log(`  ${chalk.yellow('⚠  Monorepo detected')} — root + workspace deps will be shown`);
  console.log('');
}

// ── Phase 2: Intent ───────────────────────────────────────────────────────────

async function askObjective(): Promise<MigrationObjective> {
  return select<MigrationObjective>({
    message: 'Migration objective?',
    choices: [
      {
        name: 'Minimal risk — just make the build pass, touch as little as possible',
        value: 'minimal-risk',
      },
      {
        name: 'Security cleanup — remove vulnerable and deprecated packages first',
        value: 'security',
      },
      {
        name: 'Modernization — best practices, standalone components, strict types',
        value: 'modernization',
      },
      { name: 'Performance — move to Vite/esbuild, reduce bundle size', value: 'performance' },
      {
        name: 'Full migration — do everything: framework, deps, tooling, patterns',
        value: 'full-migration',
      },
    ],
  });
}

async function askTargetVersion(stack: StackInfo, objective: MigrationObjective): Promise<string> {
  const targets = versionTargets(stack, objective);
  if (targets.length === 0) {
    console.log(
      chalk.green(
        `  ✔ ${stack.framework} ${stack.frameworkVersion} is already the latest supported version.`,
      ),
    );
    return stack.frameworkVersion.split('.')[0] ?? stack.frameworkVersion;
  }

  // For minimal-risk with only one target, auto-select without prompting
  if (objective === 'minimal-risk' && targets.length === 1) {
    const only = targets[0]!;
    console.log(
      `  ${chalk.dim('Target   ')}  ${chalk.cyan(`${stack.framework} ${only.version}`)} ${chalk.dim('(conservative — 1 hop for minimal-risk)')}`,
    );
    return only.version;
  }

  const defaultIdx = targets.findIndex((t) => t.recommended);

  return select<string>({
    message: `Target ${stack.framework} version?`,
    choices: targets.map((t) => ({ name: t.label, value: t.version })),
    default: targets[Math.max(0, defaultIdx)]?.version,
  });
}

// ── Phase 3: Analysis ─────────────────────────────────────────────────────────

async function runAnalysis(stack: StackInfo) {
  const spinner = ora('Querying npm registry and analyzing dependencies…').start();
  const result = await analyzeDependencies(stack);
  spinner.succeed(
    `Found ${result.outdated.length} outdated package(s), ${result.peerConflicts.length} peer conflict(s)`,
  );
  return result;
}

// ── Phase 4: Decisions ────────────────────────────────────────────────────────

async function askPackageReplacements(
  stack: StackInfo,
  deprecatedNames: string[],
  nonInteractive: boolean,
  autoChoices?: Record<string, string>,
  objective?: MigrationObjective,
): Promise<PackageReplacement[]> {
  const replacements: PackageReplacement[] = [];

  for (const pkg of deprecatedNames) {
    const entry = getReplacementEntry(pkg);
    if (!entry) continue;

    const usage = detectPackageUsage(stack.projectPath, pkg);
    const { occurrences } = usage;

    // Skip packages not detected in use for minimal-risk objective
    if (objective === 'minimal-risk' && !usage.inUse) {
      console.log(
        `  ${chalk.dim('○')} ${chalk.bold(pkg)} — ${chalk.dim(`skipped (${usage.evidence}, minimal-risk objective)`)}`,
      );
      replacements.push({ package: pkg, chosen: null, occurrences: 0 });
      continue;
    }

    const effortStr = usage.inUse
      ? chalk.yellow(usage.evidence)
      : chalk.dim(`(${usage.evidence} — may be transitive)`);

    console.log('');
    console.log(`  ${chalk.bold.red('⚠')} ${chalk.bold(pkg)} — ${entry.reason}`);
    console.log(`  ${effortStr}`);
    console.log('');

    if (nonInteractive) {
      // In non-interactive mode: use pre-supplied choice, or pick first alternative, or skip
      const preChosen = autoChoices?.[pkg];
      const chosen = preChosen ?? entry.alternatives[0]?.name ?? null;
      console.log(
        `  ${chalk.dim('→')} ${chalk.dim('non-interactive:')} ${chosen ? chalk.cyan(chosen) : chalk.dim('skipped')}`,
      );
      replacements.push({ package: pkg, chosen: chosen ?? null, occurrences });
      continue;
    }

    // Ask context questions (if any) and reorder alternatives accordingly
    let orderedAlternatives = [...entry.alternatives];
    if (entry.contextQuestions && entry.contextQuestions.length > 0) {
      for (const q of entry.contextQuestions) {
        const answer = await select<string>({
          message: q.question,
          choices: q.choices.map((c) => ({ name: c.label, value: c.value })),
        });

        // Apply reorder rules per package
        if (pkg === 'moment' && q.id === 'moment-timezone') {
          if (answer === 'yes') {
            // Promote luxon first
            orderedAlternatives = [
              ...orderedAlternatives.filter((a) => a.name === 'luxon'),
              ...orderedAlternatives.filter((a) => a.name !== 'luxon'),
            ];
          } else {
            // Promote dayjs first (already default, no change needed)
          }
        } else if (pkg === 'karma' && q.id === 'karma-angular') {
          if (answer === 'yes') {
            // Promote @web/test-runner first (already default)
          } else {
            // Promote jest first for non-Angular
            orderedAlternatives = [
              ...orderedAlternatives.filter((a) => a.name === 'jest'),
              ...orderedAlternatives.filter((a) => a.name !== 'jest'),
            ];
          }
        } else if (pkg === 'react-scripts' && q.id === 'react-scripts-ssr') {
          if (answer === 'yes') {
            // Promote next.js first
            orderedAlternatives = [
              ...orderedAlternatives.filter((a) => a.name === 'next.js'),
              ...orderedAlternatives.filter((a) => a.name !== 'next.js'),
            ];
          }
          // else vite stays first (already default)
        }
      }
    }

    const choices = [
      ...orderedAlternatives.map((alt) => ({
        name: [
          chalk.bold(alt.name),
          chalk.dim(`—`),
          alt.description,
          alt.apiSimilarity === 'high'
            ? chalk.green('[API similar]')
            : alt.apiSimilarity === 'medium'
              ? chalk.yellow('[some changes]')
              : chalk.red('[new API]'),
          chalk.dim(`effort: ${alt.migrationEffort}`),
          alt.bundleNote ? chalk.cyan(`[${alt.bundleNote}]`) : '',
        ]
          .filter(Boolean)
          .join(' '),
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

async function askBackupStrategy(nonInteractive: boolean, yes: boolean): Promise<BackupStrategy> {
  if (nonInteractive || yes) return 'none';
  return select<BackupStrategy>({
    message: 'Create a backup before starting?',
    choices: [
      { name: 'Create a git branch (git checkout -b upgrade/stack-lift)', value: 'branch' },
      { name: 'Create a git tag  (git tag pre-upgrade-backup)', value: 'tag' },
      { name: 'No backup — I will manage it myself', value: 'none' },
    ],
  });
}

async function askOutputFormats(
  nonInteractive: boolean,
  preselected?: ArtifactFormat[],
): Promise<ArtifactFormat[]> {
  if (nonInteractive) return preselected ?? ['markdown', 'json'];
  return checkbox<ArtifactFormat>({
    message: 'Generate artifacts',
    choices: [
      { name: 'Markdown report', value: 'markdown', checked: true },
      { name: 'JSON report (for CI / tooling)', value: 'json', checked: true },
    ],
  });
}

async function askOutputDir(nonInteractive: boolean, defaultDir?: string): Promise<string> {
  if (nonInteractive) return defaultDir ?? './stacklift-output';
  return input({
    message: 'Output directory',
    default: defaultDir ?? './stacklift-output',
  });
}

// ── Upgrade command builder ───────────────────────────────────────────────────

function buildUpgradeCommands(plan: UpgradePlan, packageManager: PackageManager): string[] {
  const cmds: string[] = [];

  const installSync: Record<PackageManager, string> = {
    npm: 'npm install',
    yarn: 'yarn install',
    pnpm: 'pnpm install',
    bun: 'bun install',
  };

  const addPkg = (packages: string): string => {
    const map: Record<PackageManager, string> = {
      npm: `npm install ${packages}`,
      yarn: `yarn add ${packages}`,
      pnpm: `pnpm add ${packages}`,
      bun: `bun add ${packages}`,
    };
    return map[packageManager];
  };

  for (const step of plan.steps) {
    if (step.npmInstall.length === 0) continue;
    const pkgList = step.npmInstall.join(' ');

    if (plan.framework === 'Angular') {
      // ng update handles migrations/schematics; --allow-dirty lets it run with AST fix changes.
      cmds.push(`npx ng update ${pkgList} --allow-dirty --force`);
    } else {
      cmds.push(addPkg(pkgList));
    }
  }

  // Always sync the lockfile after version bumps.
  cmds.push(installSync[packageManager]);

  return cmds;
}

// ── Dry-run preview ───────────────────────────────────────────────────────────

function printDryRunPreview(
  projectPath: string,
  plan: UpgradePlan,
  codeSuggestions: ReturnType<typeof analyzeBreakingChanges>,
): void {
  console.log('');
  console.log(chalk.bold.yellow('  ┌─────────────────────────────────────────────┐'));
  console.log(chalk.bold.yellow('  │          dry-run preview (no writes)         │'));
  console.log(chalk.bold.yellow('  └─────────────────────────────────────────────┘'));

  // ── Package changes ──────────────────────────────────────────────────────────
  const allPackages = plan.steps.flatMap((s) => s.npmInstall);
  if (allPackages.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Package changes (${allPackages.length}):`));
    for (const pkg of allPackages) {
      console.log(`  ${chalk.cyan('+')} ${pkg}`);
    }
  }

  // ── Config file changes ──────────────────────────────────────────────────────
  const configResults = applyConfigMigrations(projectPath, plan, true);
  const neededConfigs = configResults.filter((r) => r.needed);
  if (neededConfigs.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Config file changes (${neededConfigs.length}):`));
    for (const r of neededConfigs) {
      console.log(`  ${chalk.cyan('~')} ${chalk.underline(r.file)}  — ${chalk.dim(r.description)}`);
      if (r.diff) {
        for (const line of r.diff.split('\n')) {
          if (line.startsWith('-')) console.log(`    ${chalk.red(line)}`);
          else if (line.startsWith('+')) console.log(`    ${chalk.green(line)}`);
          else console.log(`    ${chalk.dim(line)}`);
        }
      }
    }
  }

  // ── Code changes ─────────────────────────────────────────────────────────────
  const automatableChanges = codeSuggestions.filter(
    (s) => s.change.automated && s.change.automationLevel === 'automatable',
  );
  if (automatableChanges.length > 0) {
    const dryRunResults = applyRefactors(codeSuggestions, { dryRun: true });
    if (dryRunResults.length > 0) {
      console.log('');
      console.log(chalk.bold(`  Code changes (${dryRunResults.length} file(s)):`));
      for (const r of dryRunResults) {
        const relFile = path.relative(projectPath, r.file);
        console.log(`  ${chalk.cyan('~')} ${chalk.underline(relFile)}`);
        for (const desc of r.applied ?? []) {
          console.log(`    ${chalk.dim('→')} ${desc}`);
        }
        if (r.diff) {
          for (const line of r.diff.split('\n').slice(0, 12)) {
            if (line.startsWith('-')) console.log(`    ${chalk.red(line)}`);
            else if (line.startsWith('+')) console.log(`    ${chalk.green(line)}`);
          }
          const totalLines = r.diff.split('\n').length;
          if (totalLines > 12) {
            console.log(
              chalk.dim(`    … ${totalLines - 12} more line(s) — see the report for full diff`),
            );
          }
        }
      }
    }
  }

  // ── Manual steps ─────────────────────────────────────────────────────────────
  const manualActions = [...new Set(plan.steps.flatMap((s) => s.manualActions))];
  if (manualActions.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Manual steps required (${manualActions.length}):`));
    for (const action of manualActions) {
      console.log(`  ${chalk.yellow('□')} ${action}`);
    }
  }

  if (allPackages.length === 0 && neededConfigs.length === 0 && automatableChanges.length === 0) {
    console.log('');
    console.log(chalk.green('  ✔ No automated changes needed.'));
  }

  console.log('');
  console.log(chalk.dim('  [dry-run] Nothing was written. Re-run without --dry-run to apply.'));
  console.log('');
}

// ── Git safety ────────────────────────────────────────────────────────────────

function isGitDirty(projectPath: string): boolean {
  try {
    const output = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
    }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

// ── Git backup ────────────────────────────────────────────────────────────────

function createBackupManager(projectPath: string, strategy: BackupStrategy): RollbackManager {
  const manager = new RollbackManager(projectPath);
  try {
    if (strategy === 'branch') {
      const originalBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
      }).trim();
      execSync('git checkout -b upgrade/stack-lift', { cwd: projectPath, stdio: 'pipe' });
      manager.setBackup('upgrade/stack-lift', 'branch', originalBranch);
      console.log(chalk.green('  ✔ Created branch: upgrade/stack-lift'));
    } else if (strategy === 'tag') {
      execSync('git tag pre-upgrade-backup', { cwd: projectPath, stdio: 'pipe' });
      manager.setBackup('pre-upgrade-backup', 'tag');
      console.log(chalk.green('  ✔ Created tag: pre-upgrade-backup'));
    }
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ Could not create backup (${String(err)}). Continuing.`));
  }
  return manager;
}

// ── Checklist printer ─────────────────────────────────────────────────────────

function printChecklist(
  report: UpgradeReport,
  replacements: PackageReplacement[],
  artifacts: Array<{ format: string; filePath: string }>,
) {
  phaseHeader('Migration Checklist');

  for (const { format, filePath } of artifacts) {
    console.log(`  ${chalk.green('✔')} ${format.toUpperCase()} report → ${chalk.cyan(filePath)}`);
  }
  console.log('');

  console.log(chalk.bold('  Framework upgrade steps:'));
  for (const [i, step] of report.plan.steps.entries()) {
    console.log(
      `  ${chalk.cyan(`${i + 1}.`)} ${step.fromVersion} → ${step.toVersion}  ${chalk.dim(step.description)}`,
    );
    for (const action of step.manualActions) {
      console.log(`     ${chalk.yellow('□')} ${action}`);
    }
    if (step.referenceUrl) {
      console.log(`     ${chalk.dim('📖')} ${chalk.dim(step.referenceUrl)}`);
    }
  }
  console.log('');

  const chosen = replacements.filter((r) => r.chosen !== null);
  if (chosen.length > 0) {
    console.log(chalk.bold('  Package replacements to apply:'));
    for (const r of chosen) {
      console.log(
        `  ${chalk.yellow('□')} Replace ${chalk.bold(r.package)} → ${chalk.cyan(r.chosen ?? '')}  ${chalk.dim(`(${r.occurrences} occurrence(s) in source)`)}`,
      );
    }
    console.log('');
  }

  const skipped = replacements.filter((r) => r.chosen === null);
  if (skipped.length > 0) {
    console.log(chalk.bold('  Deferred (skipped) packages:'));
    for (const r of skipped) {
      console.log(`  ${chalk.dim('○')} ${r.package} — ${chalk.dim('marked for later')}`);
    }
    console.log('');
  }

  console.log(chalk.bold('  Code issues found in source:'));
  const allSuggestions = report.refactorResults.flatMap((r) => r.suggestions);
  if (allSuggestions.length === 0) {
    console.log(`  ${chalk.green('✔')} No code issues detected.\n`);
  } else {
    console.log(
      `  ${chalk.yellow(String(allSuggestions.length))} location(s) require attention — see the report for details.\n`,
    );
  }

  // Build validation summary
  if (report.buildValidation && report.buildValidation.length > 0) {
    console.log(chalk.bold('  Build validation:'));
    for (const r of report.buildValidation) {
      const icon =
        r.status === 'success'
          ? chalk.green('✔')
          : r.status === 'failed'
            ? chalk.red('✗')
            : chalk.dim('○');
      const dur =
        r.durationMs !== undefined ? chalk.dim(` (${Math.round(r.durationMs / 1000)}s)`) : '';
      console.log(`  ${icon} ${r.step}${dur}`);
      if (r.status === 'failed' && r.error) {
        console.log(`    ${chalk.red(r.error.split('\n')[0] ?? r.error)}`);
      }
    }
    console.log('');
  }

  console.log(chalk.bold('  After each hop, run:'));
  console.log(
    `  ${chalk.dim('$')} ${report.stack.packageManager === 'yarn' ? 'yarn build && yarn test' : report.stack.packageManager === 'pnpm' ? 'pnpm build && pnpm test' : 'npm run build && npm test'}`,
  );
  console.log('');
}

// ── Main interactive flow ─────────────────────────────────────────────────────

export interface InteractiveRunResult {
  report: UpgradeReport;
  decisions: MigrationDecisions;
  artifacts: Array<{ format: string; filePath: string }>;
}

export interface InteractiveOptions {
  /** When true, skip prompts and use provided options. */
  nonInteractive?: boolean;
  /** Pre-supplied options for non-interactive mode. */
  options?: NonInteractiveOptions;
  /** When true, apply automated code fixes. */
  apply?: boolean;
  /** When true, run build validation after planning. */
  validate?: boolean;
  /**
   * Controls migration autonomy level:
   * - safe: analysis-only, no writes, no git changes (dry-run)
   * - guided: interactive with user confirmation at each step (default)
   * - autonomous: non-interactive, applies fixes, validates, auto-rollbacks on failure
   */
  executionMode?: ExecutionMode;
}

export async function runInteractive(
  projectPath: string,
  interactiveOpts: InteractiveOptions = {},
): Promise<InteractiveRunResult> {
  const resolved = path.resolve(projectPath);
  const rawNi = interactiveOpts.nonInteractive ?? false;
  const niOpts = interactiveOpts.options ?? {};
  const mode = interactiveOpts.executionMode ?? 'guided';
  const isSafe = mode === 'safe';
  const isAutonomous = mode === 'autonomous';
  const ni = rawNi || isAutonomous;
  const isDryRun = isSafe || (niOpts.dryRun ?? false);
  const autoYes = ni || (niOpts.yes ?? false);
  const applyFixes = interactiveOpts.apply || isAutonomous;
  const effectiveValidate = (interactiveOpts.validate ?? niOpts.validate ?? false) || isAutonomous;

  console.log('');
  console.log(chalk.bold.blue('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('  ║        stack-lift interactive migrate      ║'));
  if (isSafe) console.log(chalk.bold.yellow('  ║            [safe / analysis-only mode]    ║'));
  else if (isAutonomous)
    console.log(chalk.bold.yellow('  ║              [autonomous mode]            ║'));
  else if (ni) console.log(chalk.bold.blue('  ║              [non-interactive mode]       ║'));
  console.log(chalk.bold.blue('  ╚══════════════════════════════════════════╝'));

  // ── Check for existing session ─────────────────────────────────────────────
  if (!ni) {
    const existing = readSession(resolved);
    if (existing && existing.phase !== 'done') {
      let stale = false;
      if (existing.fingerprint) {
        try {
          const current = computeFingerprint(resolved, existing.fingerprint.frameworkVersion);
          stale = isFingerprintStale(existing.fingerprint, current);
        } catch {
          // fingerprint check failed — treat as not stale, resume is safe to offer
        }
      }
      if (stale) {
        console.log('');
        console.log(chalk.yellow('  ⚠ Project changed since session creation.'));
        console.log(
          chalk.dim(
            '  Resuming may produce invalid analysis (package.json, lockfile, or git HEAD changed).',
          ),
        );
        const resume = await confirm({
          message: 'Resume anyway?',
          default: false,
        });
        if (!resume) clearSession(resolved);
      } else {
        const resume = await confirm({
          message: `Resume previous session from ${chalk.cyan(existing.lastUpdatedAt)}?`,
          default: true,
        });
        if (!resume) clearSession(resolved);
      }
    }
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

  // Store fingerprint so future resumes can detect project changes
  try {
    const fp = computeFingerprint(resolved, `${stack.framework} ${stack.frameworkVersion}`);
    updateSession(resolved, { fingerprint: fp });
  } catch {
    /* non-fatal — fingerprint is best-effort */
  }

  if (!ni) {
    const shouldContinue = await confirm({ message: 'Continue with this project?', default: true });
    if (!shouldContinue) {
      console.log(chalk.dim('  Aborted.\n'));
      process.exit(0);
    }
  }

  // ── Phase 2: Intent ────────────────────────────────────────────────────────
  phaseHeader('Phase 2 — Intent');
  const objective = ni ? (niOpts.objective ?? 'minimal-risk') : await askObjective();

  if (ni) {
    console.log(`  ${chalk.dim('Objective')}  ${chalk.cyan(objective)}`);
  }

  const targetVersion =
    ni && niOpts.target ? niOpts.target : await askTargetVersion(stack, objective);

  if (ni) {
    console.log(
      `  ${chalk.dim('Target   ')}  ${chalk.cyan(`${stack.framework} ${targetVersion}`)}`,
    );
  }

  updateSession(resolved, { phase: 'decisions', decisions: { objective, targetVersion } });

  // ── Phase 3: Analysis ──────────────────────────────────────────────────────
  phaseHeader('Phase 3 — Analysis');
  const { outdated, peerConflicts } = await runAnalysis(stack);

  // Show peer conflicts if any
  if (peerConflicts.length > 0) {
    console.log('');
    console.log(
      chalk.bold(`  ${chalk.red('!')} Peer dependency conflicts (${peerConflicts.length}):`),
    );
    for (const c of peerConflicts) {
      console.log(
        `  ${chalk.red('●')} ${chalk.bold(c.package)} ${chalk.dim(c.installedVersion)} does not satisfy ${chalk.cyan(c.requiredRange)} required by ${chalk.bold(c.requiredBy)}`,
      );
      if (c.unresolvable) {
        console.log(
          `     ${chalk.red('Unresolvable')} — no published version satisfies both constraints`,
        );
      }
    }
  }

  const deprecated = outdated.filter((d) => d.deprecated);
  if (deprecated.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Deprecated packages found (${deprecated.length}):`));
    for (const d of deprecated) {
      console.log(
        `  ${chalk.red('●')} ${chalk.bold(d.name)} ${chalk.dim(d.current)} — ${d.reason ?? 'deprecated'} ${chalk.dim(`[confidence: ${d.confidence}]`)}`,
      );
    }
  }

  const outdatedOnly = outdated.filter((d) => !d.deprecated);
  if (outdatedOnly.length > 0) {
    console.log('');
    console.log(chalk.bold(`  Outdated packages (${outdatedOnly.length}):`));
    for (const d of outdatedOnly.slice(0, 8)) {
      const latest = d.latest === 'unknown' ? chalk.dim('unknown') : chalk.cyan(d.latest);
      console.log(
        `  ${chalk.yellow('●')} ${chalk.bold(d.name.padEnd(40))} ${chalk.dim(d.current)} → ${latest}`,
      );
    }
    if (outdatedOnly.length > 8)
      console.log(`  ${chalk.dim(`… and ${outdatedOnly.length - 8} more`)}`);
  }

  if (!ni) {
    console.log('');
    const phase3ok = await confirm({
      message: 'Analysis complete. Continue to decisions?',
      default: true,
    });
    if (!phase3ok) {
      console.log(chalk.dim('  Paused. Re-run to resume.\n'));
      process.exit(0);
    }
  }

  // ── Phase 4: Decisions ─────────────────────────────────────────────────────
  phaseHeader('Phase 4 — Decisions');

  const applicableEntries = getApplicableReplacements(
    stack.framework,
    deprecated.map((d) => d.name),
  );
  const deprecatedWithReplacements = deprecated.filter((d) => applicableEntries[d.name]);
  let packageReplacements: PackageReplacement[] = [];
  if (deprecatedWithReplacements.length > 0) {
    if (!ni) console.log('  For each deprecated package, choose a replacement or defer:\n');
    packageReplacements = await askPackageReplacements(
      stack,
      deprecatedWithReplacements.map((d) => d.name),
      ni,
      undefined,
      objective,
    );
  }

  console.log('');
  const backupStrategy = await askBackupStrategy(ni, autoYes);
  const outputFormats = await askOutputFormats(ni, niOpts.outputFormats);
  const outputDir = await askOutputDir(ni, niOpts.outputDir);

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
    autoApply: interactiveOpts.apply ?? false,
  };

  // ── Confirmation ───────────────────────────────────────────────────────────
  if (!ni) {
    console.log('');
    divider();
    console.log(`  ${chalk.bold('Objective')}  ${objective}`);
    console.log(`  ${chalk.bold('Target')}     ${stack.framework} ${targetVersion}`);
    console.log(`  ${chalk.bold('Backup')}     ${backupStrategy}`);
    console.log(`  ${chalk.bold('Output')}     ${outputFormats.join(', ')} → ${outputDir}`);
    const chosen = packageReplacements.filter((r) => r.chosen !== null);
    const skipped = packageReplacements.filter((r) => r.chosen === null);
    if (chosen.length > 0)
      console.log(
        `  ${chalk.bold('Replace')}    ${chosen.map((r) => `${r.package} → ${r.chosen}`).join(', ')}`,
      );
    if (skipped.length > 0)
      console.log(`  ${chalk.bold('Defer')}      ${skipped.map((r) => r.package).join(', ')}`);
    divider();
    console.log('');

    const goAhead = await confirm({ message: 'Generate plan and write artifacts?', default: true });
    if (!goAhead) {
      console.log(chalk.dim('  Cancelled. Session saved — re-run to resume.\n'));
      process.exit(0);
    }
  }

  // ── Baseline validation (before any migration changes) ────────────────────
  let baselineValidation: BuildValidationResult[] | undefined;
  if (effectiveValidate && !isDryRun) {
    const baseSpinner = ora('Running baseline build validation (before migration)…').start();
    try {
      baselineValidation = await validateBuild({
        projectPath: resolved,
        packageManager: stack.packageManager,
        ...(stack.lockfileParsed !== undefined ? { lockfileParsed: stack.lockfileParsed } : {}),
        steps: ['install', 'build', 'test', 'lint'],
      });
      const baseFailed = baselineValidation.filter((r) => r.status === 'failed');
      if (baseFailed.length > 0) {
        baseSpinner.warn(
          `Baseline: ${baseFailed.length} pre-existing failure(s) — will be noted in report`,
        );
      } else {
        baseSpinner.succeed('Baseline build validation passed');
      }
    } catch (err) {
      baseSpinner.fail(`Baseline validation error: ${String(err)}`);
    }
  }

  // ── Backup ─────────────────────────────────────────────────────────────────
  let rollbackManager: RollbackManager | null = null;
  if (backupStrategy !== 'none' && !isDryRun) {
    if (!ni && isGitDirty(resolved)) {
      console.log('');
      console.log(chalk.yellow('  ⚠ Working tree has uncommitted changes.'));
      console.log(
        chalk.dim(
          '  Creating a backup on a dirty tree will mix upgrade changes with your current work,',
        ),
      );
      console.log(chalk.dim('  making code review and rollback harder.'));
      const proceed = await confirm({
        message: 'Stash or commit your changes first is recommended. Proceed anyway?',
        default: false,
      });
      if (!proceed) {
        console.log(chalk.dim('  Aborted. Stash or commit your changes then re-run.\n'));
        process.exit(0);
      }
    }
    rollbackManager = createBackupManager(resolved, backupStrategy);
  }

  // ── Planning + analysis (wrapped for auto-rollback on failure) ───────────────
  try {
    // Initial plan without size hint — re-plan after scanning to calibrate effort
    const planSpinner = ora('Building upgrade plan…').start();
    const initialPlan = planUpgrade(stack, targetVersion);
    planSpinner.succeed(
      `Plan: ${initialPlan.steps.length} hop(s) — scanning source for size calibration…`,
    );

    const codeSpinner = ora('Scanning source files for breaking-change patterns…').start();
    const codeSuggestions = analyzeBreakingChanges(resolved, initialPlan);
    codeSpinner.succeed(`Found ${codeSuggestions.length} code location(s) to review`);

    const affectedFiles = new Set(codeSuggestions.map((s) => s.file)).size;
    const chosenReplacements = packageReplacements.filter((r) => r.chosen !== null).length;
    const configAnalysis = analyzeConfigMigrations(resolved, planUpgrade(stack, targetVersion));
    const neededConfigMigrations = configAnalysis.filter((r) => r.needed).length;
    const testRunnerMigration = packageReplacements.some(
      (r) => r.chosen !== null && (r.package === 'karma' || r.package === 'jest'),
    );

    const plan = planUpgrade(stack, targetVersion, {
      affectedFiles,
      totalOccurrences: codeSuggestions.length,
      deprecatedPackageCount: chosenReplacements,
      configMigrationCount: neededConfigMigrations,
      testRunnerMigration,
    });

    const planSpinner2 = ora(
      `Effort calibrated: ${plan.estimatedEffort} (${affectedFiles} file(s), ${codeSuggestions.length} location(s))`,
    ).start();
    planSpinner2.succeed(
      `Plan ready: ${plan.steps.length} step(s), ${plan.riskLevel} risk, effort ${plan.estimatedEffort}`,
    );

    const ruleCounts = plan.migrationRuleCounts;
    if (ruleCounts) {
      console.log(
        `  ${chalk.dim('Migration rules:')} ${ruleCounts.automatable} automatable, ${ruleCounts.assisted} assisted, ${ruleCounts.advisory} advisory`,
      );
    }
    const assistedMatches = codeSuggestions.filter((s) => s.change.automationLevel === 'assisted');
    if (!ni && assistedMatches.length > 0) {
      console.log(
        chalk.yellow(`  ${assistedMatches.length} assisted migration location(s) need review.`),
      );
      for (const suggestion of assistedMatches.slice(0, 5)) {
        console.log(
          `  ${chalk.dim('-')} ${chalk.bold(suggestion.change.api)} ${chalk.dim(`${suggestion.file}:${suggestion.line ?? '?'}`)}`,
        );
      }
      if (assistedMatches.length > 5) {
        console.log(chalk.dim(`  ... and ${assistedMatches.length - 5} more in the report.`));
      }
    }

    // ── Dry-run preview ────────────────────────────────────────────────────────
    if (isDryRun) {
      printDryRunPreview(resolved, plan, codeSuggestions);
    }

    const byFile = new Map<string, typeof codeSuggestions>();
    for (const s of codeSuggestions) {
      const list = byFile.get(s.file) ?? [];
      list.push(s);
      byFile.set(s.file, list);
    }
    let refactorResults = Array.from(byFile.entries()).map(([file, suggestions]) => ({
      file,
      suggestions,
    }));

    // Apply automated fixes if requested
    if (applyFixes && !isDryRun) {
      const applied = applyRefactors(codeSuggestions);
      if (applied.length > 0) {
        refactorResults = applied;
        console.log(chalk.green(`  ✔ Applied automated fixes to ${applied.length} file(s)`));
      }
    }

    // ── Execute upgrade commands (autonomous mode) ─────────────────────────────
    let cmdExecResult: ExecuteCommandsResult | undefined;
    if (isAutonomous && !isDryRun) {
      const upgradeCommands = buildUpgradeCommands(plan, stack.packageManager);
      if (upgradeCommands.length > 0) {
        const execSpinner = ora(`Executing ${upgradeCommands.length} upgrade command(s)…`).start();
        cmdExecResult = await executeCommands({
          projectPath: resolved,
          commands: upgradeCommands,
          skipBackup: true, // RollbackManager handles the branch-level backup
          onOutput: (_cmd, _stream, chunk) => process.stdout.write(chunk),
        });

        if (cmdExecResult.status === 'success') {
          execSpinner.succeed(`Upgrade commands completed (${upgradeCommands.length} command(s))`);
        } else {
          const lastExec = cmdExecResult.executions.at(-1);
          const errPreview = (lastExec?.result.stderr || lastExec?.result.stdout || '').slice(
            0,
            200,
          );
          execSpinner.fail(`Upgrade command failed: ${errPreview.split('\n')[0]}`);
          throw new Error(`Upgrade commands failed: ${errPreview}`);
        }
      }
    }

    const commandExecutions: CommandExecutionRecord[] | undefined = cmdExecResult?.executions.map(
      (e) => ({
        cmd: e.cmd,
        exitCode: e.result.exitCode,
        durationMs: e.result.durationMs,
        stdoutSummary: e.result.stdout.slice(0, 500),
        stderrSummary: e.result.stderr.slice(0, 500),
        timedOut: e.result.timedOut,
      }),
    );

    const manualActions = [...new Set(plan.steps.flatMap((s) => s.manualActions))];

    const report: UpgradeReport = {
      stack,
      plan,
      outdatedDependencies: outdated,
      peerConflicts,
      refactorResults,
      manualActions,
      buildStatus: 'skipped',
      ...(baselineValidation ? { baselineValidation } : {}),
      ...(commandExecutions ? { commandExecutions } : {}),
      ...(cmdExecResult ? { commandExecutionStatus: cmdExecResult.status } : {}),
      decisions,
      generatedAt: new Date().toISOString(),
    };

    // ── Build validation (post-migration) ─────────────────────────────────────
    if (effectiveValidate && !isDryRun) {
      const valSpinner = ora('Running post-migration build validation…').start();
      try {
        report.buildValidation = await validateBuild({
          projectPath: resolved,
          packageManager: stack.packageManager,
          ...(stack.lockfileParsed !== undefined ? { lockfileParsed: stack.lockfileParsed } : {}),
          steps: ['install', 'build', 'test', 'lint'],
        });
        const failed = report.buildValidation.filter((r) => r.status === 'failed');
        if (failed.length > 0) {
          valSpinner.warn(`Build validation: ${failed.length} step(s) failed`);
          report.buildStatus = 'failed';
        } else {
          valSpinner.succeed('Build validation passed');
          report.buildStatus = 'success';
        }
      } catch (err) {
        valSpinner.fail(`Build validation error: ${String(err)}`);
      }
    }

    // ── Write artifacts ────────────────────────────────────────────────────────
    const resolvedOutputDir = path.resolve(resolved, outputDir);
    let artifacts: Array<{ format: string; filePath: string }> = [];
    if (!isDryRun) {
      const writeSpinner = ora(`Writing artifacts to ${outputDir}…`).start();
      try {
        const reportArtifacts = writeArtifacts(report, resolvedOutputDir, outputFormats);
        const machineArtifacts = writeMachineArtifacts(report, resolvedOutputDir);
        artifacts = [...reportArtifacts, ...machineArtifacts];
        writeSpinner.succeed(`Wrote ${artifacts.length} artifact(s)`);
      } catch (err) {
        writeSpinner.fail(`Could not write artifacts: ${String(err)}`);
      }
    } else {
      console.log(chalk.dim('  [safe mode] Artifact writing skipped — analysis only.\n'));
    }

    // ── Auto-fix notice ────────────────────────────────────────────────────────
    if (!applyFixes) {
      const autoFixable = codeSuggestions.filter(
        (s) => s.change.automated && s.change.automationLevel === 'automatable',
      );
      if (autoFixable.length > 0) {
        console.log('');
        console.log(
          chalk.bold(`  ${chalk.green(String(autoFixable.length))} location(s) can be auto-fixed.`),
        );
        console.log(
          chalk.dim(`  Re-run with ${chalk.white('stack-lift apply <path>')} to apply them.`),
        );
      }
    }

    // ── Checklist ──────────────────────────────────────────────────────────────
    printChecklist(report, packageReplacements, artifacts);

    // ── Done ───────────────────────────────────────────────────────────────────
    rollbackManager?.commit();
    updateSession(resolved, { phase: 'done', decisions });
    console.log(chalk.bold.green('  ✔ Migration plan complete.\n'));

    return { report, decisions, artifacts };
  } catch (err) {
    if (rollbackManager) {
      const rollbackResult = await rollbackManager.rollback(isDryRun);
      console.log('');
      if (rollbackResult.success) {
        console.log(chalk.yellow(`  ↩ Auto-rollback: ${rollbackResult.message}`));
      } else {
        console.log(chalk.red(`  ✗ Auto-rollback failed: ${rollbackResult.message}`));
        if (rollbackResult.recoveryInstructions) {
          console.log(
            chalk.dim(`  Recovery: run manually: ${rollbackResult.recoveryInstructions}`),
          );
        }
      }
    }
    throw err;
  }
}
