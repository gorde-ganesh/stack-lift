export type Framework = 'Angular' | 'React' | 'Vue' | 'Next.js' | 'Nuxt' | 'Svelte' | 'Unknown';

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
}

export interface DependencyInfo {
  name: string;
  current: string;
  latest: string;
  type: 'dependencies' | 'devDependencies';
  risk: RiskLevel;
  breakingChanges: boolean;
  deprecated: boolean;
  reason?: string;
  /** How the latest version was determined. */
  latestSource: EvidenceSource;
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
  severity: Severity;
  fromVersion: string;
  toVersion: string;
  category: BreakingChangeCategory;
  searchPattern?: string;
}

export interface UpgradeStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  breakingChanges: BreakingChange[];
  automatedFixes: number;
  manualActions: string[];
  npmInstall: string[];
  /** Official migration guide URL for this hop. */
  referenceUrl?: string;
}

export interface UpgradePlan {
  framework: Framework;
  fromVersion: string;
  toVersion: string;
  strategy: 'direct' | 'incremental';
  steps: UpgradeStep[];
  totalBreakingChanges: number;
  totalAutomatedFixes: number;
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

export interface UpgradeReport {
  stack: StackInfo;
  plan: UpgradePlan;
  outdatedDependencies: DependencyInfo[];
  peerConflicts: PeerDepConflict[];
  refactorResults: RefactorResult[];
  manualActions: string[];
  buildStatus: 'success' | 'failed' | 'skipped';
  generatedAt: string;
}

export interface AnalyzeOptions {
  projectPath: string;
  targetVersion?: string;
  apply?: boolean;
  outputFormat?: 'terminal' | 'markdown' | 'json';
}
