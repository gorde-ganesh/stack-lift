import * as fs from 'node:fs';
import * as path from 'node:path';
import { detectStack } from '../detector/stack-detector.js';
import { analyzeDependencies } from '../dependency-intelligence/dependency-analyzer.js';
import { planUpgrade } from '../planner/upgrade-planner.js';
import { analyzeBreakingChanges } from '../planner/breaking-change-analyzer.js';
import { applyRefactors } from '../execution/refactor-engine.js';
import { analyzeConfigMigrations, applyConfigMigrations } from '../migration/config-migrator.js';
import { generateMarkdownReport, generateJsonReport } from '../reporting/doc-generator.js';
import { buildDiagnosticSummary } from '../diagnostics/failure-classifier.js';
import { assertSafePath } from '../path-guard.js';
import type { AnalyzeOptions, UpgradeReport, StackInfo, UpgradePlan } from '@stack-lift/shared';

export interface OrchestratorResult {
  report: UpgradeReport;
  markdown: string;
  json: string;
  outputPath?: string;
}

export async function runUpgrade(options: AnalyzeOptions): Promise<OrchestratorResult> {
  const { projectPath, targetVersion, apply = false, outputFormat = 'terminal' } = options;

  assertSafePath(projectPath);

  const stack: StackInfo = detectStack(projectPath);

  const { outdated: outdatedDependencies, peerConflicts } = await analyzeDependencies(stack);

  const plan: UpgradePlan = planUpgrade(stack, targetVersion);

  const codeSuggestions = analyzeBreakingChanges(projectPath, plan);

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

  const configMigrations = apply
    ? applyConfigMigrations(projectPath, plan, false)
    : analyzeConfigMigrations(projectPath, plan);

  if (apply) {
    const applied = applyRefactors(codeSuggestions);
    if (applied.length > 0) refactorResults = applied;
  }

  const manualActions = [...new Set(plan.steps.flatMap((s) => s.manualActions))];

  // For Nx workspaces, prepend nx migrate guidance
  if (stack.workspaceInfo?.isNx) {
    const nxTarget = plan.toVersion;
    manualActions.unshift(
      `Nx workspace detected — run \`nx migrate @angular/core@${nxTarget}\` instead of ng update`,
      `After nx migrate, run \`nx migrate --run-migrations\` to apply generated migration scripts`,
    );
  }

  const report: UpgradeReport = {
    stack,
    plan,
    outdatedDependencies,
    peerConflicts,
    refactorResults,
    manualActions,
    buildStatus: 'skipped',
    generatedAt: new Date().toISOString(),
    configMigrations,
    diagnosticSummary: buildDiagnosticSummary([]),
  };

  const markdown = generateMarkdownReport(report);
  const json = generateJsonReport(report);

  let outputPath: string | undefined;
  if (outputFormat === 'markdown') {
    outputPath = path.join(projectPath, 'UPGRADE_REPORT.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
  } else if (outputFormat === 'json') {
    outputPath = path.join(projectPath, 'upgrade-report.json');
    fs.writeFileSync(outputPath, json, 'utf-8');
  }

  return { report, markdown, json, ...(outputPath !== undefined ? { outputPath } : {}) };
}
