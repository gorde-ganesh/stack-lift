import type { RiskLevel } from '@stack-lift/shared';

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

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

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
  'angular-tippy': {
    reason: 'Unmaintained since 2019. Requires Angular ^7 — blocks any upgrade beyond Angular 7.',
    riskOverride: 'high',
  },
  'ngx-text-diff': {
    reason:
      'No releases since 2020. Uses invalid semver (rxjs ~6.3.3) and requires Angular ≤13. Unresolvable on Angular 14+.',
    riskOverride: 'high',
  },
};

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

export async function getPackageInfoBatch(
  packageNames: string[],
  concurrency = 8,
): Promise<Map<string, RegistryPackageInfo | null>> {
  const results = new Map<string, RegistryPackageInfo | null>();
  if (packageNames.length === 0) return results;

  // True sliding-window concurrency: keep `concurrency` workers running until
  // all items are consumed, so we never wait for a slow request before starting
  // the next one (unlike chunk-based Promise.all).
  const queue = [...packageNames];
  let queueIndex = 0;

  async function worker() {
    while (queueIndex < queue.length) {
      const name = queue[queueIndex++];
      if (!name) continue;
      try {
        const info = await getPackageInfo(name);
        results.set(name, info);
      } catch {
        results.set(name, null);
      }
    }
  }

  const workerCount = Math.min(concurrency, packageNames.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function clearCache(): void {
  cache.clear();
}

export interface CompatibleVersionResult {
  safeVersion: string | null;
  latest: string;
  incompatibleRange?: string;
}

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

    const targetMajor = parseInt(targetFrameworkVersion.split('.')[0] ?? '0', 10);
    let safeVersion: string | null = null;
    let incompatibleRange: string | undefined;

    for (const ver of allVersions.reverse()) {
      const vInfo = data.versions?.[ver];
      if (!vInfo || vInfo.deprecated) continue;

      const peerRange = vInfo.peerDependencies?.[frameworkPeerKey];
      if (!peerRange) {
        if (!safeVersion) safeVersion = ver;
        continue;
      }

      const rangeMin = parseInt(
        (peerRange.match(/>=\s*(\d+)/) ??
          peerRange.match(/\^(\d+)/) ??
          peerRange.match(/~(\d+)/) ??
          [])[1] ?? '0',
        10,
      );
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
