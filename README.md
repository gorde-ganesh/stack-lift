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

1. **Detects** your project's exact stack — framework, version, build tool, TypeScript, RxJS, and package manager
2. **Plans** a safe incremental upgrade route (never skips a major version where doing so breaks things)
3. **Inventories** every breaking change between your current and target version
4. **Scans** your source tree to locate which files need attention
5. **Applies** automated fixes where possible (regex-safe transforms: import rewrites, API renames)
6. **Documents** everything — a markdown report with code examples, a manual-action checklist, and a rollback plan

---

## Installation

```bash
git clone https://github.com/gorde-ganesh/stack-lift ~/.claude/skills/stacklift
```

Once installed, invoke inside Claude Code:

```
/stacklift
```

Claude will prompt you for a project path and target version, then run the full upgrade workflow.

### As a Standalone CLI

**Requirements:** Node.js ≥ 18

```bash
# From npm (once published)
npm install -g stack-lift

# Or build from source
git clone https://github.com/gorde-ganesh/stack-lift
cd stack-lift
npm install
npm run build
npm link
```

---

## Usage

### CLI

```bash
# Detect stack and list outdated packages
stack-lift analyze ./my-project

# Show the upgrade path and risk level without writing anything
stack-lift plan ./my-project --to 18

# Full upgrade report in the terminal
stack-lift upgrade ./my-project --to 18

# Write a Markdown report to UPGRADE_REPORT.md
stack-lift upgrade ./my-project --to 18 --output markdown

# Write a machine-readable JSON report
stack-lift upgrade ./my-project --to 18 --output json

# Apply automated code fixes in-place
stack-lift upgrade ./my-project --to 18 --apply
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

| Framework | Versions covered |
|-----------|-----------------|
| Angular   | 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 |
| React     | 16 → 17 → 18 → 19 |
| TypeScript | 4.x → 5.x |

### Detected build tooling

Webpack, Vite, Parcel, Rollup, Create React App, Angular CLI

### Phase 2 (planned)

Node.js, Express, NestJS, Next.js, Nuxt, Vue, Svelte

---

## Architecture

```
stack-lift/
├── src/
│   ├── cli.ts                       # Commander CLI entry point
│   ├── index.ts                     # Public library API
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript types
│   ├── knowledge/
│   │   ├── angular.ts               # Angular breaking changes per major hop
│   │   ├── react.ts                 # React breaking changes per major hop
│   │   └── typescript.ts            # TypeScript upgrade notes
│   └── engines/
│       ├── stack-detector.ts        # Reads project files → StackInfo
│       ├── dependency-analyzer.ts   # Compares installed vs latest/deprecated
│       ├── upgrade-planner.ts       # Builds safe incremental upgrade path
│       ├── breaking-change-analyzer.ts  # Greps source for affected patterns
│       ├── refactor-engine.ts       # Applies automated text transforms
│       ├── doc-generator.ts         # Renders markdown/JSON reports
│       └── orchestrator.ts          # Wires all engines into runUpgrade()
├── skills/
│   └── stacklift/
│       ├── SKILL.md                 # skills.sh skill definition
│       ├── examples/                # Worked upgrade examples
│       └── templates/               # Reusable report templates
└── tests/
    ├── fixtures/                    # Sample project package.json files
    └── *.test.ts                    # Unit tests (vitest)
```

### Engine pipeline

```
User project
    ↓
stack-detector        — framework, version, build tool, package manager
    ↓
dependency-analyzer   — outdated / deprecated packages, risk levels
    ↓
upgrade-planner       — incremental version path, total breaking changes
    ↓
breaking-change-analyzer  — source file locations needing attention
    ↓
refactor-engine       — automated fix application (optional)
    ↓
doc-generator         — markdown / JSON / terminal output
```

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
- Manual action checklist (37 items)
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

Flags in seconds:

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
Safe regex transforms for known automated migrations.

**New framework support**
Vue, Nuxt, Next.js, Svelte, NestJS — follow the Angular/React pattern.

### Development setup

```bash
git clone https://github.com/gorde-ganesh/stack-lift
cd stack-lift
npm install
npm test          # 23 unit tests
npm run build     # tsup → dist/
npm run dev -- upgrade ./path/to/project --to 18
```

### Running tests

```bash
npm test          # run once
npm run test:watch  # watch mode
npm run typecheck   # tsc --noEmit
```

---

## License

MIT — see [LICENSE](LICENSE).
