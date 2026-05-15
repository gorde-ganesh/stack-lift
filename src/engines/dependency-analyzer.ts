import semver from 'semver';
import { getPackageInfoBatch } from './npm-registry.js';
import type { StackInfo, DependencyInfo, PeerDepConflict, RiskLevel } from '../types/index.js';

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

export interface DependencyAnalysis {
  outdated: DependencyInfo[];
  peerConflicts: PeerDepConflict[];
}

/**
 * Analyze all dependencies in a project against the live npm registry.
 * Falls back to local deprecation knowledge if the registry is unreachable.
 *
 * This function is async because it queries the npm registry.
 */
export async function analyzeDependencies(stack: StackInfo): Promise<DependencyAnalysis> {
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

  const outdated: DependencyInfo[] = [];

  for (const [name, { version, type }] of allDeps) {
    const info = registryData.get(name);
    if (!info || info.latest === 'unknown') {
      // If deprecated but no version info, still surface it
      if (info?.deprecated) {
        outdated.push({
          name,
          current: stripRange(version),
          latest: 'unknown',
          type,
          risk: info.riskOverride ?? 'high',
          riskCategory: 'deprecated',
          breakingChanges: false,
          deprecated: true,
          reason: info.deprecated,
          latestSource: 'inferred',
          observedIn: 'package.json',
          confidence: 'high',
        });
      }
      continue;
    }

    // Prefer lockfile-resolved version over package.json range for accuracy
    const current = stack.resolvedVersions?.[name] ?? stripRange(version);
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

    outdated.push({
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
      riskCategory: isDeprecated ? 'deprecated' : 'breaking-compatibility',
      breakingChanges: info.hasBreakingChanges,
      deprecated: isDeprecated,
      ...(isDeprecated && info.deprecated ? { reason: info.deprecated } : {}),
      latestSource: 'registry',
      observedIn: stack.lockfileParsed ? 'package-lock.json' : 'package.json',
      confidence: isDeprecated ? 'high' : 'high',
    });
  }

  const riskOrder: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
  outdated.sort((a, b) => riskOrder.indexOf(a.risk) - riskOrder.indexOf(b.risk));

  // Detect peer dependency conflicts: for each package whose latest version declares
  // peerDependencies, check whether the currently-installed peers satisfy those ranges.
  const peerConflicts: PeerDepConflict[] = [];
  for (const [name] of allDeps) {
    const info = registryData.get(name);
    if (!info?.peerDependencies) continue;

    for (const [peer, requiredRange] of Object.entries(info.peerDependencies)) {
      const installedEntry = allDeps.get(peer);
      if (!installedEntry) continue;

      const installedVersion =
        stack.resolvedVersions?.[peer] ?? stripRange(installedEntry.version);
      const coerced = semver.coerce(installedVersion);
      if (!coerced) continue;

      const satisfies = semver.satisfies(coerced, requiredRange, { includePrerelease: false });
      if (!satisfies) {
        peerConflicts.push({
          package: peer,
          installedVersion,
          requiredRange,
          requiredBy: name,
          // Mark unresolvable when the required range and installed version don't overlap at all
          unresolvable: !semver.validRange(requiredRange),
        });
      }
    }
  }

  return { outdated, peerConflicts };
}
