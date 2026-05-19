---
name: stacklift
description: AI-powered frontend upgrade assistant for Angular, React, and TypeScript projects
version: 1.0.0
author: gorde-ganesh
tags: [angular, react, typescript, upgrade, migration]
---

# stacklift

Use the `stack-lift` CLI to analyze, plan, and apply framework upgrades for Angular, React, and TypeScript projects.

## When to invoke this skill

- User asks to upgrade, migrate, or modernize an Angular or React project
- User wants to find breaking changes between framework versions
- User wants an upgrade plan or audit for a frontend project
- User asks about outdated dependencies or peer conflicts

## How to use stack-lift

### Audit (read-only findings)

```bash
npx stack-lift audit <project-path>
```

Scans the project and reports outdated dependencies, breaking changes, and confidence-labeled findings. No files are modified.

### Plan (deterministic upgrade plan)

```bash
npx stack-lift plan <project-path>
```

Produces a step-by-step upgrade plan. Use `--non-interactive` in CI environments.

### Migrate (interactive guided flow)

```bash
npx stack-lift migrate <project-path>
```

Interactive session that walks through each upgrade step. Saves progress to `.stacklift/session.json` so it can be resumed if interrupted.

### Apply (apply automated fixes)

```bash
npx stack-lift apply <project-path>
```

Applies automated code refactors in-place using AST transforms. Does not create a git backup — commit or stash your work before running.

### Resume (resume interrupted migration)

```bash
npx stack-lift resume [project-path]
```

Restores a previously interrupted `migrate` session from `.stacklift/session.json`, replaying the saved decisions.

## Key behaviors to communicate to the user

- Every finding includes a `confidence` label (`high | medium | low`) and a `latestSource` label (`observed | inferred | registry`) so the user can calibrate trust
- `apply` creates a git backup before mutating any files; on failure it restores automatically
- For monorepos, run `stack-lift` per workspace — it does not recurse automatically
- `audit` is inherently read-only and CI-safe; `plan` supports `--non-interactive` for CI pipelines

## Workflow guidance

1. Start with `audit` to understand the scope
2. Review the plan with `plan` before making changes
3. Use `migrate` for an interactive step-by-step flow, or `apply` to apply all automated fixes at once
4. If the session is interrupted, use `resume` to continue from where you left off
