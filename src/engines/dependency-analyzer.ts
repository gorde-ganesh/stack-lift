import semver from 'semver';
import type { StackInfo, DependencyInfo, RiskLevel } from '../types/index.js';

interface KnownDependency {
  latest: string;
  deprecated?: boolean;
  deprecatedReason?: string;
  hasBreakingChanges?: boolean;
  riskOverride?: RiskLevel;
}

const KNOWN_PACKAGES: Record<string, KnownDependency> = {
  // Angular ecosystem
  '@angular/core': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/common': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/forms': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/router': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/platform-browser': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/platform-browser-dynamic': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/compiler': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/cli': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/cdk': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/material': { latest: '18.0.0', hasBreakingChanges: true },
  '@angular/http': { latest: '7.2.16', deprecated: true, deprecatedReason: 'Use @angular/common/http instead', riskOverride: 'critical' },
  '@nguniversal/express-engine': { latest: '16.2.0', hasBreakingChanges: true },

  // React ecosystem
  'react': { latest: '19.0.0', hasBreakingChanges: true },
  'react-dom': { latest: '19.0.0', hasBreakingChanges: true },
  'react-scripts': { latest: '5.0.1', deprecated: true, deprecatedReason: 'Create React App is no longer maintained; migrate to Vite or Next.js', riskOverride: 'high' },
  'react-router': { latest: '6.26.0', hasBreakingChanges: true },
  'react-router-dom': { latest: '6.26.0', hasBreakingChanges: true },

  // TypeScript
  'typescript': { latest: '5.4.5', hasBreakingChanges: true },

  // Build tools
  'webpack': { latest: '5.91.0', hasBreakingChanges: true },
  'webpack-cli': { latest: '5.1.4', hasBreakingChanges: true },
  'vite': { latest: '5.2.0', hasBreakingChanges: true },
  'babel-core': { latest: '6.26.3', deprecated: true, deprecatedReason: 'Use @babel/core instead', riskOverride: 'critical' },
  '@babel/core': { latest: '7.24.0' },

  // RxJS
  'rxjs': { latest: '7.8.1', hasBreakingChanges: true },

  // Testing
  'jest': { latest: '29.7.0', hasBreakingChanges: true },
  '@types/jest': { latest: '29.5.12' },
  'karma': { latest: '6.4.3', hasBreakingChanges: false },

  // Utilities
  'zone.js': { latest: '0.14.4' },
  'tslib': { latest: '2.6.2' },
  'core-js': { latest: '3.37.0' },
  'lodash': { latest: '4.17.21' },
  'moment': { latest: '2.30.1', deprecated: true, deprecatedReason: 'Moment.js is in maintenance mode; consider date-fns or day.js', riskOverride: 'medium' },
  'node-sass': { latest: '9.0.0', deprecated: true, deprecatedReason: 'node-sass is deprecated; use sass (Dart Sass) instead', riskOverride: 'high' },
  'tslint': { latest: '6.1.3', deprecated: true, deprecatedReason: 'TSLint is deprecated; migrate to ESLint with @typescript-eslint', riskOverride: 'high' },
  'codelyzer': { latest: '6.0.2', deprecated: true, deprecatedReason: 'Codelyzer is deprecated; use angular-eslint instead', riskOverride: 'high' },

  // Node
  'express': { latest: '4.19.2', hasBreakingChanges: false },
};

function stripRange(version: string): string {
  return version.replace(/^[\^~>=<*]+/, '').split(' ')[0].split('-')[0];
}

function classifyRisk(current: string, latest: string, info: KnownDependency): RiskLevel {
  if (info.riskOverride) return info.riskOverride;
  if (info.deprecated) return 'high';

  const currentClean = stripRange(current);
  const latestClean = latest;

  try {
    const currentMajor = semver.major(semver.coerce(currentClean) ?? currentClean);
    const latestMajor = semver.major(semver.coerce(latestClean) ?? latestClean);
    const majorDiff = latestMajor - currentMajor;

    if (majorDiff >= 3) return 'high';
    if (majorDiff >= 1) return info.hasBreakingChanges ? 'medium' : 'low';
    return 'low';
  } catch {
    return 'medium';
  }
}

export function analyzeDependencies(stack: StackInfo): DependencyInfo[] {
  const results: DependencyInfo[] = [];

  const process = (deps: Record<string, string>, type: 'dependencies' | 'devDependencies') => {
    for (const [name, version] of Object.entries(deps)) {
      const info = KNOWN_PACKAGES[name];
      if (!info) continue;

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

      if (!isOutdated && !info.deprecated) continue;

      results.push({
        name,
        current,
        latest,
        type,
        risk: classifyRisk(current, latest, info),
        breakingChanges: info.hasBreakingChanges ?? false,
        deprecated: info.deprecated ?? false,
        reason: info.deprecatedReason,
      });
    }
  };

  process(stack.rawDependencies, 'dependencies');
  process(stack.rawDevDependencies, 'devDependencies');

  return results.sort((a, b) => {
    const order: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
    return order.indexOf(a.risk) - order.indexOf(b.risk);
  });
}
