export type Framework = 'Angular' | 'React' | 'Vue' | 'Next.js' | 'Nuxt' | 'Svelte' | 'Unknown';

/** How certain a claim is — always shown so users can calibrate. */
export type Confidence = 'high' | 'medium' | 'low';

/**
 * Fine-grained risk category for a dependency finding.
 * More specific than RiskLevel — used in findings.json and audit output.
 */
export type RiskCategory =
  | 'breaking-compatibility'
  | 'deprecated'
  | 'abandoned'
  | 'vulnerable'
  | 'performance'
  | 'modernization'
  | 'optional';

export type BuildTool =
  | 'Webpack'
  | 'Vite'
  | 'Parcel'
  | 'Rollup'
  | 'Create React App'
  | 'Angular CLI'
  | 'Unknown';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type Severity = 'low' | 'medium' | 'high';

export type MigrationAutomationLevel = 'automatable' | 'assisted' | 'advisory';

export type BreakingChangeCategory =
  | 'api'
  | 'config'
  | 'syntax'
  | 'lifecycle'
  | 'import'
  | 'behavior';

/**
 * How a claim was established. Drives the evidence label shown in reports.
 * - observed: read directly from a file (package.json version, tsconfig option)
 * - inferred: derived from static rules (KNOWN_BREAKING set, effort heuristic)
 * - registry: live npm registry response
 */
export type EvidenceSource = 'observed' | 'inferred' | 'registry';

// ── Interactive migration types ───────────────────────────────────────────────

export type MigrationObjective =
  | 'minimal-risk'
  | 'security'
  | 'modernization'
  | 'performance'
  | 'full-migration';

/** Controls how much autonomy stack-lift has during migration. */
export type ExecutionMode = 'safe' | 'guided' | 'autonomous';

export type BackupStrategy = 'branch' | 'tag' | 'none';

export type ArtifactFormat = 'markdown' | 'json';

export interface PackageAlternative {
  name: string;
  description: string;
  apiSimilarity: 'high' | 'medium' | 'low';
  migrationEffort: 'low' | 'medium' | 'high';
  bundleNote?: string;
  notes?: string;
}

export interface ContextQuestion {
  id: string;
  question: string;
  choices: Array<{ label: string; value: string }>;
}

export interface ReplacementEntry {
  deprecated: string;
  reason: string;
  alternatives: PackageAlternative[];
  skipOption: string;
  /** Context questions asked before showing alternatives — answers reorder the list. */
  contextQuestions?: ContextQuestion[];
  /**
   * Frameworks this replacement entry applies to.
   * Absent or empty means universal — relevant for all frameworks.
   */
  applicableTo?: Exclude<Framework, 'Unknown'>[];
}

export interface PackageReplacement {
  package: string;
  /** Name of chosen alternative, or null if user chose to skip. */
  chosen: string | null;
  occurrences: number;
}

export interface MigrationDecisions {
  objective: MigrationObjective;
  targetVersion: string;
  packageReplacements: PackageReplacement[];
  backupStrategy: BackupStrategy;
  outputFormats: ArtifactFormat[];
  outputDir: string;
  autoApply: boolean;
}

export interface SessionFingerprint {
  packageJsonHash: string;
  lockfileHash?: string;
  gitHead?: string;
  frameworkVersion: string;
}

export interface SessionState {
  projectPath: string;
  createdAt: string;
  lastUpdatedAt: string;
  decisions: Partial<MigrationDecisions>;
  phase: 'discovery' | 'decisions' | 'planning' | 'done';
  fingerprint?: SessionFingerprint;
}

export interface TsconfigInfo {
  strict?: boolean;
  target?: string;
  module?: string;
  moduleResolution?: string;
  useDefineForClassFields?: boolean;
  experimentalDecorators?: boolean;
  emitDecoratorMetadata?: boolean;
}

export interface StackInfo {
  framework: Framework;
  frameworkVersion: string;
  typescript?: string;
  rxjs?: string;
  buildTool: BuildTool;
  nodeVersion?: string;
  packageManager: PackageManager;
  projectPath: string;
  rawDependencies: Record<string, string>;
  rawDevDependencies: Record<string, string>;
  /** Resolved versions from the lockfile (more accurate than package.json ranges). */
  resolvedVersions?: Record<string, string>;
  /** Whether lockfile was present and parsed successfully. */
  lockfileParsed?: boolean;
  /** Key compiler options read from tsconfig.json. */
  tsconfig?: TsconfigInfo;
  isMonorepo?: boolean;
  /** Detected test runner (Karma, Jest, Vitest, Playwright, Cypress). */
  testRunner?: string;
}

export interface DependencyInfo {
  name: string;
  current: string;
  latest: string;
  type: 'dependencies' | 'devDependencies';
  risk: RiskLevel;
  /** Fine-grained risk category. */
  riskCategory?: RiskCategory;
  breakingChanges: boolean;
  deprecated: boolean;
  reason?: string;
  /** How the latest version was determined. */
  latestSource: EvidenceSource;
  /** Source file(s) where this dep was observed. */
  observedIn?: string;
  /** How confident we are in this finding. Defaults to 'medium' when unknown. */
  confidence: Confidence;
}

export interface PeerDepConflict {
  package: string;
  installedVersion: string;
  requiredRange: string;
  requiredBy: string;
  /** True if there is no published version that satisfies both the target framework and current constraint. */
  unresolvable: boolean;
}

export interface BreakingChange {
  api: string;
  description: string;
  before?: string;
  after?: string;
  automated: boolean;
  /** Automatable rules are safe for stack-lift to apply; assisted/advisory are surfaced for review. */
  automationLevel?: MigrationAutomationLevel;
  remediationGuidance?: string;
  severity: Severity;
  fromVersion: string;
  toVersion: string;
  category: BreakingChangeCategory;
  searchPattern?: string;
  /** Confidence this breaking change applies to the project (inferred from static catalogue). Defaults to 'medium'. */
  confidence?: Confidence;
}

export interface UpgradeStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  breakingChanges: BreakingChange[];
  automatedFixes: number;
  manualActions: string[];
  npmInstall: string[];
  /** Optional packages to install only when detected in the project (e.g. @angular/material, @angular/cdk). */
  conditionalNpmInstall?: { packages: string[]; condition: string }[];
  /** Official migration guide URL for this hop. */
  referenceUrl?: string;
}

export interface FrameworkProvider {
  readonly name: Exclude<Framework, 'Unknown'>;
  readonly supportedVersions: readonly string[];
  getLatestVersion(): string;
  getUpgradeSteps(fromVersion: string, toVersion: string): UpgradeStep[];
}

export interface UpgradePlan {
  framework: Framework;
  fromVersion: string;
  toVersion: string;
  strategy: 'direct' | 'incremental';
  steps: UpgradeStep[];
  totalBreakingChanges: number;
  totalAutomatedFixes: number;
  migrationRuleCounts?: Record<MigrationAutomationLevel, number>;
  riskLevel: RiskLevel;
  estimatedEffort: string;
  /** Basis for the effort estimate — always shown so users can calibrate. */
  effortBasis: string;
}

export interface CodeSuggestion {
  file: string;
  line?: number;
  change: BreakingChange;
  matchedText?: string;
}

export interface RefactorResult {
  file: string;
  suggestions: CodeSuggestion[];
  /** Descriptions of changes actually applied (when --apply is used). */
  applied?: string[];
  /** Simple line-level diff of the change (populated in dry-run and apply modes). */
  diff?: string;
}

export interface BuildValidationResult {
  step: 'install' | 'build' | 'test' | 'lint';
  status: 'success' | 'failed' | 'skipped';
  durationMs?: number;
  output?: string;
  error?: string;
}

export interface CommandExecutionRecord {
  cmd: string;
  exitCode: number;
  durationMs: number;
  stdoutSummary?: string;
  stderrSummary?: string;
  timedOut: boolean;
}

export interface NonInteractiveOptions {
  target?: string;
  objective?: MigrationObjective;
  yes?: boolean;
  dryRun?: boolean;
  outputFormats?: ArtifactFormat[];
  outputDir?: string;
  validate?: boolean;
  /** When true, suppress timestamps in machine artifacts for reproducible CI output. */
  stable?: boolean;
}

export interface UpgradeReport {
  stack: StackInfo;
  plan: UpgradePlan;
  outdatedDependencies: DependencyInfo[];
  peerConflicts: PeerDepConflict[];
  refactorResults: RefactorResult[];
  manualActions: string[];
  buildStatus: 'success' | 'failed' | 'skipped';
  /** Build validation results captured before the migration (baseline). */
  baselineValidation?: BuildValidationResult[];
  buildValidation?: BuildValidationResult[];
  decisions?: Partial<MigrationDecisions>;
  generatedAt: string;
  /** Command execution journal populated when running in autonomous mode. */
  commandExecutions?: CommandExecutionRecord[];
  commandExecutionStatus?: 'success' | 'failed' | 'rolled-back' | 'dry-run';
  /** Config file migrations detected and optionally applied. */
  configMigrations?: ConfigMigrationResult[];
}

export interface ConfigMigrationResult {
  id: string;
  file: string;
  description: string;
  fromVersion: string;
  toVersion: string;
  needed: boolean;
  applied: boolean;
  dryRun: boolean;
  before?: string;
  after?: string;
  diff?: string;
}

export interface AnalyzeOptions {
  projectPath: string;
  targetVersion?: string;
  apply?: boolean;
  outputFormat?: 'terminal' | 'markdown' | 'json';
}
