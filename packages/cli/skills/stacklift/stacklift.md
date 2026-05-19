---
name: stacklift
description: LLM-first framework migration skill. Audits Angular, React, and legacy frontend projects, writes deterministic machine-readable migration artifacts, and helps AI coding agents safely plan, execute, validate, and roll back upgrades.
version: 1.2.0
author: gorde-ganesh
tags: [angular, react, typescript, upgrade, migration, audit, plan, llm, agents]
---

# stacklift

Stack Lift is an **artifact-first migration protocol for LLM coding agents**. It audits Angular, React, and TypeScript projects, writes structured machine-readable artifacts to `stacklift-output/`, and produces deterministic step contracts that agents can read, validate, and safely execute.

**Always read `stacklift-output/agent-contract.json` after running any command. Do not rely on terminal output as the source of truth.**

## When to invoke this skill

- User asks to upgrade, migrate, or modernize an Angular or React project
- User wants to understand what breaking changes exist between framework versions
- User wants an upgrade plan or dependency audit
- User asks about outdated dependencies, peer conflicts, or deprecated packages
- User is starting a migration and wants a step-by-step roadmap

## Commands

### 1. Audit — read-only findings

```bash
npx stack-lift audit <project-path>
```

Scans the project and writes findings to `stacklift-output/`. Reports deprecated packages, peer conflicts, and outdated deps with confidence labels. No source files are modified.

**After running, read the agent contract:**
```bash
cat <project-path>/stacklift-output/agent-contract.json
```

To suppress artifact writes (stdout only):
```bash
npx stack-lift audit <project-path> --no-artifact
```

### 2. Plan — deterministic upgrade roadmap

```bash
npx stack-lift plan <project-path>
```

Produces a hop-by-hop upgrade plan with breaking changes per version. Writes step contracts, decisions, and agent instructions to `stacklift-output/`. Safe to run in CI with `--non-interactive`.

**After running, read the plan contract:**
```bash
cat <project-path>/stacklift-output/plan.json
cat <project-path>/stacklift-output/decisions.required.json
```

Target a specific version:
```bash
npx stack-lift plan <project-path> --to 20
```

### 3. Migrate — interactive guided flow

```bash
npx stack-lift migrate <project-path>
```

Interactive session that walks through each upgrade step. Saves progress to `.stacklift/session.json` for resumable sessions.

Non-interactive mode for agents:
```bash
npx stack-lift migrate <project-path> --non-interactive --target <version>
```

### 4. Apply — automated code fixes

```bash
npx stack-lift apply <project-path>
```

Applies automated code refactors (AST transforms) in-place. Creates a git stash backup before any mutation — restores automatically on failure.

### 5. Resume — continue an interrupted session

```bash
npx stack-lift resume [project-path]
```

Restores a `migrate` session from `.stacklift/session.json`.

---

## Agent workflow — artifact-first protocol

Follow this order for a complete migration run:

```
1. npx stack-lift audit <path>
   → read stacklift-output/agent-contract.json   (status, next command)
   → read stacklift-output/findings.json          (all findings with confidence)

2. npx stack-lift plan <path>
   → read stacklift-output/agent-contract.json   (safeToAutofix, requiresUserDecisions)
   → read stacklift-output/plan.json             (step contracts: stepId, canAutofix, validation, rollback)
   → read stacklift-output/decisions.required.json  (package replacement decisions)
   → read stacklift-output/agent-instructions.md (full agent briefing)

3. Resolve all decisions in decisions.required.json before proceeding

4. npx stack-lift migrate <path> --non-interactive --target <N>
   # or ask user to run interactively

5. After each hop, run validation commands from plan.json step contract
```

---

## Safety checklist

Before applying any automated fixes:

1. Read `agent-contract.json` — confirm `safeToAutofix` is `true`
2. Read `decisions.required.json` — resolve all package replacement decisions
3. Confirm the `plan.json` step contract for each hop (`canAutofix`, `validation`, `rollback`)
4. Run validation commands after each step
5. On failure, run: `git reset --hard`
6. Write a migration summary after completion

---

## Output artifacts

Stack-lift writes these files to `<project-path>/stacklift-output/` by default:

| File | Contents |
|------|----------|
| `agent-contract.json` | Machine-readable status: mode, safeToAutofix, status, nextRecommendedCommand, artifact manifest |
| `decisions.required.json` | Package replacement decisions with alternatives, recommended option, and risk level |
| `agent-instructions.md` | Full agent briefing: status, decisions, step contracts, safety checklist |
| `findings.json` | All audit findings: deprecated packages, peer conflicts, outdated deps |
| `plan.json` | Full upgrade plan with step contracts (stepId, canAutofix, validation, rollback) |
| `analysis.json` | Dependency analysis with peer conflict detail |
| `stacklift-report-*.md` | Human-readable markdown report |
| `stacklift-report-*.json` | Full structured JSON report |

---

## Key facts

- Every finding has `confidence: high|medium|low` and `source: observed|inferred|registry`
- `audit` and `plan` are always read-only — they never modify source files
- `apply` creates a `git stash push --include-untracked` before any mutation; restores on failure
- For monorepos: run stack-lift per workspace — it does not recurse
- The Angular provider fetches the current latest version from npm at runtime; the plan always targets the most current catalogued Angular version
