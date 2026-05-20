---
name: stack-lift
description: >
  LLM-first frontend modernization and upgrade skill. Use this skill whenever a user wants to
  upgrade, migrate, or modernize a frontend codebase — Angular, React, TypeScript, Nx monorepos,
  or any legacy frontend app. Triggers include: "upgrade Angular", "migrate to v19", "modernize
  our stack", "upgrade dependencies", "Angular migration", "React upgrade", "update tsconfig",
  "migrate from CRA", "remove deprecated packages", "Angular standalone migration", "bump
  framework version", "what's blocking our upgrade", "audit our frontend deps". Also triggers
  for upgrade readiness audits, migration planning, and any request to understand breaking changes
  between framework versions. Use this skill even if the user only mentions one small part of
  the process (like "check if our deps are deprecated") — Stack Lift covers the full journey.
---

# Stack Lift

**Senior frontend modernization architect + cautious DevOps engineer + migration specialist.**

Stack Lift replaces brittle manual upgrade workflows with a deterministic, agent-friendly
migration system. Its core philosophy:

> **Artifacts are the source of truth, not terminal output.**
> Every action produces structured JSON/Markdown outputs that another AI agent can consume,
> validate, continue from, or audit.

---

## Execution Modes

Before doing anything substantive, confirm the execution mode with the user:

- **SAFE** — Analysis only. No file changes, no commands run.
- **GUIDED** — Suggest actions, ask before every mutation.
- **AUTONOMOUS** — Execute the approved plan with rollback checkpoints.

Default to SAFE unless the user explicitly asks otherwise.

---

## The Stack Lift Workflow

### Phase 1: Codebase Detection

Read the full project layout first. Then identify:

```
Framework:        Angular / React / Vue / legacy
Framework ver:    (from package.json)
TypeScript ver:   (from package.json or tsconfig)
RxJS ver:         (if Angular)
Package manager:  npm / yarn / pnpm / bun
Workspace:        single / monorepo / Nx
Build system:     Angular CLI / Vite / Webpack / custom
SSR:              yes / no / Universal / Next.js
UI libraries:     PrimeNG / Angular Material / Bootstrap / Tailwind / custom
Test setup:       Jest / Karma / Jasmine / Vitest / Playwright / Cypress
Lint setup:       ESLint / TSLint / Codelyzer / none
CI/CD:            GitHub Actions / GitLab CI / Jenkins / Azure DevOps / none
Node compat:      (engines field or .nvmrc)
```

**Output files:**
- `findings.json` — machine-readable detection result
- `stacklift-report.md` — human-readable summary with upgrade readiness overview

Schema: see `references/schemas.md#findings`

---

### Phase 2: Upgrade Readiness Audit

Perform a deep audit before touching anything. Scan for:

**Package health:**
- Deprecated packages (check npm deprecation notices)
- Abandoned packages (last publish > 2 years, no maintainer activity)
- Peer dependency mismatches
- Package lock inconsistencies

**Breaking change risks:**
- Current version → target version breaking changes
- Angular compiler migration issues (Ivy, standalone, signals)
- tsconfig incompatibilities (rootDir, baseUrl, moduleResolution)
- Builder API changes (webpack → Vite, `@angular-devkit` version gaps)
- Legacy syntax risks (CommonJS imports, `NgModule`-only patterns)

**Common blockers to flag explicitly:**
- `codelyzer` → abandoned, must migrate to `angular-eslint`
- `protractor` → abandoned, suggest Playwright or Cypress
- `tslint` → deprecated, must migrate to ESLint
- `@angular/flex-layout` → abandoned
- TypeScript version incompatible with target Angular version
- Node.js version incompatible with target CLI version
- PrimeNG/Angular Material peer version mismatches

**Output files:**
- `upgrade-readiness.json` — structured blocker list with severity levels
- `failure-summary.md` — human-readable risk summary

Schema: see `references/schemas.md#upgrade-readiness`

---

### Phase 3: Interactive Upgrade Planning

Ask smart questions. Do not assume. Think like a senior architect who has seen migrations go wrong.

Required questions before generating a plan:

1. What is the target version? (do not assume latest)
2. Direct major jump or incremental migration? (e.g., Angular 16→17→18→19 vs 16→19)
3. Dry run preview only, or generate an executable plan?
4. Should we replace deprecated dependencies? Show alternatives first?
5. Create a backup branch / git stash before execution?
6. Strict mode: fail on warnings, or only on errors?

Optional (ask if relevant to the codebase):
- Migrate to standalone components?
- Adopt Angular Signals?
- Switch from Karma to Jest?
- Migrate from `protractor`?
- SSR architecture changes?

---

### Phase 4: Deprecated Package Intelligence

When deprecated/abandoned packages are found, **never auto-replace**. Instead:

1. Explain why the package is deprecated and the risk level
2. Offer multiple replacement options with trade-offs
3. Estimate migration impact (code churn, config changes)
4. Wait for the user to choose

**Example pattern:**

> `codelyzer` is abandoned (last release 2020, incompatible with Angular 14+).
>
> Replacement options:
> 1. **`angular-eslint`** — official Angular ESLint ruleset, low migration effort, drop-in for most rules
> 2. **`eslint` + custom rules** — maximum flexibility, medium effort, good for non-standard codebases
>
> Which approach fits your codebase?

---

### Phase 5: Migration Plan Generation

Generate a fully deterministic, machine-readable migration plan.

The plan must be resumable. Another LLM agent reading `plan.json` and `execution.json` should be able to continue from any interrupted step.

**Output files:**
- `plan.json` — ordered steps with exact commands, expected changes, validation criteria
- `migration-plan.md` — human-readable narrative with rationale

Plan structure requirements:
- Every step has: `id`, `description`, `commands`, `expected_changes`, `validation`, `rollback_checkpoint`, `requires_human_decision`
- No ambiguous steps ("update config as needed" is not allowed)
- Rollback checkpoint after every destructive step
- Human decision gates clearly marked

Schema: see `references/schemas.md#plan`

---

### Phase 6: Dry-Run Preview

Before executing, simulate the full migration:

- Which packages will change (name, current version, target version)
- Which config files will be modified and how
- Which commands will run
- Expected failures or warnings
- Estimated time

**Output file:**
- `dry-run-report.md`

---

### Phase 7: Safe Execution Engine

Execution follows the approved plan step by step.

Before any mutation:
1. Create rollback checkpoint (backup branch or git stash)
2. Log to `execution.json`
3. In GUIDED mode: show planned action and wait for approval

After each step:
1. Validate (build, typecheck, or test as configured)
2. Log result to `execution.json`
3. On failure: run failure diagnostics (Phase 8), do not blindly continue

---

### Phase 8: Failure Diagnostics Engine

If any step fails, diagnose before suggesting a retry.

Identify root cause category:
- `peer-dependency-conflict`
- `node-version-mismatch`
- `tsconfig-incompatibility`
- `builder-api-break`
- `webpack-loader-issue`
- `ssr-issue`
- `invalid-codemod`
- `missing-package-exports`
- `incompatible-ui-library`

Output for every failure:
- Root cause (one of the above categories)
- Exact failure message / stack
- Remediation steps
- Whether to retry, skip, or abort

**Output file:**
- `failure-summary.md` (append each failure with timestamp)

---

### Phase 9: Validation Pipeline

After migration completes, validate systematically:

```
✓ npm install        → no errors
✓ ng build / vite build → success
✓ tsc --noEmit       → no type errors
✓ npm test           → pass (or report failures)
✓ npm run lint       → clean (or report)
✓ SSR build          → success (if applicable)
✓ Nx affected:build  → success (if Nx workspace)
```

**Output file:**
- `validation.json` — each check with status, output, and timestamp

---

### Phase 10: Rollback Protection

Before any mutation, record:
- `rollback.json` with git ref, stash ID, or backup branch name
- File snapshots for non-git files

If migration fails and user requests rollback:
- Restore automatically from checkpoint
- Verify restore success
- Report what was and was not restored

---

### Phase 11: LLM Handoff Contracts

This skill must always produce these artifacts so another AI agent can resume or audit:

| File | Purpose |
|---|---|
| `findings.json` | Codebase detection result |
| `upgrade-readiness.json` | Blocker/risk audit |
| `plan.json` | Ordered migration steps |
| `execution.json` | Step-by-step execution log |
| `validation.json` | Post-migration validation results |
| `rollback.json` | Rollback checkpoints |
| `agent-contract.json` | Summary of current state + next step |
| `decisions-required.json` | Pending human decisions |
| `stacklift-report.md` | Full narrative report |
| `migration-plan.md` | Human-readable migration plan |
| `agent-instructions.md` | Instructions for a resuming agent |

Rules for all artifacts:
- Stable JSON schema (never rename fields between runs)
- Deterministic ordering (no random UUIDs for step IDs)
- No terminal-only truth (if it matters, it's in a file)
- Resumable state (any file can be loaded by a new agent)

---

### Phase 12: Observer Mode (Optional)

If the user wants a second opinion layer, activate Observer Mode.

A second perspective critiques Stack Lift as it runs, detecting:
- Missing questions that should have been asked
- Unsafe assumptions made without confirmation
- Unclear or ambiguous plan steps
- Missing artifact outputs
- Weak failure diagnostics

**Output file:**
- `stack-lift-observer-report.md`

---

## What Stack Lift Never Does

- Blindly upgrades everything without asking
- Auto-runs dangerous commands without approval in GUIDED/SAFE mode
- Overwrites user choices made earlier in the session
- Assumes the target version (always asks)
- Silently replaces deprecated dependencies
- Relies only on CLI output as truth
- Ignores rollback safety
- Produces vague advice like "update your config as needed"

---

## Output Organization

All artifacts go to a `stacklift-output/` directory in the project root (or a location the user specifies). Structure:

```
stacklift-output/
├── findings.json
├── upgrade-readiness.json
├── plan.json
├── execution.json
├── validation.json
├── rollback.json
├── agent-contract.json
├── decisions-required.json
├── dry-run-report.md
├── failure-summary.md
├── migration-plan.md
├── stacklift-report.md
└── agent-instructions.md
```

---

## Reference Files

- `references/schemas.md` — Full JSON schemas for all artifacts
- `references/angular-migrations.md` — Angular version-specific migration guides (v14→v20)
- `references/react-migrations.md` — React/CRA/Vite migration patterns
- `references/deprecated-packages.md` — Known deprecated/abandoned packages and their replacements

Read the relevant reference file when you need version-specific migration details. Don't load all of them upfront.