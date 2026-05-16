// Orchestration
export { runUpgrade } from './orchestration/orchestrator.js';
export type { OrchestratorResult } from './orchestration/orchestrator.js';
export {
  readSession,
  writeSession,
  clearSession,
  computeFingerprint,
  isFingerprintStale,
  newSession,
  updateSession,
} from './orchestration/session.js';

// Detection
export { detectStack } from './detector/stack-detector.js';
export { detectCiNodeVersions } from './detector/ci-detector.js';

// Dependency intelligence
export { analyzeDependencies, runSecurityAudit, detectTransitiveConflicts } from './dependency-intelligence/dependency-analyzer.js';
export {
  getPackageInfo,
  getPackageInfoBatch,
  clearCache,
  resolveCompatibleVersion,
} from './dependency-intelligence/npm-registry.js';

// Planning
export { planUpgrade } from './planner/upgrade-planner.js';
export { analyzeBreakingChanges } from './planner/breaking-change-analyzer.js';

// Execution
export { applyRefactors, hasAutomatedFix, runDetectors } from './execution/refactor-engine.js';

// Validation
export { validateBuild } from './validation/build-validator.js';

// Reporting
export {
  generateMarkdownReport,
  generateJsonReport,
  generateFindingsJson,
  generatePlanJson,
} from './reporting/doc-generator.js';
export { writeArtifacts, writeMachineArtifacts } from './reporting/artifact-writer.js';

// Path safety
export { assertSafePath, resolveSafePath } from './path-guard.js';

// Provider API
export type { FrameworkProvider } from './providers/framework-provider.js';
export {
  registerFrameworkProvider,
  getFrameworkProvider,
  listFrameworkProviders,
} from './providers/registry.js';

// Generic knowledge (re-exported for consumers that need version data)
export {
  getReactUpgradeSteps,
  getReactLatestVersion,
  REACT_SUPPORTED_VERSIONS,
} from './knowledge/react.js';
export { getTypeScriptBreakingChanges } from './knowledge/typescript.js';
export {
  PACKAGE_REPLACEMENTS,
  getReplacementEntry,
  getKnownDeprecatedPackages,
} from './knowledge/replacements.js';
