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
export {
  analyzeDependencies,
  runSecurityAudit,
  detectTransitiveConflicts,
} from './dependency-intelligence/dependency-analyzer.js';
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
export {
  runCommand,
  createGitBackup,
  restoreGitBackup,
  executeCommands,
} from './execution/command-runner.js';
export type {
  CommandOptions,
  CommandResult,
  BackupRef,
  CommandExecution,
  ExecuteCommandsOptions,
  ExecuteCommandsResult,
} from './execution/command-runner.js';
export { RollbackManager } from './execution/rollback-manager.js';
export type { RollbackResult, RollbackStrategy } from './execution/rollback-manager.js';

// Validation
export { validateBuild } from './validation/build-validator.js';

// Diagnostics
export {
  classifyBuildFailure,
  buildDiagnosticSummary,
} from './diagnostics/failure-classifier.js';

// Reporting
export {
  generateMarkdownReport,
  generateJsonReport,
  generateAnalysisJson,
  generateExecutionJson,
  generateFindingsJson,
  generatePlanJson,
  generateValidationJson,
  STABLE_TIMESTAMP,
  type SerializeOptions,
} from './reporting/doc-generator.js';
export { writeArtifacts, writeMachineArtifacts } from './reporting/artifact-writer.js';

// Path safety
export { assertSafePath, resolveSafePath } from './path-guard.js';

// Config migration
export {
  analyzeConfigMigrations,
  applyConfigMigrations,
} from './migration/config-migrator.js';

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
  getApplicableReplacements,
} from './knowledge/replacements.js';
