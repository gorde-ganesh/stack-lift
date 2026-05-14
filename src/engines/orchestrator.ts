import * as fs from 'node:fs';
import * as path from 'node:path';
import { detectStack } from './stack-detector.js';
import { analyzeDependencies } from './dependency-analyzer.js';
import { planUpgrade } from './upgrade-planner.js';
import { analyzeBreakingChanges } from './breaking-change-analyzer.js';
import { applyRefactors } from './refactor-engine.js';
import { generateMarkdownReport, generateJsonReport } from './doc-generator.js';
import type { AnalyzeOptions, UpgradeReport, StackInfo, UpgradePlan } from '../types/index.js';

export interface OrchestratorResult {
  report: UpgradeReport;
  markdown: string;
  json: string;
  outputPath?: string;
}

export async function runUpgrade(options: AnalyzeOptions): Promise<OrchestratorResult> {
  const { projectPath, targetVersion, apply = false, outputFormat = 'terminal' } = options;

  // 1. Detect stack
  const stack: StackInfo = detectStack(projectPath);

  // 2. Analyze dependencies
  const outdatedDependencies = analyzeDependencies(stack);

  // 3. Plan upgrade
  const plan: UpgradePlan = planUpgrade(stack, targetVersion);

  // 4. Find breaking change locations in source
  const codeSuggestions = analyzeBreakingChanges(projectPath, plan);

  // 5. Group suggestions into refactor results
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

  // 6. Optionally apply automated fixes
  if (apply) {
    const applied = applyRefactors(codeSuggestions);
    // Merge applied results
    refactorResults = applied.length > 0 ? applied : refactorResults;
  }

  // 7. Collect all manual actions
  const manualActions = [
    ...new Set(plan.steps.flatMap((s) => s.manualActions)),
  ];

  const report: UpgradeReport = {
    stack,
    plan,
    outdatedDependencies,
    refactorResults,
    manualActions,
    buildStatus: 'skipped',
    generatedAt: new Date().toISOString(),
  };

  const markdown = generateMarkdownReport(report);
  const json = generateJsonReport(report);

  // 8. Write output file if markdown or json format requested
  let outputPath: string | undefined;
  if (outputFormat === 'markdown') {
    outputPath = path.join(projectPath, 'UPGRADE_REPORT.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
  } else if (outputFormat === 'json') {
    outputPath = path.join(projectPath, 'upgrade-report.json');
    fs.writeFileSync(outputPath, json, 'utf-8');
  }

  return { report, markdown, json, outputPath };
}
