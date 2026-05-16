import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import {
  analyzeBreakingChanges,
  analyzeDependencies,
  applyRefactors,
  detectStack,
  planUpgrade,
  validateBuild,
  writeArtifacts,
  writeMachineArtifacts,
} from '@stack-lift/core';
import { registerAngularProvider } from '@stack-lift/angular-provider';
import type {
  ArtifactFormat,
  MigrationDecisions,
  NonInteractiveOptions,
  RefactorResult,
  UpgradeReport,
} from '@stack-lift/shared';

registerAngularProvider();

export interface InteractiveRunOptions {
  nonInteractive?: boolean;
  apply?: boolean;
  validate?: boolean;
  options?: NonInteractiveOptions;
}

export async function runInteractive(projectPath: string, opts: InteractiveRunOptions = {}) {
  const resolved = path.resolve(projectPath);
  const outputFormats: ArtifactFormat[] =
    opts.options?.outputFormats ?? (opts.options?.dryRun ? [] : ['markdown', 'json']);
  const outputDir = opts.options?.outputDir ?? './stacklift-output';

  const spinner = ora('Scanning project...').start();
  const stack = detectStack(resolved);
  spinner.succeed(`Detected ${stack.framework} ${stack.frameworkVersion}`);

  const analysisSpinner = ora('Analyzing dependencies...').start();
  const { outdated, peerConflicts } = await analyzeDependencies(stack);
  analysisSpinner.succeed(
    `Found ${outdated.length} outdated package(s), ${peerConflicts.length} peer conflict(s)`,
  );

  const targetVersion = opts.options?.target;
  const plan = planUpgrade(stack, targetVersion);
  const suggestions = analyzeBreakingChanges(resolved, plan);
  const byFile = new Map<string, typeof suggestions>();

  for (const suggestion of suggestions) {
    const list = byFile.get(suggestion.file) ?? [];
    list.push(suggestion);
    byFile.set(suggestion.file, list);
  }

  let refactorResults: RefactorResult[] = [...byFile.entries()].map(([file, fileSuggestions]) => ({
    file,
    suggestions: fileSuggestions,
  }));

  if (opts.apply) {
    const applied = applyRefactors(suggestions);
    if (applied.length > 0) refactorResults = applied;
  }

  const decisions: MigrationDecisions = {
    objective: opts.options?.objective ?? 'minimal-risk',
    targetVersion: plan.toVersion,
    packageReplacements: [],
    backupStrategy: 'none',
    outputFormats,
    outputDir,
    autoApply: opts.apply ?? false,
  };

  const report: UpgradeReport = {
    stack,
    plan,
    outdatedDependencies: outdated,
    peerConflicts,
    refactorResults,
    manualActions: [...new Set(plan.steps.flatMap((step) => step.manualActions))],
    buildStatus: 'skipped',
    decisions,
    generatedAt: new Date().toISOString(),
  };

  if (opts.validate) {
    const validation = validateBuild({
      projectPath: resolved,
      packageManager: stack.packageManager,
      steps: ['install', 'build', 'test', 'lint'],
    });
    report.buildValidation = validation;
    report.buildStatus = validation.some((result) => result.status === 'failed')
      ? 'failed'
      : 'success';
  }

  const artifacts =
    outputFormats.length === 0
      ? []
      : [
          ...writeArtifacts(report, path.resolve(resolved, outputDir), outputFormats),
          ...writeMachineArtifacts(report, path.resolve(resolved, outputDir)),
        ];

  console.log('');
  console.log(chalk.bold(`  ${stack.framework} upgrade plan: ${plan.fromVersion} -> ${plan.toVersion}`));
  console.log(`  Strategy: ${plan.strategy} | Risk: ${plan.riskLevel} | Effort: ${plan.estimatedEffort}`);
  console.log(`  Code locations to review: ${suggestions.length}`);
  for (const artifact of artifacts) {
    console.log(chalk.green(`  ${artifact.format} -> ${artifact.filePath}`));
  }
  console.log('');

  return { report, decisions, artifacts };
}
