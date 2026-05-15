import semver from 'semver';
import { getPackageInfoBatch } from './npm-registry.js';
import type { StackInfo, DependencyInfo, RiskLevel } from '../types/index.js';

function stripRange(version: string): string {
  return (version.replace(/^[\^~>=<*]+/, '').split(' ')[0] ?? '').split('-')[0] ?? '';
}

function classifyRisk(
  current: string,
  latest: string,
  hasBreakingChanges: boolean,
  riskOverride?: RiskLevel,
  deprecated?: string,
): RiskLevel {
  if (riskOverride) return riskOverride;
  if (deprecated) return 'high';

  const currentParsed = semver.coerce(current);
  const latestParsed = semver.coerce(latest);
  if (!currentParsed || !latestParsed) return 'medium';

  const majorDiff = semver.major(latestParsed) - semver.major(currentParsed);
  if (majorDiff >= 3) return 'high';
  if (majorDiff >= 1) return hasBreakingChanges ? 'medium' : 'low';
  return 'low';
}

/**
 * Analyze all dependencies in a project against the live npm registry.
 * Falls back to local deprecation knowledge if the registry is unreachable.
 *
 * This function is async because it queries the npm registry.
 */
export async function analyzeDependencies(stack: StackInfo): Promise<DependencyInfo[]> {
  const allDeps = new Map<string, { version: string; type: 'dependencies' | 'devDependencies' }>();

  for (const [name, version] of Object.entries(stack.rawDependencies)) {
    allDeps.set(name, { version, type: 'dependencies' });
  }
  for (const [name, version] of Object.entries(stack.rawDevDependencies)) {
    if (!allDeps.has(name)) {
      allDeps.set(name, { version, type: 'devDependencies' });
    }
  }

  const packageNames = Array.from(allDeps.keys());
  const registryData = await getPackageInfoBatch(packageNames);

  const results: DependencyInfo[] = [];

  for (const [name, { version, type }] of allDeps) {
    const info = registryData.get(name);
    if (!info || info.latest === 'unknown') {
      // If deprecated but no version info, still surface it
      if (info?.deprecated) {
        results.push({
          name,
          current: stripRange(version),
          latest: 'unknown',
          type,
          risk: info.riskOverride ?? 'high',
          breakingChanges: false,
          deprecated: true,
          reason: info.deprecated,
        });
      }
      continue;
    }

    const current = stripRange(version);
    const latest = info.latest;

    let isOutdated = false;
    try {
      const currentParsed = semver.coerce(current);
      const latestParsed = semver.coerce(latest);
      if (currentParsed && latestParsed) {
        isOutdated = semver.lt(currentParsed, latestParsed);
      }
    } catch {
      isOutdated = current !== latest;
    }

    const isDeprecated = Boolean(info.deprecated);

    if (!isOutdated && !isDeprecated) continue;

    results.push({
      name,
      current,
      latest,
      type,
      risk: classifyRisk(
        current,
        latest,
        info.hasBreakingChanges,
        info.riskOverride,
        info.deprecated,
      ),
      breakingChanges: info.hasBreakingChanges,
      deprecated: isDeprecated,
      ...(isDeprecated && info.deprecated ? { reason: info.deprecated } : {}),
    });
  }

  const riskOrder: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
  return results.sort((a, b) => riskOrder.indexOf(a.risk) - riskOrder.indexOf(b.risk));
}
