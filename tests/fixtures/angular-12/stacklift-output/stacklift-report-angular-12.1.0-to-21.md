# Upgrade Report: Angular 12 → 21

> Generated: 2026-05-19T13:25:34.733Z

---

## Evidence Sources

| Source | Status |
|--------|--------|
| package.json | ✅ Read directly |
| Lockfile (resolved versions) | ✅ Lockfile parsed — installed versions are exact. |
| tsconfig.json | ⚠️ tsconfig.json not found. |
| npm registry (latest versions) | ✅ Live query at report generation time |
| Breaking change catalogue | ℹ️ Inferred from static knowledge base — verify against official migration guide |

## Summary

| | |
|---|---|
| **Framework** | Angular 12.1.0 |
| **Target** | Angular 21 |
| **TypeScript** | 4.2.3 |
| **Build tool** | Angular CLI |
| **Package manager** | npm |
| **Strategy** | Incremental (9 steps) |
| **Risk level** | 🔴 CRITICAL |
| **Estimated effort** | 1–2 weeks |
| **Effort basis** | 24 catalogued breaking changes, 35 manual actions across 9 hop(s) — does not account for test coverage or CI complexity |
| **Breaking changes** | 24 (2 auto-fixable) |
| **Migration rules** | 2 automatable, 13 assisted, 9 advisory |

## Upgrade Path

1. **v12 → v13** — Angular 13: ViewEngine removed, IE11 dropped, APF v13, persistentTsConfig
2. **v13 → v14** — Angular 14: Standalone components (developer preview), typed reactive forms, inject() function
3. **v14 → v15** — Angular 15: Stable standalone APIs, directive composition API, ESM-only packages
4. **v15 → v16** — Angular 16: Signals (developer preview), required inputs, inject() in guards/resolvers
5. **v16 → v17** — Angular 17: Built-in control flow (@if, @for, @switch), deferrable views (@defer), new project defaults
6. **v17 → v18** — Angular 18: Stable control flow, experimental zoneless, material 3 stable
7. **v18 → v19** — Angular 19: Stable signal APIs, incremental hydration (developer preview), route-level render mode, @let template variables
8. **v19 → v20** — Angular 20: Stable incremental hydration, stable resource API, signal-based forms (developer preview)
9. **v20 → v21** — Angular 21: framework, CLI, Material/CDK, TypeScript and ecosystem compatibility upgrade

## Outdated Dependencies

_Current versions read from lockfile (resolved). Latest from npm registry._

| Risk | Package | Current | Latest | Note | Confidence |
|------|---------|---------|--------|------|-----------|
| 🟠 | `@angular/animations` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/common` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/compiler` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/core` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/forms` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/platform-browser` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/platform-browser-dynamic` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/router` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular-devkit/build-angular` | 12.2.18 | 21.2.11 | Outdated | ✅ High |
| 🟠 | `@angular/cli` | 12.2.18 | 21.2.11 | Outdated | ✅ High |
| 🟠 | `@angular/compiler-cli` | 12.2.17 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@types/node` | 12.20.55 | 25.9.0 | Outdated | ✅ High |
| 🟠 | `tslint` | 6.1.3 | 6.1.3 | ⚠️ Deprecated — TSLint has been deprecated in favor of ESLint. Please see https://github.com/palantir/tslint/issues/4534 for more information. | ✅ High |
| 🟠 | `codelyzer` | 6.0.2 | 6.0.2 | ⚠️ Deprecated — Deprecated. Use angular-eslint instead. | ✅ High |
| 🟡 | `rxjs` | 6.6.7 | 7.8.2 | Outdated | ✅ High |
| 🟡 | `typescript` | 4.2.4 | 6.0.3 | Outdated | ✅ High |
| 🟢 | `zone.js` | 0.11.8 | 0.16.2 | Outdated | ✅ High |
| 🟢 | `karma` | 6.3.20 | 6.4.4 | Outdated | ✅ High |
| 🟢 | `karma-chrome-launcher` | 3.1.1 | 3.2.0 | Outdated | ✅ High |
| 🟢 | `karma-coverage` | 2.0.3 | 2.2.1 | Outdated | ✅ High |
| 🟢 | `karma-jasmine` | 4.0.2 | 5.1.0 | Outdated | ✅ High |
| 🟢 | `karma-jasmine-html-reporter` | 1.7.0 | 2.2.0 | Outdated | ✅ High |


## Peer Dependency Conflicts

> These packages were detected in your install but do not satisfy the peer requirement declared by another package. Verify against the actual lockfile before acting.

| Status | Package | Installed | Required Range | Required By |
|--------|---------|-----------|----------------|-------------|
| 🟠 Conflict | `@angular/core` | `12.2.17` | `21.2.13` | `@angular/animations` |
| 🟠 Conflict | `@angular/core` | `12.2.17` | `21.2.13` | `@angular/common` |
| 🟠 Conflict | `zone.js` | `0.11.8` | `~0.15.0 || ~0.16.0` | `@angular/core` |
| 🟠 Conflict | `@angular/compiler` | `12.2.17` | `21.2.13` | `@angular/core` |
| 🟠 Conflict | `@angular/core` | `12.2.17` | `21.2.13` | `@angular/forms` |
| 🟠 Conflict | `@angular/common` | `12.2.17` | `21.2.13` | `@angular/forms` |
| 🟠 Conflict | `@angular/platform-browser` | `12.2.17` | `21.2.13` | `@angular/forms` |
| 🟠 Conflict | `@angular/core` | `12.2.17` | `21.2.13` | `@angular/platform-browser` |
| 🟠 Conflict | `@angular/common` | `12.2.17` | `21.2.13` | `@angular/platform-browser` |
| 🟠 Conflict | `@angular/animations` | `12.2.17` | `21.2.13` | `@angular/platform-browser` |
| 🟠 Conflict | `@angular/core` | `12.2.17` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/common` | `12.2.17` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/compiler` | `12.2.17` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/platform-browser` | `12.2.17` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/core` | `12.2.17` | `21.2.13` | `@angular/router` |
| 🟠 Conflict | `@angular/common` | `12.2.17` | `21.2.13` | `@angular/router` |
| 🟠 Conflict | `@angular/platform-browser` | `12.2.17` | `21.2.13` | `@angular/router` |
| 🟠 Conflict | `typescript` | `4.2.4` | `>=5.9 <6.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `@angular/core` | `12.2.17` | `^21.0.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `@angular/compiler-cli` | `12.2.17` | `^21.0.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `@angular/platform-browser` | `12.2.17` | `^21.0.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `typescript` | `4.2.4` | `>=5.9 <6.1` | `@angular/compiler-cli` |
| 🟠 Conflict | `@angular/compiler` | `12.2.17` | `21.2.13` | `@angular/compiler-cli` |
| 🟠 Conflict | `karma-jasmine` | `4.0.2` | `^5.0.0` | `karma-jasmine-html-reporter` |

## Step-by-Step Upgrade Details

### Step: v12 → v13

> Angular 13: ViewEngine removed, IE11 dropped, APF v13, persistentTsConfig

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=12.0-13.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🔴 | `ViewEngine` | ViewEngine is fully removed — all code must compile with Ivy | Advisory | ViewEngine is fully removed — all code must compile with Ivy | ⚠️ Medium |
| 🟡 | `IE11 support` | IE11 is no longer supported; remove IE-specific polyfills | Advisory | IE11 is no longer supported; remove IE-specific polyfills | ⚠️ Medium |
| 🔴 | `TestBed.get()` | TestBed.get() is removed. Use TestBed.inject() instead | safe auto-fix | const svc = TestBed.inject(MyService); | ⚠️ Medium |
| 🟡 | `ModuleWithProviders without generic` | ModuleWithProviders must have an explicit generic type parameter | Assisted | static forRoot(): ModuleWithProviders<MyModule> | ⚠️ Medium |
| 🟢 | `Date pipe strict ISO 8601` | Date pipe now requires valid ISO 8601 date strings | Advisory | Date pipe now requires valid ISO 8601 date strings | ⚠️ Medium |


### Code Examples

#### `TestBed.get()`

**Before:**
```typescript
const svc = TestBed.get(MyService);
```

**After:**
```typescript
const svc = TestBed.inject(MyService);
```

#### `ModuleWithProviders without generic`

**Before:**
```typescript
static forRoot(): ModuleWithProviders
```

**After:**
```typescript
static forRoot(): ModuleWithProviders<MyModule>
```

#### Manual Actions Required

- [ ] Run: ng update @angular/core@13 @angular/cli@13
- [ ] Run: ng update @angular/cdk@13 @angular/material@13 (if used)
- [ ] Remove IE11 entries from browserslist
- [ ] Remove IE11 polyfills (classlist, web-animations-js) from polyfills.ts
- [ ] Replace TestBed.get() with TestBed.inject()
- [ ] Add generic type to all ModuleWithProviders usages

#### npm Install Command

```bash
npm install @angular/core@13 @angular/cli@13 @angular/common@13 @angular/forms@13 @angular/router@13 typescript@~4.4.0 rxjs@~7.4.0 zone.js@~0.11.4
```

### Step: v13 → v14

> Angular 14: Standalone components (developer preview), typed reactive forms, inject() function

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=13.0-14.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🔴 | `FormControl strict typing` | Reactive forms are now strictly typed; untyped variants have Untyped prefix | Assisted | new FormControl<string | null>(null)  // or new UntypedFormControl() | ⚠️ Medium |
| 🟢 | `RouterLinkWithHref` | RouterLinkWithHref merged into RouterLink directive | Advisory | RouterLinkWithHref merged into RouterLink directive | ⚠️ Medium |


### Code Examples

#### `FormControl strict typing`

**Before:**
```typescript
new FormControl()
```

**After:**
```typescript
new FormControl<string | null>(null)  // or new UntypedFormControl()
```

#### Manual Actions Required

- [ ] Run: ng update @angular/core@14 @angular/cli@14
- [ ] Run: ng update @angular/cdk@14 @angular/material@14 (if used)
- [ ] Migrate FormControl usages to typed forms or prefix with Untyped
- [ ] Remove RouterLinkWithHref imports — use RouterLink instead

#### npm Install Command

```bash
npm install @angular/core@14 @angular/cli@14 @angular/common@14 @angular/forms@14 @angular/router@14 typescript@~4.6.0 rxjs@~7.5.0
```

### Step: v14 → v15

> Angular 15: Stable standalone APIs, directive composition API, ESM-only packages

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=14.0-15.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🟢 | `initialNavigation router option` | Router option 'enabled' renamed to 'enabledBlocking' | safe auto-fix | initialNavigation: 'enabledBlocking' | ⚠️ Medium |
| 🟢 | `DATE_PIPE_DEFAULT_TIMEZONE` | DATE_PIPE_DEFAULT_TIMEZONE token replaced by DATE_PIPE_DEFAULT_OPTIONS | Assisted | DATE_PIPE_DEFAULT_TIMEZONE token replaced by DATE_PIPE_DEFAULT_OPTIONS | ⚠️ Medium |
| 🟡 | `ESM-only Angular packages` | Angular packages are now ESM-only; CommonJS projects need build tooling adjustment | Advisory | Angular packages are now ESM-only; CommonJS projects need build tooling adjustment | ⚠️ Medium |


### Code Examples

#### `initialNavigation router option`

**Before:**
```typescript
initialNavigation: 'enabled'
```

**After:**
```typescript
initialNavigation: 'enabledBlocking'
```

#### Manual Actions Required

- [ ] Run: ng update @angular/core@15 @angular/cli@15
- [ ] Run: ng update @angular/cdk@15 @angular/material@15 (if used) — note: Angular Material 15 is the MDC migration; expect component API changes
- [ ] Replace 'enabled' with 'enabledBlocking' in router initialNavigation option
- [ ] Replace DATE_PIPE_DEFAULT_TIMEZONE with DATE_PIPE_DEFAULT_OPTIONS

#### npm Install Command

```bash
npm install @angular/core@15 @angular/cli@15 @angular/common@15 @angular/forms@15 @angular/router@15 typescript@~4.8.0 rxjs@~7.5.0
```

### Step: v15 → v16

> Angular 16: Signals (developer preview), required inputs, inject() in guards/resolvers

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=15.0-16.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🟡 | `CanActivate / CanDeactivate functional guards` | Class-based guards are deprecated; migrate to functional guards | Assisted | export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn(); | ⚠️ Medium |
| 🟢 | `ngcc` | ngcc (Angular Compatibility Compiler) is removed | Advisory | ngcc (Angular Compatibility Compiler) is removed | ⚠️ Medium |
| 🟢 | `HttpClientModule -> provideHttpClient()` | Standalone bootstrap APIs can replace HttpClientModule with provideHttpClient(), but NgModule bootstraps may need a guided migration | Assisted | If the app uses bootstrapApplication(), move HttpClient setup to providers with provideHttpClient(); keep HttpClientModule for NgModule-only bootstraps until the module architecture is migrated. | ⚠️ Medium |


### Code Examples

#### `CanActivate / CanDeactivate functional guards`

**Before:**
```typescript
@Injectable()
export class AuthGuard implements CanActivate { canActivate() {} }
```

**After:**
```typescript
export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn();
```

#### `HttpClientModule -> provideHttpClient()`

**Before:**
```typescript
imports: [HttpClientModule]
```

**After:**
```typescript
providers: [provideHttpClient()]
```

#### Manual Actions Required

- [ ] Run: ng update @angular/core@16 @angular/cli@16
- [ ] Run: ng update @angular/cdk@16 @angular/material@16 (if used)
- [ ] Migrate class-based guards to functional guards
- [ ] Remove ngcc postinstall script from package.json if present

#### npm Install Command

```bash
npm install @angular/core@16 @angular/cli@16 @angular/common@16 @angular/forms@16 @angular/router@16 typescript@~5.0.0 rxjs@~7.8.0 zone.js@~0.13.0
```

### Step: v16 → v17

> Angular 17: Built-in control flow (@if, @for, @switch), deferrable views (@defer), new project defaults

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=16.0-17.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🟢 | `*ngIf structural directive` | New built-in @if replaces *ngIf (old syntax still works but is legacy) | Assisted | @if (condition) { <div>...</div> } | ⚠️ Medium |
| 🟢 | `*ngFor structural directive` | New built-in @for replaces *ngFor; requires track expression | Assisted | @for (item of items; track item.id) { <li>{{ item }}</li> } | ⚠️ Medium |
| 🟢 | `*ngSwitch structural directive` | New built-in @switch replaces *ngSwitch | Assisted | @switch (value) { @case ('a') { <span>A</span> } } | ⚠️ Medium |
| 🟢 | `BrowserModule.withServerTransition` | BrowserModule.withServerTransition is deprecated | Assisted | BrowserModule.withServerTransition is deprecated | ⚠️ Medium |


### Code Examples

#### `*ngIf structural directive`

**Before:**
```typescript
<div *ngIf="condition">...</div>
```

**After:**
```typescript
@if (condition) { <div>...</div> }
```

#### `*ngFor structural directive`

**Before:**
```typescript
<li *ngFor="let item of items">{{ item }}</li>
```

**After:**
```typescript
@for (item of items; track item.id) { <li>{{ item }}</li> }
```

#### `*ngSwitch structural directive`

**Before:**
```typescript
<div [ngSwitch]="value"><span *ngSwitchCase="'a'">A</span></div>
```

**After:**
```typescript
@switch (value) { @case ('a') { <span>A</span> } }
```

#### Manual Actions Required

- [ ] Run: ng update @angular/core@17 @angular/cli@17
- [ ] Optionally run the control-flow migration: ng g @angular/core:control-flow
- [ ] Add track expression to all @for blocks

#### npm Install Command

```bash
npm install @angular/core@17 @angular/cli@17 @angular/common@17 @angular/forms@17 @angular/router@17 typescript@~5.2.0 rxjs@~7.8.0 zone.js@~0.14.0
```

### Step: v17 → v18

> Angular 18: Stable control flow, experimental zoneless, material 3 stable

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=17.0-18.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🟢 | `zone.js optional` | Experimental zoneless change detection is available via provideExperimentalZonelessChangeDetection() | Advisory | Experimental zoneless change detection is available via provideExperimentalZonelessChangeDetection() | ⚠️ Medium |
| 🟢 | `RedirectCommand` | Router guards can now return RedirectCommand for typed redirects | Advisory | Router guards can now return RedirectCommand for typed redirects | ⚠️ Medium |



#### Manual Actions Required

- [ ] Run: ng update @angular/core@18 @angular/cli@18
- [ ] Run: ng update @angular/cdk@18 @angular/material@18 (if used)

#### npm Install Command

```bash
npm install @angular/core@18 @angular/cli@18 @angular/common@18 @angular/forms@18 @angular/router@18 typescript@~5.4.0 rxjs@~7.8.0 zone.js@~0.14.0
```

### Step: v18 → v19

> Angular 19: Stable signal APIs, incremental hydration (developer preview), route-level render mode, @let template variables

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=18.0-19.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🟢 | `afterRender phase API renamed` | afterRender hook phase constants renamed: EarlyRead → Read, Write → Write, MixedReadWrite → MixedReadWrite (verify with ng update schematic) | Assisted | afterRender hook phase constants renamed: EarlyRead → Read, Write → Write, MixedReadWrite → MixedReadWrite (verify with ng update schematic) | ⚠️ Medium |
| 🟢 | `provideHttpClient(withFetch())` | withFetch() is now the default for Angular 19 new projects; existing projects are unaffected unless explicitly relying on XHR behavior differences | Assisted | withFetch() is now the default for Angular 19 new projects; existing projects are unaffected unless explicitly relying on XHR behavior differences | ⚠️ Medium |
| 🟢 | `standalone: true is default` | New components generated by the CLI are standalone by default; existing NgModule-based components are unchanged | Advisory | New components generated by the CLI are standalone by default; existing NgModule-based components are unchanged | ⚠️ Medium |



#### Manual Actions Required

- [ ] Run: ng update @angular/core@19 @angular/cli@19
- [ ] Run: ng update @angular/cdk@19 @angular/material@19 (if used)
- [ ] Review afterRender() usages if using phase-specific hooks
- [ ] Verify HttpClient behavior if your app relies on XHR-specific features (cookies, withCredentials)

#### npm Install Command

```bash
npm install @angular/core@19 @angular/cli@19 @angular/common@19 @angular/forms@19 @angular/router@19 typescript@~5.6.0 rxjs@~7.8.0 zone.js@~0.15.0
```

### Step: v19 → v20

> Angular 20: Stable incremental hydration, stable resource API, signal-based forms (developer preview)

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=19.0-20.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

| Severity | API | Description | Fix | Remediation | Confidence |
|----------|-----|-------------|-----|-------------|-----------|
| 🔴 | `ReflectiveInjector removed` | ReflectiveInjector was deprecated since Angular 8 and is fully removed in v20. Use Injector.create() instead. | Assisted | Injector.create({ providers: [{ provide: MyService }] }) | ⚠️ Medium |
| 🟡 | `TestBed.configureTestingModule deprecations enforced` | Several deprecated TestBed APIs from v12–v15 emit hard errors in v20 where they previously warned | Assisted | Several deprecated TestBed APIs from v12–v15 emit hard errors in v20 where they previously warned | ⚠️ Medium |


### Code Examples

#### `ReflectiveInjector removed`

**Before:**
```typescript
ReflectiveInjector.resolveAndCreate([MyService])
```

**After:**
```typescript
Injector.create({ providers: [{ provide: MyService }] })
```

#### Manual Actions Required

- [ ] Run: ng update @angular/core@20 @angular/cli@20
- [ ] Run: ng update @angular/cdk@20 @angular/material@20 (if used)
- [ ] Search for ReflectiveInjector and migrate to Injector.create()
- [ ] Run ng build and ng test after upgrade; address any newly-hard errors from deprecated APIs

#### npm Install Command

```bash
npm install @angular/core@20 @angular/cli@20 @angular/common@20 @angular/forms@20 @angular/router@20 typescript@~5.8.0 rxjs@~7.8.0 zone.js@~0.15.0
```

### Step: v20 → v21

> Angular 21: framework, CLI, Material/CDK, TypeScript and ecosystem compatibility upgrade

> 📖 Official guide: [Angular Update Guide](https://angular.dev/update-guide?v=20.0-21.0&l=3)

> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.

#### Breaking Changes

_No breaking changes in this step._



#### Manual Actions Required

- [ ] Run: ng update @angular/core@21 @angular/cli@21
- [ ] Run: ng update @angular/cdk@21 @angular/material@21 (if used)
- [ ] Review the Angular 21 update guide for any breaking changes specific to your setup
- [ ] Run ng build and ng test after upgrade

#### npm Install Command

```bash
npm install @angular/core@21 @angular/cli@21 @angular/common@21 @angular/forms@21 @angular/router@21 typescript@~5.8.0 rxjs@~7.8.0 zone.js@~0.15.0
```

## Rollback Plan

1. Restore `package.json` and `package-lock.json` (or `yarn.lock` / `pnpm-lock.yaml`) from version control
2. Run `npm install` (or yarn/pnpm equivalent) to restore previous dependency tree
3. Revert any modified source files via `git checkout -- .`
4. If configs were modified, restore them from git: `git checkout -- angular.json tsconfig.json webpack.config.js`

> **Tip:** Create a git tag before upgrading: `git tag pre-upgrade-backup`
