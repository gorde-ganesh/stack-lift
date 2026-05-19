---
name: stacklift
description: AI-powered frontend upgrade assistant for Angular, React, and TypeScript projects
version: 1.0.4
author: gorde-ganesh
tags: [angular, react, typescript, upgrade, migration, audit, plan]
---

# stacklift

Use the `stack-lift` CLI to audit, plan, and apply framework upgrades for Angular, React, and TypeScript projects. Stack-lift writes structured JSON and markdown artifacts to `stacklift-output/` by default — always read those files rather than parsing terminal output.

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

**After running, read the artifact:**
```bash
# Machine-readable findings for the agent to parse
cat <project-path>/stacklift-output/findings.json
```

To suppress artifact writes (stdout only):
```bash
npx stack-lift audit <project-path> --no-artifact
```

### 2. Plan — deterministic upgrade roadmap

```bash
npx stack-lift plan <project-path>
```

Produces a hop-by-hop upgrade plan with breaking changes per version. Writes `plan.json` and a markdown report to `stacklift-output/`. Safe to run in CI with `--non-interactive`.

**After running, read the artifact:**
```bash
cat <project-path>/stacklift-output/plan.json
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

## Agent workflow

Follow this order for a complete migration run:

```
1. npx stack-lift audit <path>          # understand scope
   → read stacklift-output/findings.json

2. npx stack-lift plan <path>           # see hop-by-hop roadmap
   → read stacklift-output/plan.json

3. npx stack-lift migrate <path> --non-interactive --target <N>
   # or ask user to run interactively

4. After each hop, run: npm run build && npm test
```

---

## Reading output artifacts

Stack-lift writes these files to `<project-path>/stacklift-output/` by default:

| File | Contents |
|------|----------|
| `findings.json` | All audit findings: deprecated packages, peer conflicts, outdated deps |
| `plan.json` | Full upgrade plan with hops, breaking changes, manual actions |
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
