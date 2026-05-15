import type { ReplacementEntry } from '../types/index.js';

/**
 * Known replacement options for deprecated / maintenance-mode packages.
 * Each entry drives the interactive replacement picker in the migrate flow.
 */
export const PACKAGE_REPLACEMENTS: Record<string, ReplacementEntry> = {
  moment: {
    deprecated: 'moment',
    reason: 'Moment.js is in maintenance-only mode — no new features, 72KB gzipped.',
    alternatives: [
      {
        name: 'dayjs',
        description: 'Moment-compatible API, ~2KB gzipped',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        bundleNote: '2KB vs 72KB',
        notes: 'Add dayjs/plugin/... for advanced features',
      },
      {
        name: 'date-fns',
        description: 'Functional, tree-shakeable — import only what you use',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        bundleNote: 'Tree-shakeable',
      },
      {
        name: 'luxon',
        description: 'Strong IANA timezone and Intl support',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        notes: 'Best for apps with complex timezone requirements',
      },
    ],
    skipOption: 'Keep moment for now (address later)',
  },

  protractor: {
    deprecated: 'protractor',
    reason: 'Protractor was deprecated by the Angular team in 2021 and removed from the CLI.',
    alternatives: [
      {
        name: '@playwright/test',
        description: 'Cross-browser, fast, officially recommended by Angular',
        apiSimilarity: 'low',
        migrationEffort: 'medium',
        notes: 'Angular docs now use Playwright examples',
      },
      {
        name: 'cypress',
        description: 'Developer-friendly visual test runner, large community',
        apiSimilarity: 'low',
        migrationEffort: 'medium',
      },
      {
        name: 'webdriverio',
        description: 'WebDriver-based — most similar to Protractor\'s model',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        notes: 'Easiest migration path from Protractor',
      },
    ],
    skipOption: 'Keep existing Protractor tests temporarily (tech debt)',
  },

  codelyzer: {
    deprecated: 'codelyzer',
    reason: 'Codelyzer is deprecated. The Angular team officially migrated to angular-eslint.',
    alternatives: [
      {
        name: '@angular-eslint/eslint-plugin',
        description: 'Official replacement — drop-in for most codelyzer rules',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        notes: 'Run: ng add @angular-eslint/schematics',
      },
    ],
    skipOption: 'Keep codelyzer temporarily',
  },

  tslint: {
    deprecated: 'tslint',
    reason: 'TSLint was deprecated in January 2020. ESLint + typescript-eslint covers all rules.',
    alternatives: [
      {
        name: 'eslint + @typescript-eslint/eslint-plugin',
        description: 'Official replacement; use tslint-to-eslint-config for automatic rule migration',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        notes: 'Run: npx tslint-to-eslint-config to migrate rules',
      },
    ],
    skipOption: 'Keep tslint temporarily',
  },

  'node-sass': {
    deprecated: 'node-sass',
    reason: 'node-sass (LibSass) is deprecated. Dart Sass is the reference implementation.',
    alternatives: [
      {
        name: 'sass',
        description: 'Dart Sass — the reference implementation, drop-in replacement',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        bundleNote: 'Drop-in replacement — just change the package name',
      },
    ],
    skipOption: 'Keep node-sass temporarily',
  },

  'react-scripts': {
    deprecated: 'react-scripts',
    reason: 'Create React App (react-scripts) is unmaintained as of 2023.',
    alternatives: [
      {
        name: 'vite',
        description: 'Fast modern build tool — CRA to Vite migration is well-documented',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        bundleNote: 'Significantly faster HMR and builds',
      },
      {
        name: 'next.js',
        description: 'Full-stack framework with SSR/SSG, routing, and API routes',
        apiSimilarity: 'low',
        migrationEffort: 'high',
        notes: 'Only choose if you need SSR or full-stack capabilities',
      },
    ],
    skipOption: 'Keep react-scripts temporarily',
  },

  request: {
    deprecated: 'request',
    reason: 'The `request` package was deprecated in February 2020.',
    alternatives: [
      {
        name: 'axios',
        description: 'Promise-based HTTP client, works in browser and Node',
        apiSimilarity: 'medium',
        migrationEffort: 'low',
      },
      {
        name: 'got',
        description: 'Modern Node-only HTTP client with excellent TypeScript support',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
      },
      {
        name: 'node-fetch',
        description: 'Fetch API for Node — or use native fetch (Node 18+)',
        apiSimilarity: 'low',
        migrationEffort: 'medium',
        notes: 'If you are on Node 18+, native fetch may be enough',
      },
    ],
    skipOption: 'Keep request temporarily',
  },

  '@babel/core': {
    deprecated: '@babel/core',
    reason: 'Using old babel-core (v6). The current package is @babel/core (v7+).',
    alternatives: [
      {
        name: '@babel/core',
        description: 'Direct upgrade — Babel 7 is the current stable release',
        apiSimilarity: 'high',
        migrationEffort: 'medium',
        notes: 'Also rename babel-preset-* and babel-plugin-* to @babel/preset-* and @babel/plugin-*',
      },
    ],
    skipOption: 'Keep babel-core temporarily',
  },
};

/** Returns the replacement entry for a package name, or undefined if not known. */
export function getReplacementEntry(packageName: string): ReplacementEntry | undefined {
  return PACKAGE_REPLACEMENTS[packageName];
}

/** Returns all package names that have known replacements. */
export function getKnownDeprecatedPackages(): string[] {
  return Object.keys(PACKAGE_REPLACEMENTS);
}
