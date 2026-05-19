# Stack Lift — Agent Instructions

> Generated: 2026-05-19T13:25:34.733Z  
> Mode: `audit`  
> Project: Angular 12.1.0 → 21

---

## Artifact-first protocol

Do not rely on terminal output as the source of truth.

Always read these files after running stack-lift:

| File | Purpose |
|------|---------|
| `agent-contract.json` | Current status, safe-to-autofix flag, next recommended command |
| `findings.json` | All dependency findings with confidence and evidence |
| `plan.json` | Hop-by-hop migration plan with step contracts |
| `decisions.required.json` | Packages needing research — fetch live alternatives from npm/docs |
| `agent-instructions.md` | This file |

---

## Current status

**Status:** `needs_plan`  
**Next command:** `stack-lift plan .`

Run `stack-lift plan .` to generate a hop-by-hop migration roadmap before proceeding.

**Safe to autofix:**

`false` — manual review required for some breaking changes

---

## Required decisions

For each package below, query the npm registry and official documentation to find current replacement options.
See `decisions.required.json` for `researchSources` URLs.

### `tslint` (installed: 6.1.3)
**Reason:** TSLint has been deprecated in favor of ESLint. Please see https://github.com/palantir/tslint/issues/4534 for more information.  
**Risk:** high  
**npm page:** https://www.npmjs.com/package/tslint  
**Homepage:** https://palantir.github.io/tslint  
**Repository:** https://github.com/palantir/tslint  

**Agent task:** Fetch `https://www.npmjs.com/package/tslint` or search npm for alternatives. Propose 2–3 options with migration effort and API compatibility notes.

### `codelyzer` (installed: 6.0.2)
**Reason:** Deprecated. Use angular-eslint instead.  
**Risk:** high  
**npm page:** https://www.npmjs.com/package/codelyzer  
**Homepage:** https://github.com/mgechev/codelyzer#readme  
**Repository:** https://github.com/mgechev/codelyzer  

**Agent task:** Fetch `https://www.npmjs.com/package/codelyzer` or search npm for alternatives. Propose 2–3 options with migration effort and API compatibility notes.

---

## Migration overview

- **Route:** Angular 12 → 21
- **Strategy:** incremental (9 steps)
- **Risk:** critical
- **Effort:** 1–2 weeks
- **Breaking changes:** 24 total, 2 auto-fixable
- **Rule classes:** 2 automatable, 13 assisted, 9 advisory

---

## Step-by-step contracts

### Step 1: v12 → v13

| Field | Value |
|-------|-------|
| stepId | `angular-12-to-13` |
| canAutofix | `true` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=12.0-13.0&l=3 |

**Install:** `@angular/core@13 @angular/cli@13 @angular/common@13 @angular/forms@13 @angular/router@13 typescript@~4.4.0 rxjs@~7.4.0 zone.js@~0.11.4`

**Breaking changes:** 5 (1 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@13 @angular/cli@13
- Run: ng update @angular/cdk@13 @angular/material@13 (if used)
- Remove IE11 entries from browserslist
- Remove IE11 polyfills (classlist, web-animations-js) from polyfills.ts
- Replace TestBed.get() with TestBed.inject()
- Add generic type to all ModuleWithProviders usages

### Step 2: v13 → v14

| Field | Value |
|-------|-------|
| stepId | `angular-13-to-14` |
| canAutofix | `false` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=13.0-14.0&l=3 |

**Install:** `@angular/core@14 @angular/cli@14 @angular/common@14 @angular/forms@14 @angular/router@14 typescript@~4.6.0 rxjs@~7.5.0`

**Breaking changes:** 2 (0 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@14 @angular/cli@14
- Run: ng update @angular/cdk@14 @angular/material@14 (if used)
- Migrate FormControl usages to typed forms or prefix with Untyped
- Remove RouterLinkWithHref imports — use RouterLink instead

### Step 3: v14 → v15

| Field | Value |
|-------|-------|
| stepId | `angular-14-to-15` |
| canAutofix | `true` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=14.0-15.0&l=3 |

**Install:** `@angular/core@15 @angular/cli@15 @angular/common@15 @angular/forms@15 @angular/router@15 typescript@~4.8.0 rxjs@~7.5.0`

**Breaking changes:** 3 (1 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@15 @angular/cli@15
- Run: ng update @angular/cdk@15 @angular/material@15 (if used) — note: Angular Material 15 is the MDC migration; expect component API changes
- Replace 'enabled' with 'enabledBlocking' in router initialNavigation option
- Replace DATE_PIPE_DEFAULT_TIMEZONE with DATE_PIPE_DEFAULT_OPTIONS

### Step 4: v15 → v16

| Field | Value |
|-------|-------|
| stepId | `angular-15-to-16` |
| canAutofix | `false` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=15.0-16.0&l=3 |

**Install:** `@angular/core@16 @angular/cli@16 @angular/common@16 @angular/forms@16 @angular/router@16 typescript@~5.0.0 rxjs@~7.8.0 zone.js@~0.13.0`

**Breaking changes:** 3 (0 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@16 @angular/cli@16
- Run: ng update @angular/cdk@16 @angular/material@16 (if used)
- Migrate class-based guards to functional guards
- Remove ngcc postinstall script from package.json if present

### Step 5: v16 → v17

| Field | Value |
|-------|-------|
| stepId | `angular-16-to-17` |
| canAutofix | `false` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=16.0-17.0&l=3 |

**Install:** `@angular/core@17 @angular/cli@17 @angular/common@17 @angular/forms@17 @angular/router@17 typescript@~5.2.0 rxjs@~7.8.0 zone.js@~0.14.0`

**Breaking changes:** 4 (0 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@17 @angular/cli@17
- Optionally run the control-flow migration: ng g @angular/core:control-flow
- Add track expression to all @for blocks

### Step 6: v17 → v18

| Field | Value |
|-------|-------|
| stepId | `angular-17-to-18` |
| canAutofix | `false` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=17.0-18.0&l=3 |

**Install:** `@angular/core@18 @angular/cli@18 @angular/common@18 @angular/forms@18 @angular/router@18 typescript@~5.4.0 rxjs@~7.8.0 zone.js@~0.14.0`

**Breaking changes:** 2 (0 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@18 @angular/cli@18
- Run: ng update @angular/cdk@18 @angular/material@18 (if used)

### Step 7: v18 → v19

| Field | Value |
|-------|-------|
| stepId | `angular-18-to-19` |
| canAutofix | `false` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=18.0-19.0&l=3 |

**Install:** `@angular/core@19 @angular/cli@19 @angular/common@19 @angular/forms@19 @angular/router@19 typescript@~5.6.0 rxjs@~7.8.0 zone.js@~0.15.0`

**Breaking changes:** 3 (0 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@19 @angular/cli@19
- Run: ng update @angular/cdk@19 @angular/material@19 (if used)
- Review afterRender() usages if using phase-specific hooks
- Verify HttpClient behavior if your app relies on XHR-specific features (cookies, withCredentials)

### Step 8: v19 → v20

| Field | Value |
|-------|-------|
| stepId | `angular-19-to-20` |
| canAutofix | `false` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=19.0-20.0&l=3 |

**Install:** `@angular/core@20 @angular/cli@20 @angular/common@20 @angular/forms@20 @angular/router@20 typescript@~5.8.0 rxjs@~7.8.0 zone.js@~0.15.0`

**Breaking changes:** 2 (0 auto-fixable)

**Manual actions:**
- Run: ng update @angular/core@20 @angular/cli@20
- Run: ng update @angular/cdk@20 @angular/material@20 (if used)
- Search for ReflectiveInjector and migrate to Injector.create()
- Run ng build and ng test after upgrade; address any newly-hard errors from deprecated APIs

### Step 9: v20 → v21

| Field | Value |
|-------|-------|
| stepId | `angular-20-to-21` |
| canAutofix | `false` |
| requiresUserDecision | `true` |
| validation | `npm run typecheck && npm test` |
| rollback | `git reset --hard` |
| guide | https://angular.dev/update-guide?v=20.0-21.0&l=3 |

**Install:** `@angular/core@21 @angular/cli@21 @angular/common@21 @angular/forms@21 @angular/router@21 typescript@~5.8.0 rxjs@~7.8.0 zone.js@~0.15.0`

**Manual actions:**
- Run: ng update @angular/core@21 @angular/cli@21
- Run: ng update @angular/cdk@21 @angular/material@21 (if used)
- Review the Angular 21 update guide for any breaking changes specific to your setup
- Run ng build and ng test after upgrade

---

## Safety checklist

Before applying automated fixes, verify all of the following:

1. Read `agent-contract.json` — confirm `safeToAutofix` is `true`
2. Read `decisions.required.json` — resolve all package replacement decisions
3. Confirm the migration step contract in `plan.json` for each step
4. Run validation commands after each step: `npm run typecheck && npm test`
5. On failure, run: `git reset --hard`
6. Write a migration summary after completion
