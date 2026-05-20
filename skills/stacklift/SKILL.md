# Stack Lift — Agent Skill

Stack Lift is an **LLM-first** framework migration tool. Always treat written artifacts as the source of truth — do not rely on terminal output.

## Protocol

### 1. Run the audit

```bash
stack-lift audit .
```

### 2. Read artifacts (always, before any other action)

```
stacklift-output/agent-contract.json       ← status, safety flags, next command
stacklift-output/findings.json             ← dependency findings with confidence/evidence
stacklift-output/plan.json                 ← hop-by-hop migration steps
stacklift-output/decisions.required.json   ← packages needing replacement decisions
stacklift-output/agent-instructions.md     ← full agent briefing for current run
stacklift-output/stacklift-report.md       ← human-readable migration report (stable alias)
stacklift-output/migration-plan.md         ← concise plan summary (stable alias)
```

### 3. Check status

If `agent-contract.json` → `status` is `needs_plan`, run:

```bash
stack-lift plan .
```

Then re-read artifacts.

### 4. Handle decisions

If `agent-contract.json` → `requiresUserDecisions` is `true`:

- Read `decisions.required.json`
- For each decision, review the `options[]` array (pre-computed alternatives from the knowledge base)
- Research live alternatives using `researchSources` URLs if options are insufficient
- **Ask the user** before replacing packages — never substitute automatically

### 5. Safety gates

| Flag | Meaning |
|------|---------|
| `safeToPlan` | Safe to generate a migration plan |
| `safeToAutofix` | All breaking changes have automated fixes — safe to apply code transforms |
| `safeToRunCommands` | Safe to execute install/build commands autonomously |
| `requiresHumanApproval` | At least one decision, conflict, or unsafe change requires user confirmation |
| `requiresUserDecisions` | Deprecated or abandoned packages detected — must be resolved first |

Do **not** run migrations automatically unless `safeToRunCommands` is `true` **and** the user has explicitly approved.

### 6. After each change

Always validate:

```bash
npm run typecheck && npm test
```

On failure, roll back:

```bash
git reset --hard
```

### 7. Summarise on completion

Always write a migration summary covering:
- Artifacts read
- Decisions made (and by whom)
- Files changed
- Commands run
- Validation status (pass / fail)
- Rollback notes
