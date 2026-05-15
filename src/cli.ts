import { Command } from 'commander';
import chalk, { type ChalkInstance } from 'chalk';
import ora from 'ora';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { runUpgrade } from './engines/orchestrator.js';
import { detectStack } from './engines/stack-detector.js';
import { analyzeDependencies } from './engines/dependency-analyzer.js';
import { planUpgrade } from './engines/upgrade-planner.js';
import { installSkill, removeSkill, listSkills, searchSkills } from './skills/manager.js';
import type { UpgradeReport, RiskLevel } from './types/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

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
      console.log(`    ${icon} ${chalk.bold(bc.api)}: ${bc.description}`);
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
    console.log(
      `  ${riskFn('●')} ${chalk.bold(d.name.padEnd(45))} ${chalk.dim(d.current)} → ${latest} ${tag}`,
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
      console.log(`    ${icon}  Line${loc} — ${chalk.bold(s.change.api)}`);
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

function printTerminalReport(report: UpgradeReport, outputPath?: string) {
  console.log('');
  console.log(chalk.bold.blue('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('  ║           stack-lift upgrade report       ║'));
  console.log(chalk.bold.blue('  ╚══════════════════════════════════════════╝'));

  printStackSummary(report);
  printPlanSummary(report);
  printDependencySummary(report);
  printCodeSuggestions(report);
  printManualActions(report);

  if (outputPath) {
    console.log(chalk.green(`  ✔ Report written to: ${outputPath}`));
    console.log('');
  }
}

// ── Commands ─────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('stack-lift')
  .description('AI-powered upgrade assistant for Angular, React, and legacy frontend codebases')
  .version(pkg.version);

program
  .command('analyze <path>')
  .description('Analyze a project and show what needs upgrading')
  .action(async (projectPath: string) => {
    const spinner = ora('Analyzing project…').start();
    try {
      const stack = detectStack(path.resolve(projectPath));
      spinner.succeed(`Detected: ${chalk.cyan(`${stack.framework} ${stack.frameworkVersion}`)}`);

      if (stack.isMonorepo) {
        console.log(
          `  ${chalk.yellow('⚠ Monorepo detected')} — for best results, run analyze on each workspace package separately`,
        );
      }

      const deps = await analyzeDependencies(stack);
      const outdated = deps.length;
      console.log(
        `  ${chalk.dim('Outdated packages:')} ${outdated > 0 ? chalk.yellow(outdated) : chalk.green(outdated)}`,
      );
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
          `  Run ${chalk.white('stack-lift upgrade <path>')} to generate a full upgrade plan.`,
        ),
      );
      console.log('');
    } catch (err) {
      spinner.fail(String(err));
      process.exitCode = 1;
    }
  });

program
  .command('upgrade <path>')
  .description('Generate a full upgrade plan with breaking changes and code suggestions')
  .option('-t, --to <version>', 'Target major version (e.g. 18 for Angular 18)')
  .option('-o, --output <format>', 'Output format: terminal | markdown | json', 'terminal')
  .option('--apply', 'Apply automated AST-based code fixes in-place', false)
  .option('--dry-run', 'Show what --apply would change without writing files', false)
  .action(
    async (
      projectPath: string,
      options: { to?: string; output: string; apply: boolean; dryRun: boolean },
    ) => {
      const spinner = ora('Running upgrade analysis…').start();
      try {
        const resolved = path.resolve(projectPath);
        const outputFormat = options.output as 'terminal' | 'markdown' | 'json';

        const result = await runUpgrade({
          projectPath: resolved,
          ...(options.to !== undefined ? { targetVersion: options.to } : {}),
          apply: options.apply,
          outputFormat,
        });

        spinner.succeed('Analysis complete');

        if (outputFormat === 'terminal') {
          printTerminalReport(result.report, result.outputPath);
        } else if (outputFormat === 'json') {
          if (result.outputPath) {
            console.log(chalk.green(`\n  ✔ JSON report written to: ${result.outputPath}\n`));
          } else {
            console.log(result.json);
          }
        } else if (outputFormat === 'markdown') {
          if (result.outputPath) {
            console.log(chalk.green(`\n  ✔ Markdown report written to: ${result.outputPath}\n`));
          } else {
            console.log(result.markdown);
          }
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

program
  .command('plan <path>')
  .description('Show the upgrade path and step count without full analysis')
  .option('-t, --to <version>', 'Target major version')
  .action((projectPath: string, options: { to?: string }) => {
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
      console.log('');

      for (const [i, step] of plan.steps.entries()) {
        console.log(
          `  ${chalk.cyan(`${i + 1}.`)} v${step.fromVersion} → v${step.toVersion}  ${chalk.dim(step.description)}`,
        );
        console.log(
          `     ${step.breakingChanges.length} breaking changes, ${step.automatedFixes} auto-fixable`,
        );
      }
      console.log('');
    } catch (err) {
      console.error(chalk.red(String(err)));
      process.exitCode = 1;
    }
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

// Parse and propagate async errors as non-zero exit codes
program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red(String(err)));
  process.exitCode = 1;
});
