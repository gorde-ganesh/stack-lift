# Example: Angular 12 → 18 Upgrade

This example shows a realistic StackLift session for upgrading a mid-size Angular 12 project to Angular 18.

---

## User Prompt

```
/stacklift

I have an Angular 12 app at ./my-angular-app that I need to upgrade to Angular 18.
It's a mid-size B2B dashboard — about 80 components, uses RxJS heavily, has lazy-loaded
modules, and uses Angular Material. There are about 40 unit tests with Karma/Jasmine.
Can you give me a full upgrade plan?
```

---

## StackLift Response

### Step 1 — Detected Stack

```json
{
  "framework": "Angular",
  "frameworkVersion": "12.1.0",
  "typescript": "4.2.3",
  "rxjs": "6.6.0",
  "angularMaterial": "12.1.0",
  "buildTool": "Angular CLI",
  "packageManager": "npm",
  "testRunner": "Karma + Jasmine"
}
```

---

### Step 2 — Dependency Audit

| Risk | Package | Current | Latest | Note |
|------|---------|---------|--------|------|
| 🔴 | `tslint` | 6.1.0 | 6.1.3 | **DEPRECATED** — migrate to `@typescript-eslint` |
| 🔴 | `codelyzer` | 6.0.0 | 6.0.2 | **DEPRECATED** — use `angular-eslint` instead |
| 🟠 | `@angular/core` | 12.1.0 | 18.0.0 | 6 major versions behind |
| 🟠 | `@angular/material` | 12.1.0 | 18.0.0 | Must track Angular core version |
| 🟠 | `rxjs` | 6.6.0 | 7.8.1 | Breaking operator renames |
| 🟠 | `typescript` | 4.2.3 | 5.4.5 | Required by Angular 16+ |
| 🟡 | `zone.js` | 0.11.4 | 0.14.4 | Minor updates per Angular hop |
| 🟡 | `karma` | 6.3.0 | 6.4.3 | Patch update |

**Critical finding:** `tslint` and `codelyzer` are fully deprecated. Angular's official ESLint migration (`angular-eslint`) must be completed before or during the Angular 13 hop.

---

### Step 3 — Upgrade Plan

**Strategy:** Incremental — 6 hops required  
**Risk:** 🔴 CRITICAL  
**Estimated effort:** 1–2 weeks (solo developer) / 3–5 days (two developers)

```
Angular 12 → 13 → 14 → 15 → 16 → 17 → 18
```

Create a dedicated branch before starting:

```bash
git checkout -b upgrade/angular-18
git tag pre-upgrade-backup
```

---

### Step 4 — Breaking Changes Per Hop

---

#### Hop 1: Angular 12 → 13

**Risk: HIGH** — ViewEngine removed, IE11 dropped

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | ViewEngine removed | 🔴 High | Automatic (Ivy only) — verify no `enableIvy: false` in tsconfig |
| 2 | `TestBed.get()` removed | 🔴 High | ✅ Auto — replace with `TestBed.inject()` |
| 3 | `ModuleWithProviders` requires generic | 🟡 Medium | Manual — add `<T>` to all usages |
| 4 | IE11 support dropped | 🟡 Medium | Manual — update browserslist, remove IE polyfills |
| 5 | Date pipe ISO 8601 strict | 🟢 Low | Manual — audit date string inputs |

**Before:**
```typescript
// src/testing/helpers.ts
const service = TestBed.get(AuthService);
```

**After:**
```typescript
const service = TestBed.inject(AuthService);
```

**Before:**
```typescript
// Shared module
static forRoot(): ModuleWithProviders {
  return { ngModule: SharedModule, providers: [] };
}
```

**After:**
```typescript
static forRoot(): ModuleWithProviders<SharedModule> {
  return { ngModule: SharedModule, providers: [] };
}
```

**Install command:**
```bash
npx ng update @angular/core@13 @angular/cli@13 @angular/material@13
```

**Manual actions:**
- [ ] Run `npx ng update @angular/core@13 @angular/cli@13 @angular/material@13`
- [ ] Remove `IE 11` from `.browserslistrc`
- [ ] Remove IE polyfills from `polyfills.ts` (`web-animations-js`, `classlist.js`)
- [ ] Add `<SharedModule>` generic to all `ModuleWithProviders` return types
- [ ] Replace `tslint.json` with `angular-eslint`: `ng add @angular-eslint/schematics`

---

#### Hop 2: Angular 13 → 14

**Risk: MEDIUM** — Typed reactive forms

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | `FormControl` is now strictly typed | 🔴 High | Semi-auto — add generics or prefix with `Untyped` |
| 2 | `RouterLinkWithHref` merged into `RouterLink` | 🟢 Low | Auto — remove `RouterLinkWithHref` from imports |

**Migration path for typed forms (80 components — use schematic):**

```bash
# Migrate all forms to use the new Untyped* prefixed classes first
# This is a safe no-op migration — no behavior change
npx ng update @angular/core@14 --migrate-only --from=13 --to=14

# Then incrementally adopt strict typing component by component
```

**Before:**
```typescript
form = new FormGroup({
  email: new FormControl(''),
  password: new FormControl('')
});
```

**After (safe migration — same behavior):**
```typescript
form = new UntypedFormGroup({
  email: new UntypedFormControl(''),
  password: new UntypedFormControl('')
});
```

**After (recommended — adopt strict types):**
```typescript
form = new FormGroup({
  email: new FormControl<string>(''),
  password: new FormControl<string>('')
});
```

**Install command:**
```bash
npx ng update @angular/core@14 @angular/cli@14 @angular/material@14
```

**Manual actions:**
- [ ] Run `npx ng update @angular/core@14 @angular/cli@14 @angular/material@14`
- [ ] Run the forms migration schematic: `ng generate @angular/core:typed-forms`
- [ ] Remove `RouterLinkWithHref` from any standalone component imports

---

#### Hop 3: Angular 14 → 15

**Risk: LOW** — Stable standalone, ESM packages

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | `initialNavigation: 'enabled'` renamed | 🟢 Low | ✅ Auto — rename to `'enabledBlocking'` |
| 2 | `DATE_PIPE_DEFAULT_TIMEZONE` token removed | 🟢 Low | Manual — use `DATE_PIPE_DEFAULT_OPTIONS` |
| 3 | ESM-only packages | 🟡 Medium | Config — ensure build outputs ESM |

**Install command:**
```bash
npx ng update @angular/core@15 @angular/cli@15 @angular/material@15
```

---

#### Hop 4: Angular 15 → 16

**Risk: MEDIUM** — Class-based guards deprecated

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | `CanActivate` class guards deprecated | 🟡 Medium | Manual — migrate to functional `CanActivateFn` |
| 2 | `ngcc` removed | 🟢 Low | Config — remove postinstall script from `package.json` |

**Before:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
```

**After:**
```typescript
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
```

**Install command:**
```bash
npx ng update @angular/core@16 @angular/cli@16 @angular/material@16
```

**Manual actions:**
- [ ] Migrate all `CanActivate` class guards to `CanActivateFn` functions
- [ ] Migrate all `CanDeactivate`, `Resolve`, `CanLoad` guards similarly
- [ ] Remove `"postinstall": "ngcc"` from `package.json` scripts if present

---

#### Hop 5: Angular 16 → 17

**Risk: LOW** — New control flow syntax (old syntax still works)

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | `*ngIf` → `@if` (optional migration) | 🟢 Low | ✅ Auto via schematic |
| 2 | `*ngFor` → `@for` (requires `track`) | 🟢 Low | ✅ Auto via schematic |
| 3 | `*ngSwitch` → `@switch` | 🟢 Low | ✅ Auto via schematic |
| 4 | `BrowserModule.withServerTransition` deprecated | 🟢 Low | Manual — remove if not using SSR |

**Migrate all structural directives to new control flow (80 components):**

```bash
# Angular provides a migration schematic
npx ng generate @angular/core:control-flow
```

This rewrites `*ngIf`, `*ngFor`, `*ngSwitch` to `@if`, `@for`, `@switch` across the entire project. Review the diff carefully — every `@for` block requires a `track` expression.

**Before:**
```html
<div *ngIf="user$ | async as user">
  <li *ngFor="let item of user.items">{{ item.name }}</li>
</div>
```

**After:**
```html
@if (user$ | async; as user) {
  <li @for="item of user.items; track item.id">{{ item.name }}</li>
}
```

**Install command:**
```bash
npx ng update @angular/core@17 @angular/cli@17 @angular/material@17
```

---

#### Hop 6: Angular 17 → 18

**Risk: LOW** — Stable control flow, zoneless experimental

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | Zoneless change detection available | 🟢 Low | Optional — evaluate for new projects |
| 2 | `RedirectCommand` available in guards | 🟢 Low | Optional enhancement |

**Install command:**
```bash
npx ng update @angular/core@18 @angular/cli@18 @angular/material@18
```

---

### Step 5 — Detected Code Issues

Files scanned: 214 TypeScript/HTML files in `src/`

```
src/testing/test-helpers.ts:23      TestBed.get(  → TestBed.inject()        [AUTO]
src/testing/test-helpers.ts:31      TestBed.get(  → TestBed.inject()        [AUTO]
src/core/auth/auth.guard.ts:1       implements CanActivate                  [MANUAL]
src/core/admin/admin.guard.ts:1     implements CanActivate                  [MANUAL]
src/app.module.ts:14                initialNavigation: 'enabled'            [AUTO]
src/shared/shared.module.ts:45      ModuleWithProviders — missing generic   [MANUAL]
src/shared/shared.module.ts:62      ModuleWithProviders — missing generic   [MANUAL]
src/features/dashboard/forms:       12 FormControl usages → type migration  [MANUAL]
```

---

### Step 6 — RxJS 6 → 7 Migration

RxJS 7 ships with Angular 13 but is fully required by Angular 16+. Key changes:

| Old | New |
|-----|-----|
| `combineLatest([a$, b$])` with array | Still works ✅ |
| `combineLatest(a$, b$)` with spread | ❌ Removed — use array form |
| `throwError('message')` | → `throwError(() => new Error('message'))` |
| `toPromise()` | → `firstValueFrom()` or `lastValueFrom()` |
| `flatMap` | → `mergeMap` (was alias, now removed) |

Scan for removed patterns:
```bash
grep -r "throwError(" src/ --include="*.ts"
grep -r "\.toPromise()" src/ --include="*.ts"
grep -r "flatMap(" src/ --include="*.ts"
```

---

### Full Manual Action Checklist

**Before starting:**
- [ ] Create upgrade branch: `git checkout -b upgrade/angular-18`
- [ ] Tag current state: `git tag pre-upgrade-backup`
- [ ] Ensure all tests pass on current version

**Angular 12 → 13:**
- [ ] Run: `npx ng update @angular/core@13 @angular/cli@13 @angular/material@13`
- [ ] Remove IE11 from `.browserslistrc`
- [ ] Remove IE polyfills from `polyfills.ts`
- [ ] Add generic type to all `ModuleWithProviders` usages
- [ ] Migrate from TSLint to angular-eslint: `ng add @angular-eslint/schematics`
- [ ] Run tests

**Angular 13 → 14:**
- [ ] Run: `npx ng update @angular/core@14 @angular/cli@14 @angular/material@14`
- [ ] Run typed-forms migration: `ng generate @angular/core:typed-forms`
- [ ] Run tests

**Angular 14 → 15:**
- [ ] Run: `npx ng update @angular/core@15 @angular/cli@15 @angular/material@15`
- [ ] Replace `DATE_PIPE_DEFAULT_TIMEZONE` with `DATE_PIPE_DEFAULT_OPTIONS`
- [ ] Run tests

**Angular 15 → 16:**
- [ ] Run: `npx ng update @angular/core@16 @angular/cli@16 @angular/material@16`
- [ ] Migrate class-based guards to functional `CanActivateFn`
- [ ] Remove `ngcc` postinstall script
- [ ] Run tests

**Angular 16 → 17:**
- [ ] Run: `npx ng update @angular/core@17 @angular/cli@17 @angular/material@17`
- [ ] Run control-flow migration: `ng generate @angular/core:control-flow`
- [ ] Add `track` expressions to all `@for` blocks
- [ ] Run tests

**Angular 17 → 18:**
- [ ] Run: `npx ng update @angular/core@18 @angular/cli@18 @angular/material@18`
- [ ] Run full test suite
- [ ] Fix any remaining TypeScript strict errors (`npm run typecheck`)
- [ ] Do a production build: `ng build --configuration production`

---

### Rollback Plan

```bash
# Revert to pre-upgrade state at any point
git checkout pre-upgrade-backup -- .
npm install

# Or reset the upgrade branch entirely
git checkout main
git branch -D upgrade/angular-18
```
