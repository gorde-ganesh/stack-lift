# Upgrade Report: Angular 12 → 13

> Generated: 2026-05-18T11:19:21.835Z

---

## Evidence Sources

| Source | Status |
|--------|--------|
| package.json | ✅ Read directly |
| Lockfile (resolved versions) | ⚠️ No lockfile found — installed versions estimated from package.json ranges. |
| tsconfig.json | ⚠️ tsconfig.json not found. |
| npm registry (latest versions) | ✅ Live query at report generation time |
| Breaking change catalogue | ℹ️ Inferred from static knowledge base — verify against official migration guide |

## Summary

| | |
|---|---|
| **Framework** | Angular 12.1.0 |
| **Target** | Angular 13 |
| **TypeScript** | 4.2.3 |
| **Build tool** | Angular CLI |
| **Package manager** | npm |
| **Strategy** | Direct |
| **Risk level** | 🟠 HIGH |
| **Estimated effort** | 1–2 days |
| **Effort basis** | 5 catalogued breaking changes, 6 manual actions across 1 hop(s), 0 affected file(s), 0 occurrence(s) in source — does not account for test coverage or CI complexity |
| **Breaking changes** | 5 (1 auto-fixable) |
| **Migration rules** | 1 automatable, 1 assisted, 3 advisory |

## Upgrade Path

1. **v12 → v13** — Angular 13: ViewEngine removed, IE11 dropped, APF v13, persistentTsConfig

## Outdated Dependencies

_Current versions read from package.json ranges. No lockfile found — install exact versions may differ._

| Risk | Package | Current | Latest | Note | Confidence |
|------|---------|---------|--------|------|-----------|
| 🟠 | `@angular/animations` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/common` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/compiler` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/core` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/forms` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/platform-browser` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/platform-browser-dynamic` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular/router` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@angular-devkit/build-angular` | 12.1.0 | 21.2.11 | Outdated | ✅ High |
| 🟠 | `@angular/cli` | 12.1.0 | 21.2.11 | Outdated | ✅ High |
| 🟠 | `@angular/compiler-cli` | 12.1.0 | 21.2.13 | Outdated | ✅ High |
| 🟠 | `@types/node` | 12.11.1 | 25.8.0 | Outdated | ✅ High |
| 🟠 | `tslint` | 6.1.0 | 6.1.3 | ⚠️ Deprecated — TSLint has been deprecated in favor of ESLint. Please see https://github.com/palantir/tslint/issues/4534 for more information. | ✅ High |
| 🟠 | `codelyzer` | 6.0.0 | 6.0.2 | ⚠️ Deprecated — Deprecated. Use angular-eslint instead. | ✅ High |
| 🟡 | `rxjs` | 6.6.0 | 7.8.2 | Outdated | ✅ High |
| 🟡 | `typescript` | 4.2.3 | 6.0.3 | Outdated | ✅ High |
| 🟢 | `tslib` | 2.2.0 | 2.8.1 | Outdated | ✅ High |
| 🟢 | `zone.js` | 0.11.4 | 0.16.2 | Outdated | ✅ High |
| 🟢 | `karma` | 6.3.0 | 6.4.4 | Outdated | ✅ High |
| 🟢 | `karma-chrome-launcher` | 3.1.0 | 3.2.0 | Outdated | ✅ High |
| 🟢 | `karma-coverage` | 2.0.3 | 2.2.1 | Outdated | ✅ High |
| 🟢 | `karma-jasmine` | 4.0.0 | 5.1.0 | Outdated | ✅ High |
| 🟢 | `karma-jasmine-html-reporter` | 1.7.0 | 2.2.0 | Outdated | ✅ High |


## Peer Dependency Conflicts

> These packages were detected in your install but do not satisfy the peer requirement declared by another package. Verify against the actual lockfile before acting.

| Status | Package | Installed | Required Range | Required By |
|--------|---------|-----------|----------------|-------------|
| 🟠 Conflict | `@angular/core` | `12.1.0` | `21.2.13` | `@angular/animations` |
| 🟠 Conflict | `@angular/core` | `12.1.0` | `21.2.13` | `@angular/common` |
| 🟠 Conflict | `zone.js` | `0.11.4` | `~0.15.0 || ~0.16.0` | `@angular/core` |
| 🟠 Conflict | `@angular/compiler` | `12.1.0` | `21.2.13` | `@angular/core` |
| 🟠 Conflict | `@angular/core` | `12.1.0` | `21.2.13` | `@angular/forms` |
| 🟠 Conflict | `@angular/common` | `12.1.0` | `21.2.13` | `@angular/forms` |
| 🟠 Conflict | `@angular/platform-browser` | `12.1.0` | `21.2.13` | `@angular/forms` |
| 🟠 Conflict | `@angular/core` | `12.1.0` | `21.2.13` | `@angular/platform-browser` |
| 🟠 Conflict | `@angular/common` | `12.1.0` | `21.2.13` | `@angular/platform-browser` |
| 🟠 Conflict | `@angular/animations` | `12.1.0` | `21.2.13` | `@angular/platform-browser` |
| 🟠 Conflict | `@angular/core` | `12.1.0` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/common` | `12.1.0` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/compiler` | `12.1.0` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/platform-browser` | `12.1.0` | `21.2.13` | `@angular/platform-browser-dynamic` |
| 🟠 Conflict | `@angular/core` | `12.1.0` | `21.2.13` | `@angular/router` |
| 🟠 Conflict | `@angular/common` | `12.1.0` | `21.2.13` | `@angular/router` |
| 🟠 Conflict | `@angular/platform-browser` | `12.1.0` | `21.2.13` | `@angular/router` |
| 🟠 Conflict | `typescript` | `4.2.3` | `>=5.9 <6.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `@angular/core` | `12.1.0` | `^21.0.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `@angular/compiler-cli` | `12.1.0` | `^21.0.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `@angular/platform-browser` | `12.1.0` | `^21.0.0` | `@angular-devkit/build-angular` |
| 🟠 Conflict | `typescript` | `4.2.3` | `>=5.9 <6.1` | `@angular/compiler-cli` |
| 🟠 Conflict | `@angular/compiler` | `12.1.0` | `21.2.13` | `@angular/compiler-cli` |
| 🟠 Conflict | `karma-jasmine` | `4.0.0` | `^5.0.0` | `karma-jasmine-html-reporter` |

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

## Manual Action Checklist

- [ ] Run: ng update @angular/core@13 @angular/cli@13
- [ ] Run: ng update @angular/cdk@13 @angular/material@13 (if used)
- [ ] Remove IE11 entries from browserslist
- [ ] Remove IE11 polyfills (classlist, web-animations-js) from polyfills.ts
- [ ] Replace TestBed.get() with TestBed.inject()
- [ ] Add generic type to all ModuleWithProviders usages

## Rollback Plan

1. Restore `package.json` and `package-lock.json` (or `yarn.lock` / `pnpm-lock.yaml`) from version control
2. Run `npm install` (or yarn/pnpm equivalent) to restore previous dependency tree
3. Revert any modified source files via `git checkout -- .`
4. If configs were modified, restore them from git: `git checkout -- angular.json tsconfig.json webpack.config.js`

> **Tip:** Create a git tag before upgrading: `git tag pre-upgrade-backup`
