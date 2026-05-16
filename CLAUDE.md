# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm ci

# Build all packages (via Turbo)
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run tests/stack-detector.test.ts

# Type check
npm run typecheck

# Lint
npm run lint

# Dev mode for the CLI (runs from source without build)
npx tsx packages/cli/src/cli.ts <command>
```

CI runs lint → typecheck → format:check → test → build → pack validation against Node 18, 20, and 22.

## Architecture

This is an npm workspace monorepo with Turbo orchestration. The packages are:

| Package | Purpose |
|---|---|
| `@stack-lift/schemas` | JSON schema definitions and `SCHEMA_VERSION` constant |
| `@stack-lift/shared` | All shared TypeScript types (`StackInfo`, `UpgradePlan`, `BreakingChange`, etc.) |
| `@stack-lift/core` | All analysis engines — the library heart of the tool |
| `@stack-lift/angular-provider` | Angular-specific upgrade step catalogue and framework provider |
| `@stack-lift/cli` | Commander-based CLI; depends on all above packages |
| `@stack-lift/benchmarks` | Performance benchmarks (private, not published) |

### Core engine layout (`packages/core/src/`)

```
detector/           stack-detector, ci-detector
planner/            upgrade-planner, breaking-change-analyzer
dependency-intelligence/  dependency-analyzer, npm-registry
orchestration/      orchestrator (pipeline entry point), session
execution/          refactor-engine, command-runner, build-validator, artifact-writer
reporting/          doc-generator
providers/          framework-provider interface, registry, react-provider
path-guard.ts       path traversal protection (called before any FS writes)
knowledge/          (src-level) static breaking-change catalogues per framework
```

### Framework provider pattern

`@stack-lift/core` defines the `FrameworkProvider` interface (`packages/core/src/providers/framework-provider.ts`). Each framework (Angular, React) implements `{ framework, supportedVersions, latestVersion(), upgradeSteps(from, to) }`. Providers register themselves via `registerFrameworkProvider()`. Angular lives in its own package (`@stack-lift/angular-provider`) and calls `registerFrameworkProvider(angularProvider)` on import; React is bundled directly in core.

To add a new framework: implement `FrameworkProvider` in a new package, call `registerFrameworkProvider`, and add the package as a dependency of `@stack-lift/cli`.

### Orchestrator pipeline (`packages/core/src/orchestration/orchestrator.ts`)

`runUpgrade()` runs in sequence:
1. `detectStack` — reads `package.json`, lockfile, tsconfig; returns `StackInfo`
2. `analyzeDependencies` — async; queries npm registry with caching; returns outdated deps + peer conflicts
3. `planUpgrade` — pure; walks version hops through the provider's `upgradeSteps`; returns `UpgradePlan`
4. `analyzeBreakingChanges` — scans source files for `searchPattern` matches; returns `CodeSuggestion[]`
5. `applyRefactors` — optionally applies automated fixes in-place (only when `--apply` flag is set)
6. Report generation via `generateMarkdownReport` / `generateJsonReport`

### CLI commands

- `stack-lift audit <path>` — read-only findings with evidence/confidence labels
- `stack-lift plan <path>` — deterministic plan, CI-safe with `--non-interactive`
- `stack-lift migrate <path>` — interactive guided flow via `@inquirer/prompts`; saves session to `.stacklift/session.json`
- `stack-lift apply <path>` — apply automated fixes + optional build validation
- `stack-lift resume [path]` — resume an interrupted `migrate` session
- `stack-lift analyze` / `stack-lift upgrade` — deprecated aliases

### Session persistence

`migrate` saves a `SessionState` (phase, decisions, fingerprint) to `.stacklift/session.json`. The fingerprint hashes `package.json`, the lockfile, and `git HEAD` to detect stale sessions. `resume` checks this fingerprint before restoring state.

### Key design constraints

- `path-guard.ts` (`assertSafePath`) must be called before any filesystem write; it blocks path traversal attempts.
- Every finding must carry `confidence` (`high | medium | low`) and `latestSource` (`observed | inferred | registry`) so users can calibrate trust.
- `planUpgrade` and `detectStack` are pure/synchronous; only `analyzeDependencies`, `applyRefactors`, and `executeCommands` have side effects.
- `command-runner.ts` (`executeCommands`) must always create a git backup before mutating the project. It uses `git stash push --include-untracked` and restores via `git stash pop` (or `git reset --hard`) on failure. On Windows, process-tree kill uses `taskkill /T /F` because `child.kill()` only kills the `cmd.exe` shell wrapper.
- Monorepos: `detectStack` flags `isMonorepo` but does not recurse. The CLI warns users to run per workspace.

### Tests and fixtures

Tests live in `tests/` at the repo root and run against built source via `vitest`. Fixtures under `tests/fixtures/` are minimal `package.json` stubs representing specific project archetypes (angular-12, react-16, react-17). Add new fixtures there when covering new framework versions.
