export type Framework =
  | 'Angular'
  | 'React'
  | 'Vue'
  | 'Next.js'
  | 'Nuxt'
  | 'Svelte'
  | 'Unknown';

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
}

export interface UpgradeReport {
  stack: StackInfo;
  plan: UpgradePlan;
  outdatedDependencies: DependencyInfo[];
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
