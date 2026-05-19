import type { Framework, UpgradeStep } from '@stack-lift/shared';

export interface FrameworkProvider {
  framework: Exclude<Framework, 'Unknown'>;
  supportedVersions: readonly string[];
  latestVersion(): string;
  fetchLatestVersion?(): Promise<string>;
  upgradeSteps(from: string, to: string): UpgradeStep[];
}
