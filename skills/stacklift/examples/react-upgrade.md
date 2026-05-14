# Example: React 16 → 18 Upgrade

This example shows a realistic StackLift session for upgrading a React 16 SPA to React 18, including the Concurrent Mode migration, entry-point rewrite, and TypeScript type updates.

---

## User Prompt

```
/stacklift

We have a React 16.14 app bootstrapped with Create React App. It's a customer portal —
about 60 components, uses React Router v5, class components in about 20 places,
and no SSR. TypeScript 4.0. We want to reach React 18 and eventually drop CRA for Vite.
What's the full plan?
```

---

## StackLift Response

### Step 1 — Detected Stack

```json
{
  "framework": "React",
  "frameworkVersion": "16.14.0",
  "typescript": "4.0.3",
  "buildTool": "Create React App",
  "packageManager": "npm",
  "reactRouter": "5.2.0",
  "testRunner": "Jest (via react-scripts)"
}
```

---

### Step 2 — Dependency Audit

| Risk | Package | Current | Latest | Note |
|------|---------|---------|--------|------|
| 🔴 | `react-scripts` | 4.0.3 | 5.0.1 | **DEPRECATED** — CRA is unmaintained; migrate to Vite |
| 🟠 | `react` | 16.14.0 | 19.0.0 | 3 major versions behind |
| 🟠 | `react-dom` | 16.14.0 | 19.0.0 | Must match react version |
| 🟠 | `react-router-dom` | 5.2.0 | 6.26.0 | Breaking API changes in v6 |
| 🟡 | `typescript` | 4.0.3 | 5.4.5 | React 18 types require @types/react@18 |
| 🟡 | `@types/react` | 16.x | 18.x | Must update with react version |

**Critical finding:** `react-scripts` (Create React App) is no longer maintained. We recommend migrating to Vite at the same time as the React upgrade, or shortly after. This example covers React 16 → 18. See the CRA → Vite migration notes at the end.

---

### Step 3 — Upgrade Plan

**Strategy:** Incremental — 2 hops (16 → 17 → 18)  
**Risk:** 🟠 HIGH  
**Estimated effort:** 1–2 days

```
React 16 → 17 → 18
```

React 17 is a near-zero-breaking-change release primarily required to adopt the new JSX transform and fix event delegation. It is a safe intermediate step before React 18.

```bash
git checkout -b upgrade/react-18
git tag pre-upgrade-backup
```

---

### Step 4 — Breaking Changes Per Hop

---

#### Hop 1: React 16 → 17

**Risk: LOW** — Few user-visible breaking changes

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | JSX transform requires explicit React import | 🟢 Low | ✅ Auto — remove unused `import React` |
| 2 | Event delegation moved from `document` to root | 🟡 Medium | Manual — audit `document.addEventListener` usage |
| 3 | `e.persist()` no longer needed | 🟢 Low | Manual — remove calls (safe to leave, just a no-op) |
| 4 | `onScroll` no longer bubbles | 🟢 Low | Manual — audit scroll event handlers |

**New JSX transform:** Configure TypeScript to use the automatic JSX runtime so you no longer need `import React from 'react'` in every file:

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

**Before (every file with JSX):**
```tsx
import React from 'react';

export function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}
```

**After:**
```tsx
// No React import needed
export function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}
```

**Event delegation change** — if your app adds event listeners directly on `document`, they will now fire **after** React events instead of before. Audit:

```bash
grep -r "document.addEventListener" src/ --include="*.ts" --include="*.tsx"
```

**Install command:**
```bash
npm install react@17 react-dom@17
npm install -D @types/react@17 @types/react-dom@17
```

**Manual actions:**
- [ ] Set `"jsx": "react-jsx"` in `tsconfig.json`
- [ ] Run `npm install react@17 react-dom@17`
- [ ] Run `npm install -D @types/react@17 @types/react-dom@17`
- [ ] Remove `e.persist()` calls (safe but unnecessary)
- [ ] Audit `document.addEventListener` usage for ordering sensitivity
- [ ] Run test suite

---

#### Hop 2: React 17 → 18

**Risk: HIGH** — Entry point API removed, concurrent behavior changes

| # | API | Severity | Fix |
|---|-----|----------|-----|
| 1 | `ReactDOM.render` deprecated/removed | 🔴 High | ✅ Auto — rewrite to `createRoot().render()` |
| 2 | `ReactDOM.hydrate` deprecated/removed | 🔴 High | ✅ Auto — rewrite to `hydrateRoot()` |
| 3 | `unmountComponentAtNode` deprecated | 🟡 Medium | Manual — use `root.unmount()` |
| 4 | Automatic state batching | 🟡 Medium | Manual — test async update behavior |
| 5 | StrictMode double-effects | 🟡 Medium | Manual — fix non-idempotent effects |
| 6 | `@types/react` 18 children type change | 🟡 Medium | Manual — add explicit `children` prop type |

**Entry point rewrite (src/index.tsx):**

**Before:**
```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

**After:**
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**TypeScript `children` prop change:**

In `@types/react@18`, `React.FC` no longer implicitly includes `children` in props. Any component that accepts children must declare it explicitly.

**Before:**
```tsx
const Layout: React.FC = ({ children }) => (
  <main>{children}</main>
);
```

**After:**
```tsx
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main>{children}</main>
);
```

Scan for affected components:
```bash
grep -r "React.FC" src/ --include="*.tsx" | grep -v "children"
```

**Automatic batching** — state updates inside `setTimeout`, `Promise.then`, and native event handlers are now batched automatically. Tests that rely on `act()` for async updates may need adjustment. Opt out with `flushSync` where needed:

```tsx
import { flushSync } from 'react-dom';

// Force synchronous re-render (use sparingly)
flushSync(() => {
  setCount(c => c + 1);
});
```

**StrictMode double-invocation** — effects now mount → unmount → mount in development to detect missing cleanup. Fix any effects with side effects that are not properly cleaned up:

```tsx
// Before: no cleanup — will fire side effect twice in dev
useEffect(() => {
  analytics.trackPageView(path);
}, [path]);

// After: idempotent, or use a ref guard if truly once-only
useEffect(() => {
  analytics.trackPageView(path);
  return () => {}; // cleanup is a no-op but required
}, [path]);
```

**Install command:**
```bash
npm install react@18 react-dom@18
npm install -D @types/react@18 @types/react-dom@18
```

**Manual actions:**
- [ ] Run `npm install react@18 react-dom@18`
- [ ] Run `npm install -D @types/react@18 @types/react-dom@18`
- [ ] Rewrite `src/index.tsx` to use `createRoot`
- [ ] Replace `ReactDOM.hydrate` with `hydrateRoot` (if used)
- [ ] Replace `ReactDOM.unmountComponentAtNode` with `root.unmount()` (if used)
- [ ] Add explicit `children: React.ReactNode` to all components that accept children
- [ ] Audit async state update tests — wrap with `act()` where needed
- [ ] Fix any non-idempotent effects that break under StrictMode
- [ ] Run test suite

---

### Step 5 — Detected Code Issues

Files scanned: 142 TypeScript/TSX files in `src/`

```
src/index.tsx:6         ReactDOM.render(      → createRoot().render()    [AUTO]
src/layout/Layout.tsx:3  React.FC — no children prop                     [MANUAL]
src/layout/Header.tsx:5  React.FC — no children prop                     [MANUAL]
src/layout/Sidebar.tsx:4 React.FC — no children prop                     [MANUAL]
src/utils/dom.ts:12     document.addEventListener — check event ordering  [MANUAL]
tests/App.test.tsx:8    ReactDOM.render in test setup                    [MANUAL]
```

---

### Step 6 — React Router v5 → v6 (Bonus Guidance)

React Router 6 is a significant breaking change. Tackle it **after** the React 18 upgrade in a separate branch.

Key changes:

| v5 | v6 |
|----|-----|
| `<Switch>` | `<Routes>` |
| `<Route component={Comp}>` | `<Route element={<Comp />}>` |
| `useHistory()` | `useNavigate()` |
| `useRouteMatch()` | `useMatch()` |
| `<Redirect>` | `<Navigate>` |
| Nested routes via separate `<Switch>` | Nested `<Route>` with `<Outlet>` |

---

### Step 7 — CRA → Vite Migration (Recommended Next Step)

Create React App is unmaintained. Migrate to Vite after the React 18 upgrade.

1. Remove `react-scripts`: `npm uninstall react-scripts`
2. Install Vite: `npm install -D vite @vitejs/plugin-react`
3. Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

4. Move `public/index.html` to project root and update script tag:

```html
<!-- Before: no script tag in index.html with CRA -->
<!-- After: add this before </body> -->
<script type="module" src="/src/index.tsx"></script>
```

5. Replace `process.env.REACT_APP_*` with `import.meta.env.VITE_*`:

```bash
grep -r "process.env.REACT_APP_" src/ --include="*.ts" --include="*.tsx"
```

6. Update `package.json` scripts:
```json
{
  "scripts": {
    "start": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

---

### Full Manual Action Checklist

**Before starting:**
- [ ] Create upgrade branch: `git checkout -b upgrade/react-18`
- [ ] Tag current state: `git tag pre-upgrade-backup`
- [ ] Ensure all tests pass on React 16

**React 16 → 17:**
- [ ] `npm install react@17 react-dom@17`
- [ ] `npm install -D @types/react@17 @types/react-dom@17`
- [ ] Set `"jsx": "react-jsx"` in `tsconfig.json`
- [ ] Remove unnecessary `import React from 'react'` imports from JSX files
- [ ] Run tests

**React 17 → 18:**
- [ ] `npm install react@18 react-dom@18`
- [ ] `npm install -D @types/react@18 @types/react-dom@18`
- [ ] Rewrite `src/index.tsx` to use `createRoot`
- [ ] Add `children: React.ReactNode` to components that accept children
- [ ] Fix non-idempotent `useEffect` hooks
- [ ] Fix any failing tests (check `act()` wrapping for async state)
- [ ] Production build: `npm run build`
- [ ] Run tests

**Post-upgrade (separate branch):**
- [ ] Migrate React Router v5 → v6
- [ ] Migrate CRA → Vite

---

### Rollback Plan

```bash
git checkout pre-upgrade-backup -- .
npm install
```
