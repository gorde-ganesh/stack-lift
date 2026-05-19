# StackLift

[![npm version](https://img.shields.io/npm/v/stack-lift.svg)](https://www.npmjs.com/package/stack-lift)
[![npm downloads](https://img.shields.io/npm/dm/stack-lift.svg)](https://www.npmjs.com/package/stack-lift)
[![license](https://img.shields.io/npm/l/stack-lift.svg)](https://github.com/gorde-ganesh/stack-lift/blob/main/LICENSE)

> Interactive upgrade copilot for Angular, React, and TypeScript frontends.

StackLift analyzes legacy frontend projects and guides you through upgrading them — step by step, with choices at every decision point. It asks what you want, shows your options, and writes the artifacts.

It works two ways:

- **As a Claude Code skill** — invoke `/stacklift` inside your editor for AI-guided analysis
- **As a standalone CLI** — run `stack-lift migrate` from your terminal for a fully interactive session

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Use with any LLM](#use-with-any-llm)
- [Usage](#usage)
- [CLI commands](#cli-commands)
- [Interactive migrate flow](#interactive-migrate-flow)
- [Non-interactive / CI mode](#non-interactive--ci-mode)
- [Artifacts](#artifacts)
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
3. **Queries** the live npm registry for outdated and deprecated packages — with peer dependency conflict detection and confidence scoring
4. **Offers choices** for deprecated packages — picks replacement options, shows API similarity and migration effort for each
5. **Plans** a safe incremental upgrade path, never skipping a major version where doing so breaks things
6. **Scans** your source tree to locate every file that needs attention
7. **Applies** automated fixes using AST transforms via ts-morph
8. **Validates** the result by running install → build → test → lint
9. **Writes** versioned markdown, JSON, `findings.json`, and `plan.json` artifacts to an output directory

### Feature status

| Capability | Status |
|---|---|
| Interactive migration | Stable |
| Dependency audit / peer conflicts | Stable |
| Build validation | Stable |
| Session resume | Stable |
| Yarn / pnpm lockfile parsing | Stable |
| AST refactors (TestBed.get, ReactDOM.render, HttpModule) | Stable |
| Additional AST detectors (UNSAFE lifecycles, string refs) | Advisory only |
| CI Node version check | Beta |
| Security audit integration | Beta |
| Monorepo support | Experimental |
| Vue / Svelte / NestJS / Node.js support | Planned |

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

## Use with any LLM

Copy the prompt below and paste it into any AI assistant (Claude, ChatGPT, Gemini, Copilot, etc.) to have it install and run Stack Lift on your project safely.

````
I want to use Stack Lift (https://github.com/gorde-ganesh/stack-lift) on this local project.

Follow these rules exactly:

1. Check if `stack-lift` is installed globally or locally.
   Run: `stack-lift --version` then `npx stack-lift --version`

2. If not installed, suggest the safest method:
   - No install needed: `npx stack-lift <command>`
   - Global: `npm install -g stack-lift`
   - Contributor/local build: `npm run build && npm link` (from repo root)
   Ask me which I prefer before proceeding.

3. Run Stack Lift in audit/dry-run mode ONLY first.
   Do NOT modify any project files yet.
   Command: `stack-lift audit . --markdown --out-dir ./stack-lift-report`

4. Detect and report:
   - Framework name and version (Angular / React / TypeScript)
   - Package manager and lockfile (npm / yarn / pnpm)
   - Deprecated packages with confidence scores
   - Risky or outdated dependencies
   - Peer conflicts and upgrade blockers

5. For every deprecated package found, suggest multiple alternatives.
   List lowest code-impact options first.

6. Do NOT create a migration plan yet.
   Ask me which target version I want to upgrade to first.

7. Show me the exact commands you plan to run before running them.
   Wait for my confirmation.

8. Create a dedicated branch for all changes:
   `git checkout -b chore/stack-lift-audit`

9. Generate a markdown report at: `./stack-lift-report/`
   Do NOT overwrite any existing project files.

Expected output:
- Current project status (framework, versions, tooling)
- Upgrade readiness score and risk level
- Risk list with breaking changes per version hop
- Deprecated package list with alternative suggestions
- Suggested target versions (safe hops first)
- Manual decisions I need to make
- Path to the generated markdown report
````

---

## Usage

### Interactive guided migration (recommended)

```bash
stack-lift migrate ./my-project
```

Runs a step-by-step guided session — see [Interactive migrate flow](#interactive-migrate-flow) below.

---

## CLI commands

| Command | What it does |
|---------|-------------|
| `stack-lift audit <path>` | Read-only findings: deprecated packages, peer conflicts, outdated deps. Evidence source and confidence score on every item. |
| `stack-lift migrate <path>` | Full interactive guided session — asks intent, target, replacements, backup, output formats. |
| `stack-lift plan <path>` | Generate and display the upgrade plan without full dependency analysis. |
| `stack-lift apply <path>` | Execute the plan: apply automated AST fixes then run build validation. |
| `stack-lift resume [path]` | Resume an interrupted `migrate` session from `.stacklift/session.json`. |
| `stack-lift upgrade <path>` | _(legacy)_ Full report in terminal; use `migrate` or `apply` instead. |
| `stack-lift analyze <path>` | _(legacy)_ Alias for `audit`. |

### Key flags

```bash
# audit
stack-lift audit ./my-project --json --markdown --out-dir ./reports

# migrate — interactive
stack-lift migrate ./my-project

# migrate — CI / non-interactive
stack-lift migrate ./my-project \
  --non-interactive \
  --target 18 \
  --objective minimal-risk \
  --validate \
  --json --markdown \
  --out-dir ./stacklift-output

# migrate flags
  -n, --non-interactive     Skip all prompts; use provided flags
  -t, --target <version>    Target major version (e.g. 18)
  -o, --objective <name>    minimal-risk | security | modernization | performance | full-migration
  -y, --yes                 Auto-approve all prompts
      --dry-run             Show what would be done; no writes, no git backup
      --apply               Apply automated AST code fixes in-place
      --validate            Run install → build → test → lint after planning
      --json                Include JSON in output artifacts
      --markdown            Include Markdown in output artifacts (default: on)
      --out-dir <dir>       Output directory (default: ./stacklift-output)

# plan — also works non-interactively
stack-lift plan ./my-project --to 18 --json --markdown

# apply
stack-lift apply ./my-project --to 18 --validate

# resume
stack-lift resume ./my-project
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

Queries the npm registry, detects peer conflicts, and shows findings with confidence scores before asking to continue:

```
✔ Found 6 outdated package(s), 2 peer conflict(s)

  Deprecated packages (3):
  ● codelyzer 6.0.2 — Deprecated. Use angular-eslint instead. [confidence: high]
  ● tslint 5.20.1 — Deprecated Jan 2020. Migrate to ESLint + @typescript-eslint. [confidence: high]
  ● node-sass 6.0.1 — Deprecated. Use sass (Dart Sass) instead. [confidence: high]

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

Progress is saved to `.stacklift/session.json` after each phase. If you exit mid-session, re-running `stack-lift migrate` offers to resume. Or run:

```bash
stack-lift resume ./my-project
```

---

## Non-interactive / CI mode

`migrate` and `plan` work fully non-interactively for use in CI pipelines or scripts:

```bash
# Minimal-risk Angular 18 upgrade — no prompts
stack-lift migrate ./my-project \
  --non-interactive \
  --target 18 \
  --objective minimal-risk \
  --validate \
  --json --markdown

# Security-focused upgrade with auto-fixes
stack-lift migrate ./my-project \
  --non-interactive \
  --target 17 \
  --objective security \
  --apply \
  --yes

# Generate plan only (CI audit)
stack-lift plan ./my-project --to 18 --json --out-dir ./ci-output

# Read-only audit with machine-readable output
stack-lift audit ./my-project --json --out-dir ./ci-output
```

In non-interactive mode:
- Prompts are skipped entirely
- `--objective` defaults to `minimal-risk`
- Backup strategy defaults to `none`
- All four artifact files are always written (`report.md`, `report.json`, `findings.json`, `plan.json`)

---

## Artifacts

Every `migrate`, `apply`, or `audit --json/--markdown` run writes versioned files to the output directory:

```
./stacklift-output/
  stacklift-report-angular-16.2.12-to-17.md    # Human-readable markdown report
  stacklift-report-angular-16.2.12-to-17.json  # Full report as JSON
  findings.json                                  # Structured findings (CI-readable)
  plan.json                                      # Machine-readable upgrade plan + decisions
```

### findings.json

Evidence-based list of every finding. Designed for CI parsing and dashboard ingestion:

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2025-01-15T10:30:00.000Z",
  "summary": { "totalFindings": 8, "deprecated": 3, "outdated": 3, "peerConflicts": 2 },
  "findings": [
    {
      "type": "deprecated_package",
      "package": "moment",
      "current": "2.29.0",
      "latest": "2.30.1",
      "riskLevel": "medium",
      "riskCategory": "deprecated",
      "confidence": "high",
      "source": "package.json",
      "evidence": "npm registry query",
      "reason": "Moment.js is in maintenance-only mode."
    }
  ]
}
```

### plan.json

Machine-readable upgrade plan with steps, decisions, and build validation results:

```json
{
  "schemaVersion": "1.0",
  "framework": "Angular",
  "fromVersion": "16",
  "toVersion": "17",
  "strategy": "direct",
  "riskLevel": "low",
  "estimatedEffort": "1–2 hours",
  "decisions": { "objective": "minimal-risk", "targetVersion": "17" },
  "steps": [ ... ],
  "buildValidation": [
    { "step": "install", "status": "success", "durationMs": 4200 },
    { "step": "build",   "status": "success", "durationMs": 8100 },
    { "step": "test",    "status": "success", "durationMs": 3500 },
    { "step": "lint",    "status": "skipped" }
  ]
}
```

Each markdown report includes:
- Evidence sources table (what was read from files vs inferred vs live registry)
- Confidence score on every dependency finding and breaking change
- Peer dependency conflict table
- Per-step breaking changes with official Angular/React migration guide links
- Effort estimate with its basis (breaking change count, not LOC)
- Detected code issues with file:line locations
- Build validation results table
- Manual action checklist
- Rollback plan

---

## Supported frameworks

### Current (v1.0)

| Framework  | Upgrade path covered                                              | Maturity |
|------------|------------------------------------------------------------------|----------|
| Angular    | 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20           | Stable   |
| React      | 16 → 17 → 18 → 19                                               | Beta     |
| TypeScript | 4.x → 5.x                                                       | Stable   |

> **React support is in beta.** Detection, planning, and breaking-change catalogues work for React 16–19. The `ReactDOM.render` → `createRoot` and `ReactDOM.hydrate` → `hydrateRoot` AST refactors are implemented but have had less real-world testing than the Angular transforms. Fixes, edge cases, and additional automated refactors are welcome — see [Contributing](#contributing).

### Detected build tooling

Webpack, Vite, Parcel, Rollup, Create React App, Angular CLI

### Package replacements

StackLift knows alternatives for these deprecated or maintenance-mode packages and presents them as interactive choices:

| Deprecated | Reason | Alternatives offered |
|------------|--------|----------------------|
| `moment` | Maintenance-only, 72KB | dayjs, date-fns, luxon |
| `protractor` | Deprecated by Angular team 2021 | @playwright/test, cypress, webdriverio |
| `codelyzer` | Replaced by angular-eslint | @angular-eslint/eslint-plugin |
| `tslint` | Deprecated Jan 2020 | eslint + @typescript-eslint |
| `node-sass` | LibSass deprecated | sass (Dart Sass) |
| `react-scripts` | CRA unmaintained since 2023 | vite, next.js |
| `request` | Deprecated Feb 2020 | axios, got, node-fetch |
| `babel-core` | Replaced by @babel/core v7 | @babel/core |
| `@angular/flex-layout` | Archived, unmaintained | CSS native, @ngbracket/ngx-layout, tailwindcss |
| `karma` | End-of-life 2023 | @web/test-runner, jest, vitest |
| `jasmine-core` | Angular moving away from Karma/Jasmine | jest, @web/test-runner + jasmine |
| `lodash` | Large bundle, native JS covers most cases | Native JS, lodash-es, remeda |
| `jquery` | DOM conflicts with SPA frameworks | Native DOM APIs, framework-native refs |
| `@angular-material-components/datetime-picker` | Abandoned, incompatible with Angular 17+ | @dhutaryan/ngx-mat-timepicker, native Material |
| `rxjs-compat` | Bridge for RxJS 5→6, no longer needed | rxjs pipeable operators |
| `zone.js` | Superseded by zoneless (Angular 18+) | provideExperimentalZonelessChangeDetection() |
| `classnames` | Superseded by smaller alternative | clsx |

### Monorepo detection

**Status: Experimental.** Detection is stable — StackLift identifies monorepos via `workspaces` in `package.json`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, and `turbo.json`, and flags the fact in its output. Per-workspace upgrade plans, scoped execution, workspace-aware build validation, and dependency-graph analysis are not yet implemented. For monorepos, run `stack-lift migrate` on each workspace package directory individually.

### Planned

Node.js, Express, NestJS, Next.js (full), Nuxt, Vue, Svelte

---

## Architecture

StackLift is a monorepo with Turbo orchestration. Published packages:

| Package | Purpose |
|---|---|
| `stack-lift` | Commander CLI — audit / migrate / plan / apply / resume |
| `@stack-lift/core` | All analysis engines (detector, planner, executor, reporter) |
| `@stack-lift/angular-provider` | Angular-specific upgrade step catalogue |
| `@stack-lift/shared` | Shared TypeScript types (`StackInfo`, `UpgradePlan`, etc.) |
| `@stack-lift/schemas` | JSON schema definitions and `SCHEMA_VERSION` constant |

```
packages/
├── cli/src/
│   ├── cli.ts                      # Commander entry point
│   ├── skills-cli.ts               # Skills management commands
│   ├── skills/                     # Skill manager and registry
│   └── prompts/
│       └── interaction.ts          # Interactive + non-interactive migrate flow
├── core/src/
│   ├── detector/                   # stack-detector, ci-detector
│   ├── planner/                    # upgrade-planner, breaking-change-analyzer
│   ├── dependency-intelligence/    # dependency-analyzer, npm-registry
│   ├── orchestration/              # orchestrator (pipeline entry point), session
│   ├── execution/                  # refactor-engine, command-runner, rollback-manager
│   ├── validation/                 # build-validator
│   ├── reporting/                  # doc-generator, artifact-writer
│   ├── diagnostics/                # failure-classifier
│   ├── migration/                  # config-migrator
│   ├── providers/                  # FrameworkProvider interface, registry, react-provider
│   ├── path-guard.ts               # Path traversal protection
│   └── knowledge/                  # Static breaking-change catalogues per framework
├── angular-provider/src/           # Angular provider (registers via registerFrameworkProvider)
├── shared/src/                     # Shared types
└── schemas/src/                    # JSON schemas + SCHEMA_VERSION
tests/
├── fixtures/                       # Minimal package.json stubs per archetype
└── *.test.ts                       # 165 unit + integration tests (vitest)
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
dependency-analyzer   — outdated packages, peer conflict detection, confidence scoring, evidence tagging
    ↓
upgrade-planner       — incremental version path, effort estimate with basis
    ↓
breaking-change-analyzer  — source file locations (file:line) needing attention
    ↓
refactor-engine       — AST transforms via ts-morph (optional --apply)
    ↓
build-validator       — install → build → test → lint (optional --validate)
    ↓
artifact-writer       — report.md, report.json, findings.json, plan.json
```

### Evidence model

Every claim in a StackLift report is tagged with how it was established and a confidence score:

| Tag | Confidence | Meaning |
|-----|-----------|---------|
| **Observed** | high | Read directly from a file (package.json version, tsconfig option, lockfile entry) |
| **Registry** | high | Fetched from the live npm registry during this run |
| **Inferred** | medium | Derived from a static rule — always shown with the rule |

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

### CI pipeline audit

```bash
stack-lift audit ./my-angular-app --json --out-dir ./ci-reports
# findings.json and plan.json written to ./ci-reports/
```

### Non-interactive CI migration

```bash
stack-lift migrate ./my-project \
  --non-interactive --target 18 --objective minimal-risk \
  --validate --json --markdown
```

Exits 0 on success; artifacts written; build validation results in `plan.json`.

### React 17 → 18 with auto-fixes

```bash
stack-lift apply ./my-react-app --to 18 --validate
```

Automatically rewrites `ReactDOM.render` → `createRoot`, `ReactDOM.hydrate` → `hydrateRoot`. Runs build validation afterwards. Flags batching behavior changes and StrictMode double-invocation for manual review.

### Resume an interrupted session

```bash
stack-lift resume ./my-project
```

Loads `.stacklift/session.json`, shows saved phase and decisions, offers to continue or restart.

---

## Contributing

Contributions are welcome. High-value additions:

**Knowledge base entries** (`packages/core/src/knowledge/`)
Breaking changes for framework versions not yet covered. Each entry needs: `api`, `description`, `before`/`after` examples, `automated` flag, `severity`, `searchPattern`, and `referenceUrl`.

**Package replacement entries** (`packages/core/src/knowledge/replacements.ts`)
New deprecated packages with structured alternatives: `name`, `apiSimilarity`, `migrationEffort`, `bundleNote`, `notes`.

**Automated refactor patterns** (`packages/core/src/execution/refactor-engine.ts`)
AST transforms using ts-morph. Add a new function following the `replaceTestBedGet` pattern and register it in `TRANSFORM_MAP`.

**New framework support**
Vue, Nuxt, Next.js, Svelte, NestJS — follow the Angular/React pattern in `packages/core/src/knowledge/`.

### Development setup

```bash
git clone https://github.com/gorde-ganesh/stack-lift
cd stack-lift
npm install
npm test              # 165 unit + integration tests
npm run build         # tsup → dist/
npm run dev -- migrate ./path/to/project
```

### Quality checks

```bash
npm run typecheck     # tsc --noEmit (strict: noUncheckedIndexedAccess, exactOptionalPropertyTypes)
npm run lint          # ESLint with @typescript-eslint/recommended-type-checked
npm run format:check  # Prettier check
npm test              # Vitest unit + integration tests
npm run build         # tsup ESM + DTS build
npm pack --dry-run    # Validate package contents
```

---

## License

MIT — see [LICENSE](LICENSE).
