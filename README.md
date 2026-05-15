# StackLift

> Interactive upgrade copilot for Angular, React, and TypeScript frontends.

StackLift analyzes legacy frontend projects and guides you through upgrading them — step by step, with choices at every decision point. It asks what you want, shows your options, and writes the artifacts.

It works two ways:

- **As a Claude Code skill** — invoke `/stacklift` inside your editor for AI-guided analysis
- **As a standalone CLI** — run `stack-lift migrate` from your terminal for a fully interactive session

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Interactive migrate flow](#interactive-migrate-flow)
- [Supported frameworks](#supported-frameworks)
- [Architecture](#architecture)
- [Example workflows](#example-workflows)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Upgrading a legacy frontend is expensive. Angular 12 → 20 involves nine major-version hops, dozens of breaking API changes, deprecated tooling, peer-dependency conflicts, and manual refactoring across an entire codebase — and every project makes different tradeoffs.

StackLift replaces the guesswork. It:

1. **Detects** your stack — framework version, build tool, TypeScript, RxJS, package manager, lockfile, tsconfig compiler options, monorepo layout
2. **Asks** what you actually want: minimal risk? security cleanup? full modernization?
3. **Queries** the live npm registry for outdated and deprecated packages — with peer dependency conflict detection
4. **Offers choices** for deprecated packages — picks replacement options, shows API similarity and migration effort for each
5. **Plans** a safe incremental upgrade path, never skipping a major version where doing so breaks things
6. **Scans** your source tree to locate every file that needs attention
7. **Applies** automated fixes using AST transforms via ts-morph
8. **Writes** a versioned markdown report, JSON report, and per-step checklist to an output directory

---

## Installation

### CLI (recommended)

```bash
npm install -g stack-lift
```

Or run without installing:

```bash
npx stack-lift migrate ./my-project
```

**Requirements:** Node.js ≥ 18

### Skill install (Claude Code)

```bash
# Install the skill into ~/.claude/skills/
npx stack-lift skills add stacklift

# Or with the CLI already installed globally
skills add stacklift
```

Once installed, invoke it inside Claude Code:

```
/stacklift
```

#### Project-local skill install

To scope the skill to a single project, install it into `.claude/skills/` inside your repo:

```bash
cd my-project
npx stack-lift skills add stacklift --dir .claude/skills
```

Claude Code discovers skills in `.claude/skills/` automatically when you open the project. Commit the directory to share it with your team.

> **Note:** The skill provides AI-guided analysis. For live registry lookups and AST transforms, the `stack-lift` CLI also needs to be available — via global install or `npx stack-lift`. Without it, Claude reads your `package.json` directly and provides guidance without the automated fixes.

### Other skill commands

```bash
skills list                              # show installed skills
skills search angular                    # browse available skills
skills remove stacklift                  # uninstall
skills add stacklift --dir ./custom      # custom install dir

stack-lift skills add stacklift          # same, via main binary
```

### Build from source

```bash
git clone https://github.com/gorde-ganesh/stack-lift
cd stack-lift
npm install && npm run build && npm link
```

---

## Usage

### Interactive guided migration (recommended)

```bash
stack-lift migrate ./my-project
```

Runs a step-by-step guided session — see [Interactive migrate flow](#interactive-migrate-flow) below.

### Non-interactive commands

```bash
# Detect stack and list outdated packages
stack-lift analyze ./my-project

# Show the upgrade path without full analysis
stack-lift plan ./my-project --to 18

# Full upgrade report in the terminal
stack-lift upgrade ./my-project --to 18

# Write markdown and JSON reports to ./stacklift-output/
stack-lift upgrade ./my-project --to 18 --output markdown,json

# Write to a custom directory
stack-lift upgrade ./my-project --to 18 --output markdown,json --out-dir ./reports

# Apply automated AST-based fixes in-place
stack-lift upgrade ./my-project --to 18 --apply
```

### AI Skill (Claude Code)

```
/stacklift
```

Claude runs the full analysis workflow and streams results with inline code examples, a manual-action checklist, and a risk assessment. It reads actual project files — not a description of them.

---

## Interactive migrate flow

`stack-lift migrate` runs a four-phase guided session:

```
stack-lift migrate ./my-angular-app
```

### Phase 1 — Discovery

Scans the project and shows what was found:

```
◆ Phase 1 — Discovery
  Framework      Angular 16.2.12
  TypeScript     4.9.5 (strict mode off)
  RxJS           7.5.0
  Build tool     Angular CLI
  Pkg manager    npm
  Lockfile       parsed (exact versions)
```

### Phase 2 — Intent

```
Migration objective?
❯ Minimal risk — just make the build pass, touch as little as possible
  Security cleanup — remove vulnerable and deprecated packages first
  Modernization — best practices, standalone components, strict types
  Performance — move to Vite/esbuild, reduce bundle size
  Full migration — do everything: framework, deps, tooling, patterns

Target Angular version?
❯ Angular 17 — lower risk, 1 hop
  Angular 18 (recommended stable) — moderate, 2 hops
  Angular 19 — higher effort, 3 hops
  Angular 20 — higher effort, 4 hops
```

### Phase 3 — Analysis

Queries the npm registry, detects peer conflicts, and shows findings before asking to continue:

```
✔ Found 6 outdated package(s), 2 peer conflict(s)

  Deprecated packages (3):
  ● codelyzer 6.0.2 — Deprecated. Use angular-eslint instead.
  ● tslint 5.20.1 — Deprecated Jan 2020. Migrate to ESLint + @typescript-eslint.
  ● node-sass 6.0.1 — Deprecated. Use sass (Dart Sass) instead.

  Peer conflicts (2):
  ● primeng 13.4.2 does not satisfy ^16.0.0 required by @angular/core
```

### Phase 4 — Decisions

For each deprecated package, shows replacement options with API similarity, effort, and source occurrence count:

```
⚠ codelyzer — deprecated. Use angular-eslint instead.
  found in 0 locations (transitive only)

Replace codelyzer with?
❯ @angular-eslint/eslint-plugin — Official replacement, drop-in for most rules
                                  [API similar] effort: low
  Keep codelyzer temporarily

Create a backup before starting?
❯ Create a git branch (git checkout -b upgrade/stack-lift)
  Create a git tag (git tag pre-upgrade-backup)
  No backup — I will manage it myself

Generate artifacts
❯ ◉ Markdown report
  ◉ JSON report (for CI / tooling)

Output directory
> ./stacklift-output
```

### Confirmation and execution

```
  Objective   minimal-risk
  Target      Angular 17
  Backup      branch
  Output      markdown, json → ./stacklift-output
  Replace     codelyzer → @angular-eslint/eslint-plugin
              node-sass → sass
  Defer       tslint

Generate plan and write artifacts? (Y/n)
```

Then executes: git backup → plan generation → source scan → artifact write → checklist.

### Session resumability

Progress is saved to `.stacklift/session.json` after each phase. If you exit mid-session, re-running `stack-lift migrate` offers to resume where you left off.

### Artifacts

Reports are written to the output directory with versioned filenames:

```
./stacklift-output/
  stacklift-report-angular-16.2.12-to-17.md
  stacklift-report-angular-16.2.12-to-17.json
```

Each report includes:
- Evidence sources table (what was read from files vs inferred vs live registry)
- Peer dependency conflict table
- Per-step breaking changes with official Angular/React migration guide links
- Effort estimate with its basis (breaking change count, not LOC)
- Detected code issues with file:line locations
- Manual action checklist
- Rollback plan

---

## Supported frameworks

### Current (v0.2)

| Framework  | Upgrade path covered                                              |
|------------|------------------------------------------------------------------|
| Angular    | 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20           |
| React      | 16 → 17 → 18 → 19                                               |
| TypeScript | 4.x → 5.x                                                       |

### Detected build tooling

Webpack, Vite, Parcel, Rollup, Create React App, Angular CLI

### Package replacements

StackLift knows alternatives for these deprecated packages and presents them as interactive choices:

| Deprecated | Alternatives offered |
|------------|----------------------|
| `moment` | dayjs, date-fns, luxon |
| `protractor` | @playwright/test, cypress, webdriverio |
| `codelyzer` | @angular-eslint/eslint-plugin |
| `tslint` | eslint + @typescript-eslint |
| `node-sass` | sass (Dart Sass) |
| `react-scripts` | vite, next.js |
| `request` | axios, got, node-fetch |
| `babel-core` | @babel/core |

### Monorepo detection

Detected via: `workspaces` in `package.json`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`. Root-level shared dependencies are flagged separately from per-project dependencies.

### Planned (v0.3+)

Node.js, Express, NestJS, Next.js (full), Nuxt, Vue, Svelte

---

## Architecture

```
stack-lift/
├── src/
│   ├── cli.ts                           # Commander CLI — migrate / upgrade / analyze / plan
│   ├── index.ts                         # Public library API
│   ├── types/
│   │   └── index.ts                     # Shared TypeScript types
│   ├── knowledge/
│   │   ├── angular.ts                   # Breaking changes per hop (v10–v20) + reference URLs
│   │   ├── react.ts                     # React breaking changes per hop
│   │   ├── replacements.ts              # Deprecated package alternatives metadata
│   │   └── typescript.ts               # TypeScript upgrade notes
│   └── engines/
│       ├── interaction.ts               # Interactive migrate flow (@inquirer/prompts)
│       ├── session.ts                   # .stacklift/session.json resumability
│       ├── artifact-writer.ts           # Writes versioned markdown/JSON to output dir
│       ├── stack-detector.ts            # Reads project files → StackInfo (incl. lockfile + tsconfig)
│       ├── npm-registry.ts              # Live npm registry client with cache + peer dep capture
│       ├── dependency-analyzer.ts       # Outdated/deprecated packages + peer conflict detection
│       ├── upgrade-planner.ts           # Safe incremental upgrade path with effort basis
│       ├── breaking-change-analyzer.ts  # Source file scan for affected patterns
│       ├── refactor-engine.ts           # AST transforms via ts-morph
│       ├── path-guard.ts                # Path traversal security guard
│       ├── doc-generator.ts             # Markdown/JSON report renderer
│       └── orchestrator.ts             # Wires all engines into runUpgrade()
├── skills/
│   └── stacklift/
│       ├── SKILL.md                     # Claude Code skill definition
│       ├── examples/                    # Worked upgrade examples
│       └── templates/                  # Report templates
└── tests/
    ├── fixtures/                        # Sample project package.json files
    └── *.test.ts                        # Unit tests (vitest)
```

### Engine pipeline

```
User project
    ↓
stack-detector        — framework, version, build tool, package manager,
                        lockfile (resolved versions), tsconfig compiler options
    ↓
npm-registry          — live latest/deprecated/peerDependencies (5-min cache, offline fallback)
    ↓
dependency-analyzer   — outdated packages, peer conflict detection, evidence tagging
    ↓
upgrade-planner       — incremental version path, effort estimate with basis
    ↓
breaking-change-analyzer  — source file locations (file:line) needing attention
    ↓
refactor-engine       — AST transforms via ts-morph (optional --apply)
    ↓
artifact-writer       — versioned markdown + JSON to output directory
```

### Evidence model

Every claim in a StackLift report is tagged with how it was established:

| Tag | Meaning |
|-----|---------|
| **Observed** | Read directly from a file (package.json version, tsconfig option, lockfile entry) |
| **Registry** | Fetched from the live npm registry during this run |
| **Inferred** | Derived from a static rule — always shown with the rule |

Reports include a lockfile status indicator. If no lockfile was found, version numbers come from package.json ranges and may not match what is actually installed.

### Peer dependency detection

For each package, StackLift fetches the `peerDependencies` declared by its latest version and checks them against your installed packages. Conflicts are surfaced in the Phase 3 analysis and in the written report — before any upgrade steps are recommended.

### AST-based refactors

Automated code fixes use [ts-morph](https://ts-morph.com/) to manipulate the AST — not raw text. Supported transforms:

| Pattern | Transform |
|---------|-----------|
| `TestBed.get(T)` | → `TestBed.inject(T)` |
| `ReactDOM.render(<App />, el)` | → `createRoot(el).render(<App />)` |
| `ReactDOM.hydrate(jsx, el)` | → `hydrateRoot(el, jsx)` |
| `import { HttpModule } from '@angular/http'` | → `HttpClientModule` from `@angular/common/http` |
| `initialNavigation: 'enabled'` | → `'enabledBlocking'` |

### Security

All project paths are validated by `path-guard.ts` before any filesystem access. Paths outside `$HOME`, `$TMPDIR`, and the current working directory are rejected to prevent path traversal.

---

## Example workflows

### Guided migration — Angular 16 → 18

```bash
stack-lift migrate ./my-angular-app
```

Session flow: choose objective → choose target version → review findings → pick replacements for deprecated packages → confirm → artifacts written.

### Non-interactive report

```bash
stack-lift upgrade ./my-angular-app --to 18 --output markdown,json
```

Writes to `./stacklift-output/stacklift-report-angular-*.md` and `.json`.

### React 17 → 18 with auto-fixes

```bash
stack-lift upgrade ./my-react-app --to 18 --apply
```

Automatically rewrites `ReactDOM.render` → `createRoot`, `ReactDOM.hydrate` → `hydrateRoot`. Flags batching behavior changes and StrictMode double-invocation for manual review.

### Dependency audit only

```bash
stack-lift analyze ./legacy-app
```

Queries the live npm registry and reports peer conflicts alongside outdated packages in seconds.

---

## Contributing

Contributions are welcome. High-value additions:

**Knowledge base entries** (`src/knowledge/`)
Breaking changes for framework versions not yet covered. Each entry needs: `api`, `description`, `before`/`after` examples, `automated` flag, `severity`, `searchPattern`, and `referenceUrl`.

**Package replacement entries** (`src/knowledge/replacements.ts`)
New deprecated packages with structured alternatives: `name`, `apiSimilarity`, `migrationEffort`, `bundleNote`, `notes`.

**Automated refactor patterns** (`src/engines/refactor-engine.ts`)
AST transforms using ts-morph. Add a new function following the `replaceTestBedGet` pattern and register it in `TRANSFORM_MAP`.

**New framework support**
Vue, Nuxt, Next.js, Svelte, NestJS — follow the Angular/React pattern in `src/knowledge/`.

### Development setup

```bash
git clone https://github.com/gorde-ganesh/stack-lift
cd stack-lift
npm install
npm test              # 23 unit tests
npm run build         # tsup → dist/
npm run dev -- migrate ./path/to/project
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

---

## License

MIT — see [LICENSE](LICENSE).
