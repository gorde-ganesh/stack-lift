import semver from 'semver';
import { execSync } from 'node:child_process';
import { getPackageInfoBatch } from './npm-registry.js';
import type {
  StackInfo,
  DependencyInfo,
  PeerDepConflict,
  RiskLevel,
  PackageManager,
} from '@stack-lift/shared';

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
          ...(info.homepage ? { homepage: info.homepage } : {}),
          ...(info.repository ? { repository: info.repository } : {}),
        });
      }
      continue;
    }

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
      ...(info.homepage ? { homepage: info.homepage } : {}),
      ...(info.repository ? { repository: info.repository } : {}),
    });
  }

  const riskOrder: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
  outdated.sort((a, b) => riskOrder.indexOf(a.risk) - riskOrder.indexOf(b.risk));

  const peerConflicts: PeerDepConflict[] = [];
  for (const [name] of allDeps) {
    const info = registryData.get(name);
    if (!info?.peerDependencies) continue;

    for (const [peer, requiredRange] of Object.entries(info.peerDependencies)) {
      const installedEntry = allDeps.get(peer);
      if (!installedEntry) continue;

      const installedVersion = stack.resolvedVersions?.[peer] ?? stripRange(installedEntry.version);
      const coerced = semver.coerce(installedVersion);
      if (!coerced) continue;

      const satisfies = semver.satisfies(coerced, requiredRange, { includePrerelease: false });
      if (!satisfies) {
        peerConflicts.push({
          package: peer,
          installedVersion,
          requiredRange,
          requiredBy: name,
          unresolvable: !semver.validRange(requiredRange),
        });
      }
    }
  }

  return { outdated, peerConflicts };
}

// ── Security audit ────────────────────────────────────────────────────────────

interface AuditVulnerability {
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  via: string[];
  range: string;
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
  cve?: string[];
}

function auditCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm audit --json';
    case 'yarn':
      return 'yarn audit --json';
    case 'bun':
      return 'bun audit';
    default:
      return 'npm audit --json';
  }
}

export function runSecurityAudit(
  projectPath: string,
  packageManager: PackageManager,
): DependencyInfo[] {
  const cmd = auditCommand(packageManager);
  let raw: string;
  try {
    raw = execSync(cmd, {
      cwd: projectPath,
      encoding: 'utf-8',
      // shell required on Windows where npm/pnpm/yarn are .cmd scripts
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
      timeout: 30000,
    });
  } catch (err) {
    raw = (err as { stdout?: Buffer; stderr?: Buffer }).stdout?.toString() ?? '';
    if (!raw) return [];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [];
  }

  const vulnerabilities = (parsed['vulnerabilities'] ?? parsed['advisories']) as
    | Record<string, AuditVulnerability>
    | undefined;
  if (!vulnerabilities) return [];

  const findings: DependencyInfo[] = [];
  for (const [name, vuln] of Object.entries(vulnerabilities)) {
    const severityMap: Record<string, RiskLevel> = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low',
      info: 'low',
    };
    const cves = vuln.cve?.length ? ` CVE: ${vuln.cve.join(', ')}` : '';
    findings.push({
      name,
      current: vuln.range ?? 'unknown',
      latest: 'unknown',
      type: 'dependencies',
      risk: severityMap[vuln.severity] ?? 'medium',
      riskCategory: 'vulnerable',
      breakingChanges: false,
      deprecated: false,
      reason: `${vuln.severity} vulnerability.${cves} Fix available: ${vuln.fixAvailable ? 'yes' : 'no'}`,
      latestSource: 'registry',
      observedIn: 'npm audit',
      confidence: 'high',
    });
  }

  return findings;
}

// ── Transitive conflict detection ─────────────────────────────────────────────

const FRAMEWORK_ECOSYSTEM_PACKAGES = new Set([
  '@angular/core',
  '@angular/common',
  '@angular/forms',
  '@angular/router',
  '@angular/platform-browser',
  '@angular/cdk',
  '@angular/material',
  'rxjs',
  'zone.js',
  'react',
  'react-dom',
  'react-router-dom',
]);

export interface TransitiveConflict {
  transitivePackage: string;
  transitiveVersion: string;
  parentPackage: string;
  peerRequirement: string;
  installedVersion: string;
}

export async function detectTransitiveConflicts(
  stack: StackInfo,
  targetFrameworkVersion: string,
): Promise<TransitiveConflict[]> {
  const allDeps = new Map<string, string>();
  for (const [name, ver] of Object.entries(stack.rawDependencies)) allDeps.set(name, ver);
  for (const [name, ver] of Object.entries(stack.rawDevDependencies))
    if (!allDeps.has(name)) allDeps.set(name, ver);

  const packageNames = Array.from(allDeps.keys());
  const registryData = await getPackageInfoBatch(packageNames);
  const conflicts: TransitiveConflict[] = [];

  for (const [pkgName] of allDeps) {
    const info = registryData.get(pkgName);
    if (!info?.peerDependencies) continue;

    for (const [peer, requiredRange] of Object.entries(info.peerDependencies)) {
      if (!FRAMEWORK_ECOSYSTEM_PACKAGES.has(peer)) continue;

      const installedEntry = allDeps.get(peer);
      if (!installedEntry) continue;

      const installedVersion =
        stack.resolvedVersions?.[peer] ?? installedEntry.replace(/^[\^~>=<*]+/, '');
      const coerced = semver.coerce(installedVersion);
      if (!coerced) continue;

      const targetCoerced = semver.coerce(targetFrameworkVersion);
      if (!targetCoerced) continue;

      const satisfiesTarget = semver.satisfies(targetCoerced, requiredRange, {
        includePrerelease: false,
      });
      if (!satisfiesTarget) {
        conflicts.push({
          transitivePackage: pkgName,
          transitiveVersion: info.latest,
          parentPackage: peer,
          peerRequirement: requiredRange,
          installedVersion,
        });
      }
    }
  }

  return conflicts;
}
