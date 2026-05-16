import type { StackInfo, UpgradePlan, UpgradeStep, RiskLevel } from '@stack-lift/shared';
import { getFrameworkProvider, listFrameworkProviders } from '../providers/registry.js';

function majorOf(version: string): string {
  return version.split('.')[0] ?? '';
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

function estimateEffort(
  steps: UpgradeStep[],
  affectedFileCount?: number,
  totalOccurrences?: number,
): { effort: string; basis: string } {
  const totalChanges = steps.flatMap((s) => s.breakingChanges).length;
  const manualCount = steps.flatMap((s) => s.manualActions).length;

  const filePart = affectedFileCount !== undefined ? `, ${affectedFileCount} affected file(s)` : '';
  const occPart =
    totalOccurrences !== undefined ? `, ${totalOccurrences} occurrence(s) in source` : '';
  const basis = `${totalChanges} catalogued breaking changes, ${manualCount} manual actions across ${steps.length} hop(s)${filePart}${occPart} — does not account for test coverage or CI complexity`;

  const sizeMultiplier =
    (affectedFileCount ?? 0) > 100 || (totalOccurrences ?? 0) > 200
      ? 2
      : (affectedFileCount ?? 0) > 30 || (totalOccurrences ?? 0) > 50
        ? 1.5
        : 1;

  const baseScore = totalChanges + manualCount * 0.5;
  const scaledScore = baseScore * sizeMultiplier;

  if (scaledScore === 0 && manualCount <= 2) return { effort: '1–2 hours', basis };
  if (scaledScore <= 4) return { effort: '2–4 hours', basis };
  if (scaledScore <= 9) return { effort: '1–2 days', basis };
  if (scaledScore <= 18) return { effort: '2–5 days', basis };
  return { effort: '1–2 weeks', basis };
}

function resolveTargetVersion(stack: StackInfo, requestedTarget?: string): string {
  if (requestedTarget) return majorOf(requestedTarget);

  const provider = getFrameworkProvider(stack.framework);
  if (provider) return provider.latestVersion();
  return majorOf(stack.frameworkVersion);
}

function validateVersions(
  framework: string,
  fromMajor: string,
  toMajor: string,
  supported: string[],
): void {
  if (!supported.includes(fromMajor)) {
    throw new Error(
      `${framework} v${fromMajor} is not in the supported upgrade range (${supported[0]}–${supported[supported.length - 1]})`,
    );
  }
  if (!supported.includes(toMajor)) {
    throw new Error(
      `Target ${framework} v${toMajor} is not in the supported range (${supported[0]}–${supported[supported.length - 1]})`,
    );
  }
  if (parseInt(toMajor) <= parseInt(fromMajor)) {
    throw new Error(
      `Target version (${toMajor}) must be greater than current version (${fromMajor})`,
    );
  }
}

export function planUpgrade(
  stack: StackInfo,
  targetVersion?: string,
  sizeHint?: { affectedFiles?: number; totalOccurrences?: number },
): UpgradePlan {
  const { framework, frameworkVersion } = stack;
  const fromMajor = majorOf(frameworkVersion);
  const toMajor = resolveTargetVersion(stack, targetVersion);
  const provider = getFrameworkProvider(framework);

  if (!provider) {
    const supported = listFrameworkProviders().map((p) => p.framework).join(', ');
    throw new Error(
      `Upgrade planning for "${framework}" is not yet supported. Registered providers: ${supported || 'none'}`,
    );
  }

  validateVersions(framework, fromMajor, toMajor, [...provider.supportedVersions]);
  const steps: UpgradeStep[] = provider.upgradeSteps(fromMajor, toMajor);

  const strategy = steps.length > 1 ? 'incremental' : 'direct';
  const totalBreakingChanges = steps.reduce((n, s) => n + s.breakingChanges.length, 0);
  const totalAutomatedFixes = steps.reduce((n, s) => n + s.automatedFixes, 0);
  const { effort, basis } = estimateEffort(
    steps,
    sizeHint?.affectedFiles,
    sizeHint?.totalOccurrences,
  );

  return {
    framework,
    fromVersion: fromMajor,
    toVersion: toMajor,
    strategy,
    steps,
    totalBreakingChanges,
    totalAutomatedFixes,
    riskLevel: computeRisk(steps),
    estimatedEffort: effort,
    effortBasis: basis,
  };
}
