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

  '@angular/flex-layout': {
    deprecated: '@angular/flex-layout',
    reason: '@angular/flex-layout is archived and no longer maintained. CSS Grid/Flexbox has native browser support.',
    alternatives: [
      {
        name: 'CSS Grid + Flexbox (native)',
        description: 'Remove the library and use native CSS layout — no runtime cost',
        apiSimilarity: 'low',
        migrationEffort: 'high',
        notes: 'Largest disruption but removes a runtime dependency entirely',
      },
      {
        name: '@ngbracket/ngx-layout',
        description: 'Community fork of @angular/flex-layout, API-compatible',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        notes: 'Drop-in replacement for minimal effort migration',
      },
      {
        name: 'tailwindcss',
        description: 'Utility-first CSS framework — popular alternative for layout',
        apiSimilarity: 'low',
        migrationEffort: 'high',
        bundleNote: 'PurgeCSS keeps bundle small in prod',
      },
    ],
    skipOption: 'Keep @angular/flex-layout temporarily (it still works but is unmaintained)',
  },

  karma: {
    deprecated: 'karma',
    reason: 'Karma has reached end-of-life (deprecated in 2023). Angular CLI migrated to Web Test Runner for new projects.',
    alternatives: [
      {
        name: '@web/test-runner',
        description: 'Angular team recommendation — runs tests in real browsers via Playwright',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        notes: 'Run: ng add @angular-devkit/build-angular@latest for migration schematic',
      },
      {
        name: 'jest',
        description: 'Popular choice with excellent TypeScript support and jsdom',
        apiSimilarity: 'low',
        migrationEffort: 'medium',
        bundleNote: 'Faster than Karma/Jasmine for most setups',
      },
      {
        name: 'vitest',
        description: 'Vite-native test runner, very fast, Jest-compatible API',
        apiSimilarity: 'low',
        migrationEffort: 'medium',
        notes: 'Best for Vite-based Angular projects',
      },
    ],
    skipOption: 'Keep Karma temporarily (tests still pass)',
  },

  'jasmine-core': {
    deprecated: 'jasmine-core',
    reason: 'Jasmine/Karma stack is being phased out in Angular projects in favour of Web Test Runner + Jasmine or Jest.',
    alternatives: [
      {
        name: 'jest',
        description: 'Compatible assertion API, widely adopted, excellent TypeScript support',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        notes: 'Jasmine assertions map closely to Jest expect()',
      },
      {
        name: '@web/test-runner + jasmine',
        description: 'Keep Jasmine assertions but run in real browsers via Web Test Runner',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        notes: 'Minimal code change — just swap the test runner',
      },
    ],
    skipOption: 'Keep jasmine-core (still works with @web/test-runner)',
  },

  lodash: {
    deprecated: 'lodash',
    reason: 'Lodash is not deprecated but ships 70KB+ by default. Native JS and smaller alternatives now cover most use cases.',
    alternatives: [
      {
        name: 'Native JS (Array/Object methods)',
        description: 'ES2022+ covers map, filter, reduce, flat, Object.entries — no dependency',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        bundleNote: 'Zero bundle cost',
        notes: 'Check caniuse.com for Node version compatibility',
      },
      {
        name: 'lodash-es',
        description: 'ESM version of lodash — tree-shakeable',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        bundleNote: 'Tree-shakeable — only ships used functions',
        notes: 'Import specific functions: import { debounce } from "lodash-es"',
      },
      {
        name: 'remeda',
        description: 'TypeScript-first functional utilities, tree-shakeable',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        bundleNote: 'Significantly smaller than lodash',
      },
    ],
    skipOption: 'Keep lodash (acceptable if tree-shaking is configured)',
  },

  jquery: {
    deprecated: 'jquery',
    reason: 'jQuery is not deprecated, but in modern Angular/React/Vue projects it adds weight and conflicts with the framework\'s change detection.',
    alternatives: [
      {
        name: 'Native DOM APIs',
        description: 'document.querySelector, fetch, classList — cover 90% of jQuery usage natively',
        apiSimilarity: 'low',
        migrationEffort: 'high',
        bundleNote: 'Zero bundle cost',
      },
      {
        name: 'Framework-native patterns',
        description: 'Use Angular @ViewChild / React refs / Vue $refs instead of DOM queries',
        apiSimilarity: 'low',
        migrationEffort: 'high',
        notes: 'Correct approach for SPA frameworks — avoids change detection conflicts',
      },
    ],
    skipOption: 'Keep jQuery temporarily (remove incrementally)',
  },

  '@angular-material-components/datetime-picker': {
    deprecated: '@angular-material-components/datetime-picker',
    reason: '@angular-material-components/datetime-picker is abandoned and incompatible with Angular 17+.',
    alternatives: [
      {
        name: '@dhutaryan/ngx-mat-timepicker',
        description: 'Actively maintained Angular Material time picker, compatible with Angular 17+',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        notes: 'Estimated changes: 3–5 component files',
      },
      {
        name: 'Angular Material Datepicker + manual time input',
        description: 'Use built-in Angular Material datepicker with a native time <input type="time">',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        notes: 'No third-party dependency required',
      },
      {
        name: '@angular/cdk + custom time component',
        description: 'Build a time picker using Angular CDK overlays',
        apiSimilarity: 'low',
        migrationEffort: 'high',
        notes: 'Most control, highest effort',
      },
    ],
    skipOption: 'Keep datetime-picker temporarily (patch Angular peer dep if needed)',
  },

  'rxjs-compat': {
    deprecated: 'rxjs-compat',
    reason: 'rxjs-compat was a bridge for RxJS 5 → 6. RxJS 7+ has no compat layer — code must use pipeable operators.',
    alternatives: [
      {
        name: 'rxjs (pipeable operators)',
        description: 'Migrate to rxjs 7 pipeable operator syntax — no compat layer needed',
        apiSimilarity: 'medium',
        migrationEffort: 'medium',
        notes: 'Run: npx rxjs-tslint-rules to find usage patterns',
      },
    ],
    skipOption: 'Keep rxjs-compat temporarily (blocks RxJS 7+ upgrade)',
  },

  'zone.js': {
    deprecated: 'zone.js',
    reason: 'zone.js is not deprecated but Angular 18 introduces experimental zoneless mode as a superior alternative for performance.',
    alternatives: [
      {
        name: 'Angular zoneless (experimental)',
        description: 'provideExperimentalZonelessChangeDetection() — better performance, simpler debugging',
        apiSimilarity: 'low',
        migrationEffort: 'high',
        notes: 'Requires Angular 18+ and converting all components to signals or OnPush',
      },
    ],
    skipOption: 'Keep zone.js (stable, recommended for most projects)',
  },

  'classnames': {
    deprecated: 'classnames',
    reason: 'classnames is maintained but clsx offers a smaller, faster, TypeScript-native alternative.',
    alternatives: [
      {
        name: 'clsx',
        description: 'Drop-in replacement, 3× smaller, TypeScript-first',
        apiSimilarity: 'high',
        migrationEffort: 'low',
        bundleNote: '0.6KB vs 2KB',
        notes: 'API is identical — just change the import',
      },
    ],
    skipOption: 'Keep classnames (still maintained, no security risk)',
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
