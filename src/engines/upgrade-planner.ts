import semver from 'semver';
import { getAngularUpgradeSteps, getAngularLatestVersion, ANGULAR_SUPPORTED_VERSIONS } from '../knowledge/angular.js';
import { getReactUpgradeSteps, getReactLatestVersion, REACT_SUPPORTED_VERSIONS } from '../knowledge/react.js';
import type { StackInfo, UpgradePlan, UpgradeStep, RiskLevel } from '../types/index.js';

function majorOf(version: string): string {
  return version.split('.')[0];
}

function computeRisk(steps: UpgradeStep[]): RiskLevel {
  const allChanges = steps.flatMap((s) => s.breakingChanges);
  const hasHigh = allChanges.some((c) => c.severity === 'high');
  const hasMedium = allChanges.some((c) => c.severity === 'medium');
  const majorSpan = steps.length;

  if (hasHigh && majorSpan >= 3) return 'critical';
  if (hasHigh) return 'high';
  if (hasMedium || majorSpan >= 3) return 'medium';
  return 'low';
}

function estimateEffort(steps: UpgradeStep[]): string {
  const totalChanges = steps.flatMap((s) => s.breakingChanges).length;
  const manualCount = steps.flatMap((s) => s.manualActions).length;

  if (totalChanges === 0 && manualCount <= 2) return '1–2 hours';
  if (totalChanges <= 3 && manualCount <= 5) return '2–4 hours';
  if (totalChanges <= 6) return '1–2 days';
  if (totalChanges <= 12) return '2–5 days';
  return '1–2 weeks';
}

function resolveTargetVersion(stack: StackInfo, requestedTarget?: string): string {
  const { framework } = stack;

  if (requestedTarget) return majorOf(requestedTarget);

  if (framework === 'Angular') return getAngularLatestVersion();
  if (framework === 'React') return getReactLatestVersion();
  return majorOf(stack.frameworkVersion);
}

function validateVersions(
  framework: string,
  fromMajor: string,
  toMajor: string,
  supported: string[]
): void {
  if (!supported.includes(fromMajor)) {
    throw new Error(
      `${framework} v${fromMajor} is not in the supported upgrade range (${supported[0]}–${supported[supported.length - 1]})`
    );
  }
  if (!supported.includes(toMajor)) {
    throw new Error(
      `Target ${framework} v${toMajor} is not in the supported range (${supported[0]}–${supported[supported.length - 1]})`
    );
  }
  if (parseInt(toMajor) <= parseInt(fromMajor)) {
    throw new Error(`Target version (${toMajor}) must be greater than current version (${fromMajor})`);
  }
}

export function planUpgrade(stack: StackInfo, targetVersion?: string): UpgradePlan {
  const { framework, frameworkVersion } = stack;
  const fromMajor = majorOf(frameworkVersion);
  const toMajor = resolveTargetVersion(stack, targetVersion);

  let steps: UpgradeStep[];

  if (framework === 'Angular') {
    validateVersions('Angular', fromMajor, toMajor, ANGULAR_SUPPORTED_VERSIONS);
    steps = getAngularUpgradeSteps(fromMajor, toMajor);
  } else if (framework === 'React') {
    validateVersions('React', fromMajor, toMajor, REACT_SUPPORTED_VERSIONS);
    steps = getReactUpgradeSteps(fromMajor, toMajor);
  } else {
    throw new Error(`Upgrade planning for "${framework}" is not yet supported. Supported: Angular, React`);
  }

  const strategy = steps.length > 1 ? 'incremental' : 'direct';
  const totalBreakingChanges = steps.reduce((n, s) => n + s.breakingChanges.length, 0);
  const totalAutomatedFixes = steps.reduce((n, s) => n + s.automatedFixes, 0);

  return {
    framework,
    fromVersion: fromMajor,
    toVersion: toMajor,
    strategy,
    steps,
    totalBreakingChanges,
    totalAutomatedFixes,
    riskLevel: computeRisk(steps),
    estimatedEffort: estimateEffort(steps),
  };
}
