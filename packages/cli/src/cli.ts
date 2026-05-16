import { Command } from 'commander';
import chalk, { type ChalkInstance } from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import {
  runUpgrade,
  detectStack,
  analyzeDependencies,
  planUpgrade,
  writeArtifacts,
  writeMachineArtifacts,
  readSession,
  clearSession,
  validateBuild,
} from '@stack-lift/core';
import { registerAngularProvider } from '@stack-lift/angular-provider';
import { runInteractive } from './prompts/interaction.js';
import { installSkill, removeSkill, listSkills, searchSkills } from './skills/manager.js';
import type {
  UpgradeReport,
  RiskLevel,
  ArtifactFormat,
  MigrationObjective,
} from '@stack-lift/shared';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

registerAngularProvider();

const RISK_COLOR: Record<RiskLevel, ChalkInstance> = {
  low: chalk.green,
  medium: chalk.yellow,
  high: chalk.red,
  critical: chalk.bgRed.white,
};

// ── Terminal report helpers ──────────────────────────────────────────────────

function printStackSummary(report: UpgradeReport) {
  const { stack } = report;
  console.log('');
  console.log(chalk.bold('  Detected Stack'));
  console.log(
    `  ${chalk.dim('Framework     ')} ${chalk.cyan(`${stack.framework} ${stack.frameworkVersion}`)}`,
  );
  if (stack.typescript) console.log(`  ${chalk.dim('TypeScript    ')} ${stack.typescript}`);
  if (stack.rxjs) console.log(`  ${chalk.dim('RxJS          ')} ${stack.rxjs}`);
  console.log(`  ${chalk.dim('Build tool    ')} ${stack.buildTool}`);
  console.log(`  ${chalk.dim('Pkg manager   ')} ${stack.packageManager}`);
  if (stack.nodeVersion) console.log(`  ${chalk.dim('Node version  ')} ${stack.nodeVersion}`);
  if (stack.isMonorepo)
    console.log(
      `  ${chalk.yellow('⚠ Monorepo detected')} — analyze each workspace package separately`,
    );
  console.log('');
}

function printPlanSummary(report: UpgradeReport) {
  const { plan } = report;
  const riskFn = RISK_COLOR[plan.riskLevel];
  console.log(chalk.bold('  Upgrade Plan'));
  console.log(
    `  ${chalk.dim('Route         ')} ${plan.framework} ${plan.fromVersion} → ${plan.toVersion}`,
  );
  console.log(
    `  ${chalk.dim('Strategy      ')} ${plan.strategy} (${plan.steps.length} step${plan.steps.length !== 1 ? 's' : ''})`,
  );
  console.log(`  ${chalk.dim('Risk          ')} ${riskFn(plan.riskLevel.toUpperCase())}`);
  console.log(`  ${chalk.dim('Effort        ')} ${plan.estimatedEffort}`);
  console.log(
    `  ${chalk.dim('Breaking chgs ')} ${plan.totalBreakingChanges} (${plan.totalAutomatedFixes} auto-fixable)`,
  );
  console.log('');

  for (const [i, step] of plan.steps.entries()) {
    console.log(
      `  ${chalk.bold(`Step ${i + 1}:`)} v${step.fromVersion} → v${step.toVersion} — ${chalk.dim(step.description)}`,
    );
    for (const bc of step.breakingChanges) {
      const icon = bc.automated ? chalk.green('✔') : chalk.yellow('⚠');
      const conf = bc.confidence ? chalk.dim(` [${bc.confidence} confidence]`) : '';
      console.log(`    ${icon} ${chalk.bold(bc.api)}: ${bc.description}${conf}`);
    }
    if (step.breakingChanges.length === 0) {
      console.log(`    ${chalk.green('✔')} No breaking changes`);
    }
    console.log('');
  }
}

function printDependencySummary(report: UpgradeReport) {
  const { outdatedDependencies: deps } = report;
  if (deps.length === 0) {
    console.log(`  ${chalk.green('✔')} All tracked dependencies are up to date.\n`);
    return;
  }

  console.log(chalk.bold(`  Outdated Dependencies (${deps.length})`));
  for (const d of deps) {
    const riskFn = RISK_COLOR[d.risk];
    const tag = d.deprecated ? chalk.red('[DEPRECATED]') : chalk.dim('[outdated]');
    const latest = d.latest === 'unknown' ? chalk.dim('unknown') : chalk.cyan(d.latest);
    const conf = chalk.dim(`[${d.confidence} confidence]`);
    console.log(
      `  ${riskFn('●')} ${chalk.bold(d.name.padEnd(45))} ${chalk.dim(d.current)} → ${latest} ${tag} ${conf}`,
    );
    if (d.reason) console.log(`      ${chalk.dim(d.reason)}`);
  }
  console.log('');
}

function printCodeSuggestions(report: UpgradeReport) {
  const allSuggestions = report.refactorResults.flatMap((r) => r.suggestions);
  if (allSuggestions.length === 0) {
    console.log(`  ${chalk.green('✔')} No code issues detected.\n`);
    return;
  }

  console.log(chalk.bold(`  Code Issues Found (${allSuggestions.length})`));
  for (const r of report.refactorResults) {
    console.log(`  ${chalk.underline(r.file)}`);
    for (const s of r.suggestions) {
      const icon = s.change.automated ? chalk.green('✔ auto') : chalk.yellow('⚠ manual');
      const loc = s.line ? chalk.dim(`:${s.line}`) : '';
      const conf = s.change.confidence ? chalk.dim(` [${s.change.confidence}]`) : '';
      console.log(`    ${icon}  Line${loc} — ${chalk.bold(s.change.api)}${conf}`);
      if (s.matchedText) console.log(`         ${chalk.dim(s.matchedText)}`);
    }
    if (r.applied && r.applied.length > 0) {
      console.log(`    ${chalk.green(`Applied ${r.applied.length} automated fix(es)`)}`);
    }
  }
  console.log('');
}

function printManualActions(report: UpgradeReport) {
  if (report.manualActions.length === 0) return;
  console.log(chalk.bold('  Manual Actions Required'));
  for (const action of report.manualActions) {
    console.log(`  ${chalk.yellow('□')} ${action}`);
  }
  console.log('');
}

function printTerminalReport(report: UpgradeReport) {
  console.log('');
  console.log(chalk.bold.blue('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('  ║           stack-lift upgrade report       ║'));
  console.log(chalk.bold.blue('  ╚══════════════════════════════════════════╝'));

  printStackSummary(report);
  printPlanSummary(report);
  printDependencySummary(report);
  printCodeSuggestions(report);
  printManualActions(report);
}

// ── Audit helpers ────────────────────────────────────────────────────────────

async function runAudit(
  projectPath: string,
  options: { json?: boolean; markdown?: boolean; stable?: boolean; outDir?: string },
) {
  const spinner = ora('Auditing project (read-only)…').start();
  try {
    const resolved = path.resolve(projectPath);
    const stack = detectStack(resolved);
    spinner.text = 'Querying npm registry…';
    const { outdated, peerConflicts } = await analyzeDependencies(stack);
    spinner.succeed(
      `Audit complete: ${outdated.length} findings, ${peerConflicts.length} peer conflicts`,
    );

    console.log('');
    console.log(chalk.bold.blue('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.bold.blue('  ║              stack-lift audit              ║'));
    console.log(chalk.bold.blue('  ╚══════════════════════════════════════════╝'));
    console.log('');
    console.log(
      chalk.bold(`  ${stack.framework} ${stack.frameworkVersion}`) +
        chalk.dim(
          ` — ${stack.packageManager} — lockfile: ${stack.lockfileParsed ? 'parsed' : 'not found'}`,
        ),
    );
    console.log('');

    const deprecated = outdated.filter((d) => d.deprecated);
    const outdatedOnly = outdated.filter((d) => !d.deprecated);

    if (deprecated.length > 0) {
      console.log(chalk.bold.red(`  ⚠ Deprecated / Abandoned (${deprecated.length})`));
      for (const d of deprecated) {
        const conf = chalk.dim(`confidence: ${d.confidence}`);
        const src = chalk.dim(`source: ${d.observedIn ?? 'package.json'}, evidence: npm registry`);
        console.log(`  ${chalk.red('●')} ${chalk.bold(d.name)} ${chalk.dim(d.current)}`);
        console.log(`    ${d.reason ?? 'deprecated'}`);
        console.log(`    ${conf} | ${src}`);
        console.log('');
      }
    }

    if (peerConflicts.length > 0) {
      console.log(chalk.bold.yellow(`  ⚡ Peer Dependency Conflicts (${peerConflicts.length})`));
      for (const c of peerConflicts) {
        const status = c.unresolvable ? chalk.red('UNRESOLVABLE') : chalk.yellow('CONFLICT');
        console.log(
          `  ${chalk.yellow('●')} ${chalk.bold(c.package)} ${chalk.dim(c.installedVersion)}`,
        );
        console.log(
          `    Required: ${chalk.cyan(c.requiredRange)} by ${chalk.bold(c.requiredBy)} [${status}]`,
        );
        console.log(
          `    ${chalk.dim('confidence: high | source: lockfile, evidence: semver constraint check')}`,
        );
        console.log('');
      }
    }

    if (outdatedOnly.length > 0) {
      console.log(chalk.bold(`  ↑ Outdated Packages (${outdatedOnly.length})`));
      for (const d of outdatedOnly.slice(0, 15)) {
        const riskFn = RISK_COLOR[d.risk];
        const latest = d.latest === 'unknown' ? chalk.dim('unknown') : chalk.cyan(d.latest);
        console.log(
          `  ${riskFn('●')} ${chalk.bold(d.name.padEnd(42))} ${chalk.dim(d.current)} → ${latest} ${chalk.dim(`[${d.risk}]`)}`,
        );
      }
      if (outdatedOnly.length > 15)
        console.log(`  ${chalk.dim(`… and ${outdatedOnly.length - 15} more`)}`);
      console.log('');
    }

    if (deprecated.length === 0 && peerConflicts.length === 0 && outdatedOnly.length === 0) {
      console.log(chalk.green('  ✔ No issues found. Project looks clean.\n'));
    }

    console.log(
      chalk.dim(
        `  Run ${chalk.white('stack-lift migrate <path>')} for interactive guided migration.`,
      ),
    );
    console.log('');

    if (options.json || options.markdown) {
      const plan = planUpgrade(stack, undefined);
      const report: UpgradeReport = {
        stack,
        plan,
        outdatedDependencies: outdated,
        peerConflicts,
        refactorResults: [],
        manualActions: [],
        buildStatus: 'skipped',
        generatedAt: new Date().toISOString(),
      };
      const formats: ArtifactFormat[] = [];
      if (options.json) formats.push('json');
      if (options.markdown) formats.push('markdown');
      const outDir = path.resolve(resolved, options.outDir ?? './stacklift-output');
      const artifacts = writeArtifacts(report, outDir, formats);
      const machineArtifacts = writeMachineArtifacts(report, outDir, { omitTimestamp: options.stable });
      for (const a of [...artifacts, ...machineArtifacts]) {
        console.log(chalk.green(`  ✔ ${a.format.toUpperCase()} → ${a.filePath}`));
      }
      console.log('');
    }
  } catch (err) {
    spinner.fail(String(err));
    process.exitCode = 1;
  }
}

// ── Commands ─────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('stack-lift')
  .description('AI-powered upgrade assistant for Angular, React, and legacy frontend codebases')
  .version(pkg.version);

// ── audit ────────────────────────────────────────────────────────────────────

program
  .command('audit <path>')
  .description(
    'Read-only findings: deprecated packages, peer conflicts, outdated deps — with evidence and confidence scores',
  )
  .option('--json', 'Write findings.json to output dir')
  .option('--markdown', 'Write markdown report to output dir')
  .option('--stable', 'Suppress timestamps in machine artifacts for reproducible CI output')
  .option('--out-dir <dir>', 'Directory for artifact files', './stacklift-output')
  .action(
    async (
      projectPath: string,
      options: { json?: boolean; markdown?: boolean; stable?: boolean; outDir?: string },
    ) => {
      await runAudit(projectPath, options);
    },
  );

// ── analyze (kept for backwards-compat) ─────────────────────────────────────

program
  .command('analyze <path>')
  .description('Alias for audit — analyze a project and show what needs upgrading')
  .action(async (projectPath: string) => {
    console.warn(
      chalk.yellow('  ⚠  stack-lift analyze is deprecated. Use stack-lift audit instead.'),
    );
    const spinner = ora('Analyzing project…').start();
    try {
      const stack = detectStack(path.resolve(projectPath));
      spinner.succeed(`Detected: ${chalk.cyan(`${stack.framework} ${stack.frameworkVersion}`)}`);

      if (stack.isMonorepo) {
        console.log(
          `  ${chalk.yellow('⚠ Monorepo detected')} — for best results, run analyze on each workspace package separately`,
        );
      }

      const { outdated: deps, peerConflicts } = await analyzeDependencies(stack);
      const outdatedCount = deps.length;
      console.log(
        `  ${chalk.dim('Outdated packages:')} ${outdatedCount > 0 ? chalk.yellow(outdatedCount) : chalk.green(outdatedCount)}`,
      );
      if (peerConflicts.length > 0) {
        console.log(`  ${chalk.dim('Peer conflicts:  ')} ${chalk.red(peerConflicts.length)}`);
      }
      console.log('');
      for (const d of deps.slice(0, 10)) {
        const riskFn = RISK_COLOR[d.risk];
        const tag = d.deprecated ? chalk.red('[DEPRECATED]') : '';
        const latest = d.latest === 'unknown' ? chalk.dim('unknown') : chalk.cyan(d.latest);
        console.log(
          `  ${riskFn('●')} ${chalk.bold(d.name.padEnd(40))} ${chalk.dim(d.current)} → ${latest} ${tag}`,
        );
      }
      if (deps.length > 10) {
        console.log(`  ${chalk.dim(`… and ${deps.length - 10} more`)}`);
      }
      console.log('');
      console.log(
        chalk.dim(
          `  Run ${chalk.white('stack-lift migrate <path>')} for an interactive guided upgrade.`,
        ),
      );
      console.log('');
    } catch (err) {
      spinner.fail(String(err));
      process.exitCode = 1;
    }
  });

// ── upgrade (kept for backwards-compat) ─────────────────────────────────────

program
  .command('upgrade <path>')
  .description('Generate a full upgrade plan with breaking changes and code suggestions')
  .option('-t, --to <version>', 'Target major version (e.g. 18 for Angular 18)')
  .option(
    '-o, --output <formats>',
    'Comma-separated output formats: terminal,markdown,json  (default: terminal)',
    'terminal',
  )
  .option('--out-dir <dir>', 'Directory for artifact files', './stacklift-output')
  .option('--apply', 'Apply automated AST-based code fixes in-place', false)
  .option('--dry-run', 'Show what --apply would change without writing files', false)
  .action(
    async (
      projectPath: string,
      options: { to?: string; output: string; outDir: string; apply: boolean; dryRun: boolean },
    ) => {
      console.warn(
        chalk.yellow('  ⚠  stack-lift upgrade is deprecated. Use stack-lift migrate instead.'),
      );
      const spinner = ora('Running upgrade analysis…').start();
      try {
        const resolved = path.resolve(projectPath);
        const requestedFormats = options.output.split(',').map((f) => f.trim()) as Array<
          'terminal' | 'markdown' | 'json'
        >;
        const fileFormats = requestedFormats.filter(
          (f) => f === 'markdown' || f === 'json',
        ) as ArtifactFormat[];
        const toTerminal = requestedFormats.includes('terminal');

        const primaryFileFormat = fileFormats[0];
        const orchFormat = primaryFileFormat ?? 'terminal';

        const result = await runUpgrade({
          projectPath: resolved,
          ...(options.to !== undefined ? { targetVersion: options.to } : {}),
          apply: options.apply,
          outputFormat: orchFormat === 'terminal' ? 'terminal' : orchFormat,
        });

        spinner.succeed('Analysis complete');

        if (toTerminal) {
          printTerminalReport(result.report);
        }

        if (fileFormats.length > 0) {
          const outDir = path.resolve(resolved, options.outDir);
          const artifacts = writeArtifacts(result.report, outDir, fileFormats);
          const machineArtifacts = writeMachineArtifacts(result.report, outDir);
          for (const a of [...artifacts, ...machineArtifacts]) {
            console.log(
              chalk.green(`  ✔ ${a.format.toUpperCase()} report written to: ${a.filePath}`),
            );
          }
          console.log('');
        }

        if (options.apply) {
          const applied = result.report.refactorResults.filter(
            (r) => r.applied && r.applied.length > 0,
          );
          if (applied.length > 0) {
            console.log(chalk.green(`  ✔ Applied automated fixes to ${applied.length} file(s)`));
          } else {
            console.log(chalk.dim('  No automated fixes were applied.'));
          }
          console.log('');
        }
      } catch (err) {
        spinner.fail(String(err));
        process.exitCode = 1;
      }
    },
  );

// ── plan ─────────────────────────────────────────────────────────────────────

program
  .command('plan <path>')
  .description('Generate a deterministic upgrade plan — works in CI with --non-interactive')
  .option('-t, --to <version>', 'Target major version')
  .option(
    '--objective <objective>',
    'Migration objective (minimal-risk|security|modernization|performance|full-migration)',
    'minimal-risk',
  )
  .option('--non-interactive', 'Skip prompts and generate plan with provided options', false)
  .option('--markdown', 'Write markdown report to output dir', false)
  .option('--json', 'Write JSON artifacts to output dir', false)
  .option('--stable', 'Suppress timestamps in machine artifacts for reproducible CI output', false)
  .option('--out-dir <dir>', 'Directory for artifact files', './stacklift-output')
  .action(
    async (
      projectPath: string,
      options: {
        to?: string;
        objective: string;
        nonInteractive: boolean;
        markdown: boolean;
        json: boolean;
        stable: boolean;
        outDir: string;
      },
    ) => {
      try {
        const stack = detectStack(path.resolve(projectPath));
        const plan = planUpgrade(stack, options.to);
        const riskFn = RISK_COLOR[plan.riskLevel];

        console.log('');
        console.log(
          chalk.bold(`  ${plan.framework} upgrade plan: v${plan.fromVersion} → v${plan.toVersion}`),
        );
        console.log(
          `  Strategy: ${plan.strategy}  |  Risk: ${riskFn(plan.riskLevel)}  |  Effort: ${plan.estimatedEffort}`,
        );
        console.log(`  ${chalk.dim('Effort basis:')} ${chalk.dim(plan.effortBasis)}`);
        console.log('');

        for (const [i, step] of plan.steps.entries()) {
          console.log(
            `  ${chalk.cyan(`${i + 1}.`)} v${step.fromVersion} → v${step.toVersion}  ${chalk.dim(step.description)}`,
          );
          console.log(
            `     ${step.breakingChanges.length} breaking changes, ${step.automatedFixes} auto-fixable`,
          );
          if (step.referenceUrl) {
            console.log(`     ${chalk.dim(step.referenceUrl)}`);
          }
        }
        console.log('');

        if (options.json || options.markdown) {
          const { outdated, peerConflicts } = await analyzeDependencies(stack);
          const report: UpgradeReport = {
            stack,
            plan,
            outdatedDependencies: outdated,
            peerConflicts,
            refactorResults: [],
            manualActions: [...new Set(plan.steps.flatMap((s) => s.manualActions))],
            buildStatus: 'skipped',
            generatedAt: new Date().toISOString(),
          };
          const formats: ArtifactFormat[] = [];
          if (options.markdown) formats.push('markdown');
          if (options.json) formats.push('json');
          const outDir = path.resolve(path.resolve(projectPath), options.outDir);
          const artifacts = writeArtifacts(report, outDir, formats);
          const machineArtifacts = writeMachineArtifacts(report, outDir, { omitTimestamp: options.stable });
          for (const a of [...artifacts, ...machineArtifacts]) {
            console.log(chalk.green(`  ✔ ${a.format.toUpperCase()} → ${a.filePath}`));
          }
          console.log('');
        }
      } catch (err) {
        console.error(chalk.red(String(err)));
        process.exitCode = 1;
      }
    },
  );

// ── migrate ──────────────────────────────────────────────────────────────────

program
  .command('migrate <path>')
  .description('Interactive guided migration — asks your intent, shows choices, writes artifacts')
  .option(
    '-n, --non-interactive',
    'Skip all prompts and use provided flags (suitable for CI)',
    false,
  )
  .option('-t, --target <version>', 'Target major version for non-interactive mode')
  .option(
    '-o, --objective <objective>',
    'Migration objective (minimal-risk|security|modernization|performance|full-migration)',
  )
  .option('-y, --yes', 'Auto-approve all prompts', false)
  .option('--dry-run', 'Show what would be done without writing files or creating backups', false)
  .option('--apply', 'Apply automated AST code fixes', false)
  .option('--validate', 'Run npm install + build + test + lint after planning', false)
  .option('--json', 'Include JSON in output artifacts', false)
  .option('--markdown', 'Include Markdown in output artifacts (default: on)', false)
  .option('--out-dir <dir>', 'Output directory for artifacts', './stacklift-output')
  .action(
    async (
      projectPath: string,
      options: {
        nonInteractive: boolean;
        target?: string;
        objective?: string;
        yes: boolean;
        dryRun: boolean;
        apply: boolean;
        validate: boolean;
        json: boolean;
        markdown: boolean;
        outDir: string;
      },
    ) => {
      try {
        const formats: ArtifactFormat[] = [];
        if (options.markdown || (!options.json && !options.markdown)) formats.push('markdown');
        if (options.json) formats.push('json');

        await runInteractive(projectPath, {
          nonInteractive: options.nonInteractive || options.yes,
          apply: options.apply,
          validate: options.validate,
          options: {
            ...(options.target !== undefined ? { target: options.target } : {}),
            ...(options.objective !== undefined
              ? { objective: options.objective as MigrationObjective }
              : {}),
            yes: options.yes,
            dryRun: options.dryRun,
            outputFormats: formats,
            outputDir: options.outDir,
            validate: options.validate,
          },
        });
      } catch (err) {
        const msg = String(err);
        if (msg.includes('User force closed')) {
          console.log(chalk.dim('\n  Aborted.\n'));
        } else {
          console.error(chalk.red(msg));
          process.exitCode = 1;
        }
      }
    },
  );

// ── apply ─────────────────────────────────────────────────────────────────────

program
  .command('apply <path>')
  .description('Execute the approved plan: apply automated fixes and run build validation')
  .option('-t, --to <version>', 'Target major version')
  .option('--validate', 'Run build validation after applying fixes', true)
  .option('--out-dir <dir>', 'Output directory for artifacts', './stacklift-output')
  .action(
    async (projectPath: string, options: { to?: string; validate: boolean; outDir: string }) => {
      const spinner = ora('Running upgrade analysis with auto-fix…').start();
      try {
        const resolved = path.resolve(projectPath);
        const result = await runUpgrade({
          projectPath: resolved,
          ...(options.to !== undefined ? { targetVersion: options.to } : {}),
          apply: true,
          outputFormat: 'terminal',
        });
        spinner.succeed('Analysis and automated fixes complete');

        printTerminalReport(result.report);

        if (options.validate) {
          const stack = result.report.stack;
          const valSpinner = ora('Running build validation…').start();
          const buildResults = validateBuild({
            projectPath: resolved,
            packageManager: stack.packageManager,
            steps: ['install', 'build', 'test', 'lint'],
          });
          result.report.buildValidation = buildResults;

          const failed = buildResults.filter((r) => r.status === 'failed');
          if (failed.length > 0) {
            valSpinner.warn(`Build validation: ${failed.length} step(s) failed`);
            for (const r of failed) {
              console.log(chalk.red(`  ✗ ${r.step}: ${(r.error ?? '').split('\n')[0]}`));
            }
          } else {
            valSpinner.succeed('Build validation passed');
          }
          console.log('');
        }

        const outDir = path.resolve(resolved, options.outDir);
        const artifacts = writeArtifacts(result.report, outDir, ['markdown', 'json']);
        const machineArtifacts = writeMachineArtifacts(result.report, outDir);
        for (const a of [...artifacts, ...machineArtifacts]) {
          console.log(chalk.green(`  ✔ ${a.format.toUpperCase()} → ${a.filePath}`));
        }
        console.log('');
      } catch (err) {
        spinner.fail(String(err));
        process.exitCode = 1;
      }
    },
  );

// ── resume ───────────────────────────────────────────────────────────────────

program
  .command('resume [path]')
  .description('Resume an interrupted migrate session from .stacklift/session.json')
  .action(async (projectPath?: string) => {
    const resolved = path.resolve(projectPath ?? '.');
    const session = readSession(resolved);
    if (!session) {
      console.log(chalk.yellow(`  No saved session found at ${resolved}/.stacklift/session.json`));
      console.log(
        chalk.dim(`  Run ${chalk.white('stack-lift migrate <path>')} to start a new session.`),
      );
      console.log('');
      return;
    }

    console.log('');
    console.log(chalk.bold.blue('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.bold.blue('  ║           stack-lift resume               ║'));
    console.log(chalk.bold.blue('  ╚══════════════════════════════════════════╝'));
    console.log('');
    console.log(chalk.bold('  Saved session found:'));
    console.log(`  ${chalk.dim('Phase')}         ${session.phase}`);
    console.log(`  ${chalk.dim('Last updated')} ${session.lastUpdatedAt}`);
    console.log(`  ${chalk.dim('Created')}      ${session.createdAt}`);
    if (session.decisions.objective)
      console.log(`  ${chalk.dim('Objective')}    ${session.decisions.objective}`);
    if (session.decisions.targetVersion)
      console.log(`  ${chalk.dim('Target')}       ${session.decisions.targetVersion}`);
    console.log('');

    if (session.phase === 'done') {
      console.log(chalk.green('  ✔ This session is already complete.'));
      console.log(chalk.dim('  Check your output directory for the generated artifacts.'));
      console.log('');

      const { confirm } = await import('@inquirer/prompts');
      const restart = await confirm({ message: 'Start a fresh session?', default: false });
      if (restart) {
        clearSession(resolved);
        await runInteractive(resolved);
      }
      return;
    }

    console.log(chalk.dim(`  Resuming from phase: ${session.phase}…`));
    console.log('');

    const d = session.decisions;
    await runInteractive(resolved, {
      nonInteractive: false,
      options: {
        ...(d.targetVersion !== undefined ? { target: d.targetVersion } : {}),
        ...(d.objective !== undefined ? { objective: d.objective } : {}),
        ...(d.outputFormats !== undefined ? { outputFormats: d.outputFormats } : {}),
        ...(d.outputDir !== undefined ? { outputDir: d.outputDir } : {}),
      },
    });
  });

// ── clear-session ─────────────────────────────────────────────────────────────

program
  .command('clear-session [path]')
  .description('Remove saved session state from .stacklift/session.json')
  .action((projectPath?: string) => {
    const resolved = path.resolve(projectPath ?? '.');
    clearSession(resolved);
    console.log(chalk.green(`  ✔ Session cleared at ${resolved}\n`));
  });

// ── skills sub-commands ──────────────────────────────────────────────────────

const skillsCmd = program.command('skills').description('Manage Claude Code skills');

skillsCmd
  .command('add <skill>')
  .description('Install a skill into ~/.claude/skills/')
  .option('--dir <path>', 'Override the skills installation directory')
  .action((skill: string, options: { dir?: string }) => {
    installSkill(skill, options.dir);
  });

skillsCmd
  .command('remove <skill>')
  .aliases(['rm', 'uninstall'])
  .description('Remove an installed skill')
  .option('--dir <path>', 'Override the skills directory')
  .action((skill: string, options: { dir?: string }) => {
    removeSkill(skill, options.dir);
  });

skillsCmd
  .command('list')
  .alias('ls')
  .description('List installed skills')
  .option('--dir <path>', 'Override the skills directory')
  .action((options: { dir?: string }) => {
    listSkills(options.dir);
  });

skillsCmd
  .command('search [query]')
  .description('Browse available skills')
  .action((query?: string) => {
    searchSkills(query);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red(String(err)));
  process.exitCode = 1;
});
