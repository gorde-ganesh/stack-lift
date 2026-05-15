# StackLift

> AI-powered frontend project upgrade skill for modernizing legacy codebases.

StackLift is a Claude Code–compatible AI skill and CLI tool that analyzes Angular, React, and TypeScript projects and produces incremental upgrade plans, breaking-change inventories, dependency modernization recommendations, and automated code refactors.

It works in two ways:

- **As a skills.sh AI skill** — invoke it inside Claude Code to get upgrade guidance on any project in your editor
- **As a standalone CLI** — run `stack-lift` against any frontend repository from your terminal

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Supported Frameworks](#supported-frameworks)
- [Architecture](#architecture)
- [Example Workflows](#example-workflows)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Upgrading a legacy frontend project is one of the most expensive recurring engineering tasks. A single Angular 12 → 18 migration involves six major-version hops, dozens of breaking API changes, deprecated tooling, peer-dependency conflicts, and manual refactoring across an entire codebase.

StackLift eliminates the research burden. It:

1. **Detects** your project's exact stack — framework, version, build tool, TypeScript, RxJS, package manager, and monorepo layout
2. **Plans** a safe incremental upgrade route (never skips a major version where doing so breaks things)
3. **Inventories** every breaking change between your current and target version
4. **Queries** the live npm registry to find outdated and deprecated packages — with caching, timeouts, and offline fallback
5. **Scans** your source tree to locate which files need attention
6. **Applies** automated fixes using AST transforms — not regex — so rewrites are structurally correct
7. **Documents** everything — a markdown report with code examples, a manual-action checklist, and a rollback plan

---

## Installation

### Skill install (recommended)

```bash
# One-shot — no global install needed
npx stack-lift skills add stacklift

# Or install the CLI globally first, then use it anywhere
npm install -g stack-lift
skills add stacklift
```

Both commands copy the skill into `~/.claude/skills/stacklift/`. Once it's there, invoke it inside Claude Code:

```
/stacklift
```

### Other skill commands

```bash
skills list                  # show installed skills
skills search angular        # browse available skills
skills remove stacklift      # uninstall a skill
skills add stacklift --dir ./custom/path   # custom install dir
```

The same sub-commands are available under the `stack-lift` binary too:

```bash
stack-lift skills add stacklift
stack-lift skills list
stack-lift skills search
```

### Standalone CLI only

**Requirements:** Node.js ≥ 18

```bash
npm install -g stack-lift
```

Or build from source:

```bash
git clone https://github.com/gorde-ganesh/stack-lift
cd stack-lift
npm install && npm run build && npm link
```

---

## Usage

### CLI

```bash
# Detect stack and list outdated packages (queries live npm registry)
stack-lift analyze ./my-project

# Show the upgrade path and risk level without writing anything
stack-lift plan ./my-project --to 18

# Full upgrade report in the terminal
stack-lift upgrade ./my-project --to 18

# Write a Markdown report to UPGRADE_REPORT.md
stack-lift upgrade ./my-project --to 18 --output markdown

# Write a machine-readable JSON report
stack-lift upgrade ./my-project --to 18 --output json

# Apply automated AST-based code fixes in-place
stack-lift upgrade ./my-project --to 18 --apply

# Preview what automated fixes would change, without writing any files
stack-lift upgrade ./my-project --to 18 --apply --dry-run
```

### AI Skill (Claude Code)

```
/stacklift

> Project path: ./my-angular-app
> Target version: 18
```

Claude will run the full analysis workflow and stream results back with inline code examples, a manual-action checklist, and a risk assessment.

---

## Supported Frameworks

### Phase 1 (current)

| Framework  | Versions covered                                          |
|------------|----------------------------------------------------------|
| Angular    | 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18              |
| React      | 16 → 17 → 18 → 19                                        |
| TypeScript | 4.x → 5.x                                                |

### Detected build tooling

Webpack, Vite, Parcel, Rollup, Create React App, Angular CLI

### Monorepo detection

StackLift automatically detects monorepo layouts and warns you to analyze each workspace package individually. Detected via: `workspaces` in `package.json`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`.

### Phase 2 (planned)

Node.js, Express, NestJS, Next.js, Nuxt, Vue, Svelte

---

## Architecture

```
stack-lift/
├── src/
│   ├── cli.ts                           # Commander CLI entry point
│   ├── index.ts                         # Public library API
│   ├── types/
│   │   └── index.ts                     # Shared TypeScript types
│   ├── knowledge/
│   │   ├── angular.ts                   # Angular breaking changes per major hop
│   │   ├── react.ts                     # React breaking changes per major hop
│   │   └── typescript.ts               # TypeScript upgrade notes
│   └── engines/
│       ├── stack-detector.ts            # Reads project files → StackInfo
│       ├── npm-registry.ts              # Live npm registry client with cache
│       ├── dependency-analyzer.ts       # Compares installed vs latest/deprecated
│       ├── upgrade-planner.ts           # Builds safe incremental upgrade path
│       ├── breaking-change-analyzer.ts  # Scans source for affected patterns
│       ├── refactor-engine.ts           # AST-based automated code transforms
│       ├── path-guard.ts                # Path traversal security guard
│       ├── doc-generator.ts             # Renders markdown/JSON reports
│       └── orchestrator.ts             # Wires all engines into runUpgrade()
├── skills/
│   └── stacklift/
│       ├── SKILL.md                     # skills.sh skill definition
│       ├── examples/                    # Worked upgrade examples
│       └── templates/                  # Reusable report templates
└── tests/
    ├── fixtures/                        # Sample project package.json files
    └── *.test.ts                        # Unit tests (vitest)
```

### Engine pipeline

```
User project
    ↓
stack-detector        — framework, version, build tool, package manager, monorepo
    ↓
npm-registry          — live latest/deprecated data (5-min cache, offline fallback)
    ↓
dependency-analyzer   — outdated / deprecated packages, risk levels
    ↓
upgrade-planner       — incremental version path, total breaking changes
    ↓
breaking-change-analyzer  — source file locations needing attention
    ↓
refactor-engine       — AST transforms via ts-morph (optional --apply)
    ↓
doc-generator         — markdown / JSON / terminal output
```

### Live npm registry

The dependency analyzer queries `registry.npmjs.org` for every package in your `package.json`:

- Results are cached in-process for 5 minutes
- Each request has a 4-second timeout with `AbortController`
- If the registry is unreachable, a built-in `KNOWN_DEPRECATED` map provides offline fallback for common packages (tslint, node-sass, react-scripts, moment, etc.)

### AST-based refactors

Automated code fixes use [ts-morph](https://ts-morph.com/) to manipulate the TypeScript/JavaScript AST directly — never regex on raw source text. Supported transforms:

| Pattern | Transform |
|---------|-----------|
| `TestBed.get(T)` | → `TestBed.inject(T)` |
| `ReactDOM.render(<App />, el)` | → `createRoot(el).render(<App />)` |
| `ReactDOM.hydrate(jsx, el)` | → `hydrateRoot(el, jsx)` |
| `import { HttpModule } from '@angular/http'` | → `@angular/common/http` with `HttpClientModule` |
| `initialNavigation: 'enabled'` | → `'enabledBlocking'` |

### Security

All project paths are validated by `path-guard.ts` before any filesystem access. Paths outside `$HOME`, `$TMPDIR`, and the current working directory are rejected to prevent path traversal.

---

## Example Workflows

### Angular 12 → 18

```bash
stack-lift upgrade ./my-angular-app --to 18 --output markdown
```

Output: `UPGRADE_REPORT.md` containing:

- 6-step incremental plan (12 → 13 → 14 → 15 → 16 → 17 → 18)
- 18 breaking changes across all steps
- 5 automated fixes (TestBed.get, initialNavigation, control-flow syntax)
- Per-step npm install commands
- Manual action checklist
- Rollback instructions

### React 17 → 18

```bash
stack-lift upgrade ./my-react-app --to 18 --apply
```

Automatically rewrites:

- `ReactDOM.render(<App />, el)` → `createRoot(el).render(<App />)`
- `ReactDOM.hydrate(...)` → `hydrateRoot(...)`

Flags for manual attention:

- Automatic batching behavior changes
- `StrictMode` double-effect invocation
- `unmountComponentAtNode` deprecation

### Dependency audit only

```bash
stack-lift analyze ./legacy-app
```

Flags in seconds (querying the live npm registry):

- `tslint` — deprecated, migrate to `@typescript-eslint`
- `node-sass` — deprecated, replace with `sass` (Dart Sass)
- `react-scripts` — unmaintained, migrate to Vite or Next.js
- `moment` — maintenance mode, consider `date-fns` or `day.js`

---

## Contributing

Contributions are welcome. The most valuable additions are:

**Knowledge base entries** (`src/knowledge/`)
Adding breaking changes for framework versions not yet covered. Each entry needs: `api`, `description`, `before`/`after` examples, `automated` flag, `severity`, `searchPattern`.

**Automated refactor patterns** (`src/engines/refactor-engine.ts`)
AST transforms using ts-morph for known automated migrations. Add a new function following the `replaceTestBedGet` pattern and register it in `TRANSFORM_MAP`.

**New framework support**
Vue, Nuxt, Next.js, Svelte, NestJS — follow the Angular/React pattern in `src/knowledge/`.

### Development setup

```bash
git clone https://github.com/gorde-ganesh/stack-lift
cd stack-lift
npm install
npm test            # 23 unit tests
npm run build       # tsup → dist/
npm run dev -- upgrade ./path/to/project --to 18
```

### Quality checks

```bash
npm run typecheck     # tsc --noEmit (strict: noUncheckedIndexedAccess, exactOptionalPropertyTypes)
npm run lint          # ESLint with @typescript-eslint/recommended-type-checked
npm run format:check  # Prettier check
npm test              # Vitest unit tests
npm run build         # tsup ESM + DTS build
npm pack --dry-run    # Validate package contents
```

CI runs all of the above across Node.js 18, 20, and 22 on every push and pull request.

---

## License

MIT — see [LICENSE](LICENSE).
