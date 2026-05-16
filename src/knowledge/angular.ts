import type { UpgradeStep } from '../types/index.js';

const ANGULAR_STEPS: Record<string, UpgradeStep> = {
  '11-12': {
    fromVersion: '11',
    toVersion: '12',
    description: 'Angular 12: Ivy default, ViewEngine deprecated, strict mode by default',
    referenceUrl: 'https://angular.dev/update-guide?v=11.0-12.0&l=3',
    breakingChanges: [
      {
        api: 'enableIvy flag',
        description: 'enableIvy option is removed from tsconfig — Ivy is now the only engine',
        automated: false,
        severity: 'medium',
        fromVersion: '11',
        toVersion: '12',
        category: 'config',
      },
      {
        api: 'i18n legacy message IDs',
        description: 'Legacy i18n message IDs are deprecated; migrate with localize-migrate',
        automated: false,
        severity: 'low',
        fromVersion: '11',
        toVersion: '12',
        category: 'config',
      },
      {
        api: 'HttpModule',
        description:
          'HttpModule from @angular/http is removed. Use HttpClientModule from @angular/common/http',
        before: "import { HttpModule } from '@angular/http';",
        after: "import { HttpClientModule } from '@angular/common/http';",
        automated: true,
        severity: 'high',
        fromVersion: '11',
        toVersion: '12',
        category: 'import',
        searchPattern: '@angular/http',
      },
    ],
    automatedFixes: 1,
    manualActions: [
      'Run: ng update @angular/core@12 @angular/cli@12',
      'Run: ng update @angular/cdk@12 @angular/material@12 (if used)',
      'Remove enableIvy: true from tsconfig if present',
      'Replace @angular/http with @angular/common/http throughout',
    ],
    npmInstall: [
      '@angular/core@12',
      '@angular/cli@12',
      '@angular/common@12',
      '@angular/forms@12',
      '@angular/router@12',
      '@angular/platform-browser@12',
      '@angular/platform-browser-dynamic@12',
      'zone.js@~0.11.4',
      'rxjs@~6.6.0',
      'typescript@~4.2.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@12', '@angular/cdk@12'], condition: '@angular/material detected' },
    ],
  },

  '12-13': {
    fromVersion: '12',
    toVersion: '13',
    description: 'Angular 13: ViewEngine removed, IE11 dropped, APF v13, persistentTsConfig',
    referenceUrl: 'https://angular.dev/update-guide?v=12.0-13.0&l=3',
    breakingChanges: [
      {
        api: 'ViewEngine',
        description: 'ViewEngine is fully removed — all code must compile with Ivy',
        automated: false,
        severity: 'high',
        fromVersion: '12',
        toVersion: '13',
        category: 'config',
      },
      {
        api: 'IE11 support',
        description: 'IE11 is no longer supported; remove IE-specific polyfills',
        automated: false,
        severity: 'medium',
        fromVersion: '12',
        toVersion: '13',
        category: 'config',
      },
      {
        api: 'TestBed.get()',
        description: 'TestBed.get() is removed. Use TestBed.inject() instead',
        before: 'const svc = TestBed.get(MyService);',
        after: 'const svc = TestBed.inject(MyService);',
        automated: true,
        severity: 'high',
        fromVersion: '12',
        toVersion: '13',
        category: 'api',
        searchPattern: 'TestBed.get(',
      },
      {
        api: 'ModuleWithProviders without generic',
        description: 'ModuleWithProviders must have an explicit generic type parameter',
        before: 'static forRoot(): ModuleWithProviders',
        after: 'static forRoot(): ModuleWithProviders<MyModule>',
        automated: false,
        severity: 'medium',
        fromVersion: '12',
        toVersion: '13',
        category: 'api',
        searchPattern: 'ModuleWithProviders',
      },
      {
        api: 'Date pipe strict ISO 8601',
        description: 'Date pipe now requires valid ISO 8601 date strings',
        automated: false,
        severity: 'low',
        fromVersion: '12',
        toVersion: '13',
        category: 'behavior',
      },
    ],
    automatedFixes: 1,
    manualActions: [
      'Run: ng update @angular/core@13 @angular/cli@13',
      'Run: ng update @angular/cdk@13 @angular/material@13 (if used)',
      'Remove IE11 entries from browserslist',
      'Remove IE11 polyfills (classlist, web-animations-js) from polyfills.ts',
      'Replace TestBed.get() with TestBed.inject()',
      'Add generic type to all ModuleWithProviders usages',
    ],
    npmInstall: [
      '@angular/core@13',
      '@angular/cli@13',
      '@angular/common@13',
      '@angular/forms@13',
      '@angular/router@13',
      'typescript@~4.4.0',
      'rxjs@~7.4.0',
      'zone.js@~0.11.4',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@13', '@angular/cdk@13'], condition: '@angular/material detected' },
    ],
  },

  '13-14': {
    fromVersion: '13',
    toVersion: '14',
    description:
      'Angular 14: Standalone components (developer preview), typed reactive forms, inject() function',
    referenceUrl: 'https://angular.dev/update-guide?v=13.0-14.0&l=3',
    breakingChanges: [
      {
        api: 'FormControl strict typing',
        description: 'Reactive forms are now strictly typed; untyped variants have Untyped prefix',
        before: 'new FormControl()',
        after: 'new FormControl<string | null>(null)  // or new UntypedFormControl()',
        automated: false,
        severity: 'high',
        fromVersion: '13',
        toVersion: '14',
        category: 'api',
        searchPattern: 'new FormControl(',
      },
      {
        api: 'RouterLinkWithHref',
        description: 'RouterLinkWithHref merged into RouterLink directive',
        automated: false,
        severity: 'low',
        fromVersion: '13',
        toVersion: '14',
        category: 'api',
      },
    ],
    automatedFixes: 0,
    manualActions: [
      'Run: ng update @angular/core@14 @angular/cli@14',
      'Run: ng update @angular/cdk@14 @angular/material@14 (if used)',
      'Migrate FormControl usages to typed forms or prefix with Untyped',
      'Remove RouterLinkWithHref imports — use RouterLink instead',
    ],
    npmInstall: [
      '@angular/core@14',
      '@angular/cli@14',
      '@angular/common@14',
      '@angular/forms@14',
      '@angular/router@14',
      'typescript@~4.6.0',
      'rxjs@~7.5.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@14', '@angular/cdk@14'], condition: '@angular/material detected' },
    ],
  },

  '14-15': {
    fromVersion: '14',
    toVersion: '15',
    description: 'Angular 15: Stable standalone APIs, directive composition API, ESM-only packages',
    referenceUrl: 'https://angular.dev/update-guide?v=14.0-15.0&l=3',
    breakingChanges: [
      {
        api: 'initialNavigation router option',
        description: "Router option 'enabled' renamed to 'enabledBlocking'",
        before: "initialNavigation: 'enabled'",
        after: "initialNavigation: 'enabledBlocking'",
        automated: true,
        severity: 'low',
        fromVersion: '14',
        toVersion: '15',
        category: 'config',
        searchPattern: "initialNavigation: 'enabled'",
      },
      {
        api: 'DATE_PIPE_DEFAULT_TIMEZONE',
        description: 'DATE_PIPE_DEFAULT_TIMEZONE token replaced by DATE_PIPE_DEFAULT_OPTIONS',
        automated: false,
        severity: 'low',
        fromVersion: '14',
        toVersion: '15',
        category: 'api',
        searchPattern: 'DATE_PIPE_DEFAULT_TIMEZONE',
      },
      {
        api: 'ESM-only Angular packages',
        description:
          'Angular packages are now ESM-only; CommonJS projects need build tooling adjustment',
        automated: false,
        severity: 'medium',
        fromVersion: '14',
        toVersion: '15',
        category: 'config',
      },
    ],
    automatedFixes: 1,
    manualActions: [
      'Run: ng update @angular/core@15 @angular/cli@15',
      'Run: ng update @angular/cdk@15 @angular/material@15 (if used) — note: Angular Material 15 is the MDC migration; expect component API changes',
      "Replace 'enabled' with 'enabledBlocking' in router initialNavigation option",
      'Replace DATE_PIPE_DEFAULT_TIMEZONE with DATE_PIPE_DEFAULT_OPTIONS',
    ],
    npmInstall: [
      '@angular/core@15',
      '@angular/cli@15',
      '@angular/common@15',
      '@angular/forms@15',
      '@angular/router@15',
      'typescript@~4.8.0',
      'rxjs@~7.5.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@15', '@angular/cdk@15'], condition: '@angular/material detected' },
    ],
  },

  '15-16': {
    fromVersion: '15',
    toVersion: '16',
    description:
      'Angular 16: Signals (developer preview), required inputs, inject() in guards/resolvers',
    referenceUrl: 'https://angular.dev/update-guide?v=15.0-16.0&l=3',
    breakingChanges: [
      {
        api: 'CanActivate / CanDeactivate functional guards',
        description: 'Class-based guards are deprecated; migrate to functional guards',
        before: '@Injectable()\nexport class AuthGuard implements CanActivate { canActivate() {} }',
        after: 'export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn();',
        automated: false,
        severity: 'medium',
        fromVersion: '15',
        toVersion: '16',
        category: 'api',
        searchPattern: 'implements CanActivate',
      },
      {
        api: 'ngcc',
        description: 'ngcc (Angular Compatibility Compiler) is removed',
        automated: false,
        severity: 'low',
        fromVersion: '15',
        toVersion: '16',
        category: 'config',
      },
    ],
    automatedFixes: 0,
    manualActions: [
      'Run: ng update @angular/core@16 @angular/cli@16',
      'Run: ng update @angular/cdk@16 @angular/material@16 (if used)',
      'Migrate class-based guards to functional guards',
      'Remove ngcc postinstall script from package.json if present',
    ],
    npmInstall: [
      '@angular/core@16',
      '@angular/cli@16',
      '@angular/common@16',
      '@angular/forms@16',
      '@angular/router@16',
      'typescript@~5.0.0',
      'rxjs@~7.8.0',
      'zone.js@~0.13.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@16', '@angular/cdk@16'], condition: '@angular/material detected' },
    ],
  },

  '16-17': {
    fromVersion: '16',
    toVersion: '17',
    description:
      'Angular 17: Built-in control flow (@if, @for, @switch), deferrable views (@defer), new project defaults',
    referenceUrl: 'https://angular.dev/update-guide?v=16.0-17.0&l=3',
    breakingChanges: [
      {
        api: '*ngIf structural directive',
        description: 'New built-in @if replaces *ngIf (old syntax still works but is legacy)',
        before: '<div *ngIf="condition">...</div>',
        after: '@if (condition) { <div>...</div> }',
        automated: true,
        severity: 'low',
        fromVersion: '16',
        toVersion: '17',
        category: 'syntax',
        searchPattern: '*ngIf',
      },
      {
        api: '*ngFor structural directive',
        description: 'New built-in @for replaces *ngFor; requires track expression',
        before: '<li *ngFor="let item of items">{{ item }}</li>',
        after: '@for (item of items; track item.id) { <li>{{ item }}</li> }',
        automated: true,
        severity: 'low',
        fromVersion: '16',
        toVersion: '17',
        category: 'syntax',
        searchPattern: '*ngFor',
      },
      {
        api: '*ngSwitch structural directive',
        description: 'New built-in @switch replaces *ngSwitch',
        before: '<div [ngSwitch]="value"><span *ngSwitchCase="\'a\'">A</span></div>',
        after: "@switch (value) { @case ('a') { <span>A</span> } }",
        automated: true,
        severity: 'low',
        fromVersion: '16',
        toVersion: '17',
        category: 'syntax',
        searchPattern: 'ngSwitch',
      },
      {
        api: 'BrowserModule.withServerTransition',
        description: 'BrowserModule.withServerTransition is deprecated',
        automated: false,
        severity: 'low',
        fromVersion: '16',
        toVersion: '17',
        category: 'api',
        searchPattern: 'withServerTransition',
      },
    ],
    automatedFixes: 3,
    manualActions: [
      'Run: ng update @angular/core@17 @angular/cli@17',
      'Optionally run the control-flow migration: ng g @angular/core:control-flow',
      'Add track expression to all @for blocks',
    ],
    npmInstall: [
      '@angular/core@17',
      '@angular/cli@17',
      '@angular/common@17',
      '@angular/forms@17',
      '@angular/router@17',
      'typescript@~5.2.0',
      'rxjs@~7.8.0',
      'zone.js@~0.14.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@17', '@angular/cdk@17'], condition: '@angular/material detected' },
    ],
  },

  '17-18': {
    fromVersion: '17',
    toVersion: '18',
    description: 'Angular 18: Stable control flow, experimental zoneless, material 3 stable',
    referenceUrl: 'https://angular.dev/update-guide?v=17.0-18.0&l=3',
    breakingChanges: [
      {
        api: 'zone.js optional',
        description:
          'Experimental zoneless change detection is available via provideExperimentalZonelessChangeDetection()',
        automated: false,
        severity: 'low',
        fromVersion: '17',
        toVersion: '18',
        category: 'config',
      },
      {
        api: 'RedirectCommand',
        description: 'Router guards can now return RedirectCommand for typed redirects',
        automated: false,
        severity: 'low',
        fromVersion: '17',
        toVersion: '18',
        category: 'api',
      },
    ],
    automatedFixes: 0,
    manualActions: [
      'Run: ng update @angular/core@18 @angular/cli@18',
      'Run: ng update @angular/cdk@18 @angular/material@18 (if used)',
    ],
    npmInstall: [
      '@angular/core@18',
      '@angular/cli@18',
      '@angular/common@18',
      '@angular/forms@18',
      '@angular/router@18',
      'typescript@~5.4.0',
      'rxjs@~7.8.0',
      'zone.js@~0.14.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@18', '@angular/cdk@18'], condition: '@angular/material detected — Angular Material 18 includes stable Material 3 theme support' },
    ],
  },

  '18-19': {
    fromVersion: '18',
    toVersion: '19',
    description:
      'Angular 19: Stable signal APIs, incremental hydration (developer preview), route-level render mode, @let template variables',
    referenceUrl: 'https://angular.dev/update-guide?v=18.0-19.0&l=3',
    breakingChanges: [
      {
        api: 'afterRender phase API renamed',
        description:
          'afterRender hook phase constants renamed: EarlyRead → Read, Write → Write, MixedReadWrite → MixedReadWrite (verify with ng update schematic)',
        automated: false,
        severity: 'low',
        fromVersion: '18',
        toVersion: '19',
        category: 'api',
        searchPattern: 'AfterRenderPhase',
      },
      {
        api: 'provideHttpClient(withFetch())',
        description:
          'withFetch() is now the default for Angular 19 new projects; existing projects are unaffected unless explicitly relying on XHR behavior differences',
        automated: false,
        severity: 'low',
        fromVersion: '18',
        toVersion: '19',
        category: 'config',
        searchPattern: 'provideHttpClient',
      },
      {
        api: 'standalone: true is default',
        description:
          'New components generated by the CLI are standalone by default; existing NgModule-based components are unchanged',
        automated: false,
        severity: 'low',
        fromVersion: '18',
        toVersion: '19',
        category: 'config',
      },
    ],
    automatedFixes: 0,
    manualActions: [
      'Run: ng update @angular/core@19 @angular/cli@19',
      'Run: ng update @angular/cdk@19 @angular/material@19 (if used)',
      'Review afterRender() usages if using phase-specific hooks',
      'Verify HttpClient behavior if your app relies on XHR-specific features (cookies, withCredentials)',
    ],
    npmInstall: [
      '@angular/core@19',
      '@angular/cli@19',
      '@angular/common@19',
      '@angular/forms@19',
      '@angular/router@19',
      'typescript@~5.6.0',
      'rxjs@~7.8.0',
      'zone.js@~0.15.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@19', '@angular/cdk@19'], condition: '@angular/material detected' },
    ],
  },

  '19-20': {
    fromVersion: '19',
    toVersion: '20',
    description:
      'Angular 20: Stable incremental hydration, stable resource API, signal-based forms (developer preview)',
    referenceUrl: 'https://angular.dev/update-guide?v=19.0-20.0&l=3',
    breakingChanges: [
      {
        api: 'ReflectiveInjector removed',
        description:
          'ReflectiveInjector was deprecated since Angular 8 and is fully removed in v20. Use Injector.create() instead.',
        before: 'ReflectiveInjector.resolveAndCreate([MyService])',
        after: 'Injector.create({ providers: [{ provide: MyService }] })',
        automated: false,
        severity: 'high',
        fromVersion: '19',
        toVersion: '20',
        category: 'api',
        searchPattern: 'ReflectiveInjector',
      },
      {
        api: 'TestBed.configureTestingModule deprecations enforced',
        description:
          'Several deprecated TestBed APIs from v12–v15 emit hard errors in v20 where they previously warned',
        automated: false,
        severity: 'medium',
        fromVersion: '19',
        toVersion: '20',
        category: 'api',
        searchPattern: 'TestBed',
      },
    ],
    automatedFixes: 0,
    manualActions: [
      'Run: ng update @angular/core@20 @angular/cli@20',
      'Run: ng update @angular/cdk@20 @angular/material@20 (if used)',
      'Search for ReflectiveInjector and migrate to Injector.create()',
      'Run ng build and ng test after upgrade; address any newly-hard errors from deprecated APIs',
    ],
    npmInstall: [
      '@angular/core@20',
      '@angular/cli@20',
      '@angular/common@20',
      '@angular/forms@20',
      '@angular/router@20',
      'typescript@~5.8.0',
      'rxjs@~7.8.0',
      'zone.js@~0.15.0',
    ],
    conditionalNpmInstall: [
      { packages: ['@angular/material@20', '@angular/cdk@20'], condition: '@angular/material detected' },
    ],
  },
};

export function getAngularUpgradeSteps(from: string, to: string): UpgradeStep[] {
  const fromMajor = parseInt(from.split('.')[0] ?? '0', 10);
  const toMajor = parseInt(to.split('.')[0] ?? '0', 10);

  const steps: UpgradeStep[] = [];
  for (let v = fromMajor; v < toMajor; v++) {
    const key = `${v}-${v + 1}`;
    if (ANGULAR_STEPS[key]) {
      steps.push(ANGULAR_STEPS[key]);
    }
  }
  return steps;
}

export function getAngularLatestVersion(): string {
  return '20';
}

export const ANGULAR_SUPPORTED_VERSIONS = [
  '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
];
