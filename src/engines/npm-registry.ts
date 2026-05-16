import type { RiskLevel } from '../types/index.js';

export interface RegistryPackageInfo {
  name: string;
  latest: string;
  deprecated?: string;
  hasBreakingChanges: boolean;
  riskOverride?: RiskLevel;
  /** peerDependencies declared by the latest published version. */
  peerDependencies?: Record<string, string>;
}

interface CacheEntry {
  info: RegistryPackageInfo;
  fetchedAt: number;
}

// In-process cache — valid for 5 minutes per session
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

// Packages whose deprecation/risk we always know regardless of registry
const KNOWN_DEPRECATED: Record<string, { reason: string; riskOverride: RiskLevel }> = {
  '@angular/http': {
    reason: 'Removed in Angular 8. Use @angular/common/http.',
    riskOverride: 'critical',
  },
  tslint: {
    reason: 'Deprecated Jan 2020. Migrate to ESLint + @typescript-eslint.',
    riskOverride: 'high',
  },
  codelyzer: { reason: 'Deprecated. Use angular-eslint instead.', riskOverride: 'high' },
  'node-sass': { reason: 'Deprecated. Use sass (Dart Sass) instead.', riskOverride: 'high' },
  'babel-core': { reason: 'Replaced by @babel/core (Babel 7).', riskOverride: 'critical' },
  'react-scripts': {
    reason: 'Create React App is unmaintained. Migrate to Vite or Next.js.',
    riskOverride: 'high',
  },
  moment: {
    reason: 'Moment.js is in maintenance-only mode. Consider date-fns or day.js.',
    riskOverride: 'medium',
  },
  request: { reason: 'Deprecated Feb 2020. Use node-fetch, got, or axios.', riskOverride: 'high' },
};

// Packages known to have breaking changes between majors
const KNOWN_BREAKING = new Set([
  '@angular/core',
  '@angular/common',
  '@angular/forms',
  '@angular/router',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic',
  '@angular/compiler',
  '@angular/cli',
  '@angular/cdk',
  '@angular/material',
  '@nguniversal/express-engine',
  'react',
  'react-dom',
  'react-router',
  'react-router-dom',
  'next',
  'nuxt',
  'vue',
  'typescript',
  'webpack',
  'webpack-cli',
  'vite',
  'rxjs',
  'jest',
  '@jest/core',
]);

async function fetchFromRegistry(packageName: string): Promise<RegistryPackageInfo | null> {
  const encoded = encodeURIComponent(packageName).replace('%40', '@').replace('%2F', '/');
  const url = `https://registry.npmjs.org/${encoded}/latest`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      name: string;
      version: string;
      deprecated?: string;
      peerDependencies?: Record<string, string>;
    };

    const knownDep = KNOWN_DEPRECATED[packageName];
    const deprecated = data.deprecated ?? knownDep?.reason;
    const riskOverride = knownDep?.riskOverride;
    return {
      name: data.name,
      latest: data.version,
      ...(deprecated ? { deprecated } : {}),
      hasBreakingChanges: KNOWN_BREAKING.has(packageName),
      ...(riskOverride ? { riskOverride } : {}),
      ...(data.peerDependencies ? { peerDependencies: data.peerDependencies } : {}),
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Fetch package info from the npm registry with in-process caching.
 * Falls back to locally-known metadata if the registry is unreachable.
 */
export async function getPackageInfo(packageName: string): Promise<RegistryPackageInfo | null> {
  const cached = cache.get(packageName);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.info;
  }

  const info = await fetchFromRegistry(packageName);
  if (info) {
    cache.set(packageName, { info, fetchedAt: Date.now() });
    return info;
  }

  // Offline fallback: if we know it's deprecated, surface that even without registry
  const knownDep = KNOWN_DEPRECATED[packageName];
  if (knownDep) {
    return {
      name: packageName,
      latest: 'unknown',
      deprecated: knownDep.reason,
      hasBreakingChanges: KNOWN_BREAKING.has(packageName),
      riskOverride: knownDep.riskOverride,
    };
  }

  return null;
}

/**
 * Fetch info for multiple packages concurrently, respecting a concurrency cap.
 */
export async function getPackageInfoBatch(
  packageNames: string[],
  concurrency = 8,
): Promise<Map<string, RegistryPackageInfo | null>> {
  const results = new Map<string, RegistryPackageInfo | null>();
  const chunks: string[][] = [];

  for (let i = 0; i < packageNames.length; i += concurrency) {
    chunks.push(packageNames.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const settled = await Promise.allSettled(
      chunk.map(async (name) => ({ name, info: await getPackageInfo(name) })),
    );
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        results.set(r.value.name, r.value.info);
      }
    }
  }

  return results;
}

export function clearCache(): void {
  cache.clear();
}

export interface CompatibleVersionResult {
  /** Latest version whose peerDependencies are compatible with the target framework. */
  safeVersion: string | null;
  /** Absolute latest version on npm (may not be compatible). */
  latest: string;
  /** The peerDep range that blocks a higher version (if safeVersion < latest). */
  incompatibleRange?: string;
}

/**
 * Find the latest version of a package that is compatible with the target framework version.
 * Queries the full package metadata (all versions) from npm to check peerDependencies.
 * Example: resolveCompatibleVersion('primeng', '@angular/core', '14') returns primeng@14.x
 * even though primeng@17+ is on npm, because primeng@17 requires @angular/core >=16.
 */
export async function resolveCompatibleVersion(
  packageName: string,
  frameworkPeerKey: string,
  targetFrameworkVersion: string,
): Promise<CompatibleVersionResult> {
  const encoded = encodeURIComponent(packageName).replace('%40', '@').replace('%2F', '/');
  const url = `https://registry.npmjs.org/${encoded}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { safeVersion: null, latest: 'unknown' };

    const data = (await res.json()) as {
      'dist-tags'?: { latest?: string };
      versions?: Record<string, { peerDependencies?: Record<string, string>; deprecated?: string }>;
    };

    const latestTag = data['dist-tags']?.latest ?? 'unknown';
    const allVersions = Object.keys(data.versions ?? {});

    // Sort versions descending — find the highest version that satisfies the target peer constraint
    const targetMajor = parseInt(targetFrameworkVersion.split('.')[0] ?? '0', 10);
    let safeVersion: string | null = null;
    let incompatibleRange: string | undefined;

    for (const ver of allVersions.reverse()) {
      const vInfo = data.versions?.[ver];
      if (!vInfo || vInfo.deprecated) continue;

      const peerRange = vInfo.peerDependencies?.[frameworkPeerKey];
      if (!peerRange) {
        // No peer constraint — compatible
        if (!safeVersion) safeVersion = ver;
        continue;
      }

      // Check if our target major satisfies the peer range
      const rangeMin = parseInt((peerRange.match(/>=\s*(\d+)/) ?? peerRange.match(/\^(\d+)/) ?? peerRange.match(/~(\d+)/) ?? [])[1] ?? '0', 10);
      const rangeMax = parseInt((peerRange.match(/<\s*(\d+)/) ?? [])[1] ?? '999', 10);

      if (targetMajor >= rangeMin && targetMajor < rangeMax) {
        if (!safeVersion) safeVersion = ver;
      } else if (!safeVersion) {
        incompatibleRange = peerRange;
      }
    }

    return { safeVersion, latest: latestTag, ...(incompatibleRange ? { incompatibleRange } : {}) };
  } catch {
    clearTimeout(timer);
    return { safeVersion: null, latest: 'unknown' };
  }
}
