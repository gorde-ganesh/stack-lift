export { detectStack } from './engines/stack-detector.js';
export { analyzeDependencies } from './engines/dependency-analyzer.js';
export { planUpgrade } from './engines/upgrade-planner.js';
export { analyzeBreakingChanges } from './engines/breaking-change-analyzer.js';
export { applyRefactors, hasAutomatedFix } from './engines/refactor-engine.js';
export { generateMarkdownReport, generateJsonReport } from './engines/doc-generator.js';
export { runUpgrade } from './engines/orchestrator.js';
export { getPackageInfo, getPackageInfoBatch, clearCache } from './engines/npm-registry.js';
export { assertSafePath, resolveSafePath } from './engines/path-guard.js';

export type {
  Framework,
  BuildTool,
  PackageManager,
  RiskLevel,
  Severity,
  BreakingChangeCategory,
  EvidenceSource,
  TsconfigInfo,
  StackInfo,
  DependencyInfo,
  PeerDepConflict,
  BreakingChange,
  UpgradeStep,
  UpgradePlan,
  CodeSuggestion,
  RefactorResult,
  UpgradeReport,
  AnalyzeOptions,
} from './types/index.js';
