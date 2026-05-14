# Example: Legacy Dependency Audit and Modernization

This example shows a StackLift dependency audit on a 4-year-old Angular project that hasn't had a dependency cleanup pass. The focus is on deprecated packages, abandoned libraries, and peer-dependency conflicts — without yet touching the framework version itself.

---

## User Prompt

```
/stacklift

We have an older Angular 11 project. We're not ready to do a full framework upgrade
yet but we want to modernize our dependencies first — get rid of anything deprecated,
update the toolchain, and fix any security audit failures. Can you do a full
dependency audit and tell us what to fix?
```

---

## StackLift Response

### Step 1 — Detected Stack

```json
{
  "framework": "Angular",
  "frameworkVersion": "11.2.14",
  "typescript": "4.1.6",
  "rxjs": "6.5.5",
  "buildTool": "Angular CLI",
  "packageManager": "npm"
}
```

---

### Step 2 — Full Dependency Audit

#### 🔴 Critical — Deprecated or Removed

These packages must be replaced. Using them blocks the Angular upgrade path and may introduce security vulnerabilities.

---

**`tslint` @ 6.1.0 → DEPRECATED**

TSLint was deprecated in January 2020. No new rules, no security fixes. The Angular-recommended replacement is `angular-eslint` + `@typescript-eslint`.

Migration:
```bash
# Remove tslint
npm uninstall tslint

# Add angular-eslint (handles the migration automatically)
ng add @angular-eslint/schematics

# Convert existing tslint rules to eslint
ng g @angular-eslint/schematics:convert-tslint-to-eslint
```

The schematic creates `.eslintrc.json` from your existing `tslint.json`. Review the output — some TSLint rules have no ESLint equivalent and will need manual equivalents or removal.

---

**`codelyzer` @ 6.0.0 → DEPRECATED**

Codelyzer provided Angular-specific TSLint rules. It is replaced by the `@angular-eslint` rule set, which ships automatically when you run the schematic above.

```bash
npm uninstall codelyzer
```

---

**`node-sass` @ 4.14.1 → DEPRECATED**

`node-sass` is deprecated in favor of `sass` (Dart Sass), which is now the official Sass implementation. `node-sass` requires native binaries that frequently break on Node.js version upgrades.

```bash
npm uninstall node-sass
npm install -D sass
```

Update `angular.json` if it references `node-sass` explicitly (usually automatic with Angular CLI).

```bash
# Verify the switch worked
ng build
```

---

**`@angular/http` @ 7.2.16 → REMOVED in Angular 8**

`@angular/http` was removed in Angular 8. It should have been replaced with `@angular/common/http` (HttpClientModule). If this package is still in `package.json`, there are likely live imports of it in the codebase.

```bash
# Find all usages
grep -r "@angular/http" src/ --include="*.ts"
```

Replace all occurrences:

**Before:**
```typescript
import { HttpModule, Http } from '@angular/http';

@NgModule({
  imports: [HttpModule]
})
```

**After:**
```typescript
import { HttpClientModule, HttpClient } from '@angular/common/http';

@NgModule({
  imports: [HttpClientModule]
})
```

```bash
npm uninstall @angular/http
```

---

**`babel-core` @ 6.26.3 → DEPRECATED**

`babel-core` is the legacy Babel 6 package. Babel 7+ uses the scoped `@babel/core`. This is a transitive dependency — check whether it is a direct dep or pulled in by a dev tool.

```bash
npm ls babel-core  # show who depends on it
```

If it's a direct dependency, replace it:
```bash
npm uninstall babel-core
npm install -D @babel/core
npm install -D babel-bridge  # only if needed for jest
```

---

#### 🟠 High — Severely Outdated With Breaking Changes

These packages work today but block the upgrade path to Angular 14+.

---

**`rxjs` @ 6.5.5 → 7.8.1**

RxJS 7 ships with Angular 13. It has breaking changes but ships a compatibility layer that makes migration easier.

Key changes in RxJS 7:

| Change | Impact |
|--------|--------|
| `throwError('string')` signature changed | Must use factory: `throwError(() => new Error('..'))` |
| `combineLatest(a$, b$)` spread args | Must use array: `combineLatest([a$, b$])` |
| `toPromise()` deprecated | Use `firstValueFrom()` or `lastValueFrom()` |
| `flatMap` removed | Use `mergeMap` (was an alias) |
| `partition` moved to top-level | Import from `rxjs` not `rxjs/operators` |

Scan for each pattern:
```bash
grep -rn "throwError(" src/ --include="*.ts"
grep -rn "\.toPromise()" src/ --include="*.ts"
grep -rn "flatMap(" src/ --include="*.ts"
grep -rn "combineLatest(" src/ --include="*.ts"
```

Do not upgrade RxJS independently — it is tied to the Angular version. Do it as part of the `ng update` schematic at the Angular 13 hop.

---

**`webpack` @ 4.46.0 → 5.91.0** (if ejected)

If `angular.json` uses a custom webpack config (via `@angular-builders/custom-webpack`), Webpack 5 introduces breaking changes:

- `process.env` polyfill removed (use `webpack.DefinePlugin`)
- `node.Buffer` and `node.process` not polyfilled by default
- `resolve.fallback` replaces `node` option for polyfills

If you haven't ejected, Angular CLI manages Webpack internally — no action needed.

---

#### 🟡 Medium — Outdated, Low Risk

These are straightforward patch or minor updates with no meaningful breaking changes.

| Package | Current | Latest | Action |
|---------|---------|--------|--------|
| `zone.js` | 0.11.4 | 0.14.4 | Update alongside `ng update` |
| `tslib` | 2.1.0 | 2.6.2 | `npm install tslib@latest` |
| `@types/node` | 12.x | 20.x | `npm install -D @types/node@20` |
| `karma` | 6.2.0 | 6.4.3 | `npm install -D karma@latest` |
| `jasmine-core` | 3.8.0 | 5.1.0 | `npm install -D jasmine-core@latest` |

**Note on `@types/node`:** Angular 11 targets Node 12. Upgrading to `@types/node@20` adds newer Node APIs to your TypeScript environment. This is safe but review if anything unexpectedly uses new APIs.

---

#### 🟢 Low — Stale But Functional

These packages are working fine but haven't been updated in a while. No action required before the framework upgrade, but flag for the team.

| Package | Note |
|---------|------|
| `lodash` @ 4.17.15 | Current. No action needed. |
| `moment` @ 2.29.4 | Maintenance mode — no new features. Consider `date-fns` or `day.js` in a future sprint. |

---

### Step 3 — Security Audit

```bash
npm audit
```

Expected high-severity findings with this stack:

| Package | Severity | CVE | Fix |
|---------|----------|-----|-----|
| `node-sass` → native dep | High | Varies | Replace with `sass` |
| `@angular/http` | High | N/A | Remove (abandoned) |
| `minimist` (transitive) | Moderate | Prototype pollution | `npm audit fix` |
| `nth-check` (transitive) | Moderate | ReDoS | Resolved by updating `react-scripts` or `postcss` |

Run after dependency cleanup:
```bash
npm audit fix
npm audit  # should show 0 high, 0 critical
```

---

### Step 4 — Recommended Execution Order

Doing all of this at once is risky. The recommended order minimizes breakage:

**Phase 1 — Remove deprecated tooling (1–2 hours, zero risk):**

```bash
# 1. Remove TSLint, add ESLint
ng add @angular-eslint/schematics
ng g @angular-eslint/schematics:convert-tslint-to-eslint
npm uninstall tslint codelyzer

# 2. Replace node-sass with sass
npm uninstall node-sass
npm install -D sass

# 3. Remove @angular/http and migrate to HttpClientModule
npm uninstall @angular/http
# (fix imports manually — see above)

# 4. Build and test
ng build
ng test
```

**Phase 2 — Safe minor updates (30 minutes):**

```bash
npm install tslib@latest zone.js@~0.11.8
npm install -D @types/node@14  # stay within Angular 11 supported range
npm install -D karma@latest jasmine-core@latest
ng build && ng test
```

**Phase 3 — Security audit cleanup:**

```bash
npm audit fix
npm audit
```

**Phase 4 — RxJS update (with framework upgrade only):**

Do not update RxJS independently. It is tightly coupled to Angular and must be updated as part of `ng update @angular/core@13`.

---

### Full Manual Action Checklist

- [ ] `ng add @angular-eslint/schematics`
- [ ] `ng g @angular-eslint/schematics:convert-tslint-to-eslint`
- [ ] Review generated `.eslintrc.json` — add rules that have no TSLint equivalent
- [ ] `npm uninstall tslint codelyzer`
- [ ] `npm uninstall node-sass && npm install -D sass`
- [ ] `npm uninstall @angular/http`
- [ ] Replace all `@angular/http` imports with `@angular/common/http` throughout codebase
- [ ] Replace `HttpModule` with `HttpClientModule` in all NgModule imports
- [ ] Replace `Http` service injection with `HttpClient`
- [ ] Check `babel-core` — uninstall if a direct dep, not needed with Angular CLI
- [ ] `npm install -D @types/node@14`
- [ ] `npm install -D karma@latest jasmine-core@latest`
- [ ] `npm audit fix`
- [ ] `ng build --configuration production`
- [ ] `ng test`
- [ ] Open PR — request team review before merging

---

### After This Work

Once these dependency cleanups are in place, the project is in a much better position to begin the Angular version upgrade. The next recommended step is:

```bash
ng update @angular/core@12 @angular/cli@12  # catch up to latest 11→12
```

Then follow the full Angular 12 → 18 upgrade plan.
