# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

---

## [1.0.1] — 2026-05-19

### Fixed
- Added "Use with any LLM" section to the npm package README (was present in the GitHub README but missing from the published package)
- Corrected stale `src/` paths in Contributing section to `packages/core/src/`
- Fixed architecture file tree: `execution/`, `validation/`, `reporting/`, `diagnostics/`, `migration/` directories now accurate
- Removed unused root `skills/` directory (shipped skill is in `packages/cli/skills/`)

---

## [1.0.0] — 2026-05-19

First stable major release. StackLift is production-ready for Angular and React upgrade workflows.

### Highlights
- All core pipeline stages stable: detection, dependency analysis, planning, breaking-change scanning, AST refactors, build validation, artifact writing
- Angular upgrade path 10 → 20 fully catalogued with per-hop breaking changes and automated fixes
- React upgrade path 16 → 19 (beta) with planning and two automated refactors
- Interactive `migrate` flow with session resume, CI/non-interactive mode, and dry-run preview
- Bundled Claude Code skill — `stack-lift skills add stacklift` installs from the npm package directly
- Corrected all stale path references in documentation

---

## [0.5.4] — 2026-05-19

### Added
- Bundled `stacklift` Claude Code skill into the npm package — install it with `stack-lift skills add stacklift` without a separate download step
- LLM onboarding prompt in README for safely running StackLift via any AI assistant

---

## [0.5.3] — 2026-05-18

### Fixed
- Publish pipeline: workspace cross-references now updated correctly after version bump
- Lock file regeneration replaces fragile `sed` patching with a Node script
- Suppressed npm's internal workspace install during `npm version` to avoid lock file drift

---

## [0.5.1] — 2026-05-17

### Added
- GitHub Actions CI matrix: Windows + Linux, Node 18 / 20 / 22
- Guided decision engine: analysis results now drive the questions asked during `migrate` (smarter prompts, fewer irrelevant choices)
- Dry-run preview: `--dry-run` shows all planned writes and commands before touching anything
- Angular config migration engine: migrates `angular.json` builder options across major versions
- Angular migration intelligence: per-breaking-change automation levels and remediation guidance
- Package migration intelligence: framework-aware replacement registry with API-similarity and effort scores
- Failure diagnostics engine: classifies build/test failures and suggests remediation steps
- Nx workspace detection and `nx.json`-aware migration support
- Rollback manager: structured git stash/restore with audit log
- Execution modes: `safe` (advisory only), `guided` (interactive), `autonomous` (fully automated)
- Benchmark harness for Angular fixture projects

### Fixed
- Windows compatibility: `shell` option on child processes and path-guard hardening
- Angular provider tsconfig: corrected `ignoreDeprecations` value and removed conflicting `rootDir`
- Deterministic JSON schema serialization for `findings.json` and `plan.json`

---

## [0.4.7] — 2026-05-16

### Added
- `repository`, `homepage`, and `bugs` metadata fields added to all published packages

---

## [0.4.0] — 2026-05-14

### Added
- Session-report phases: full `migrate` flow with per-phase state saved to `.stacklift/session.json`
- Trust and safety hardening: path-guard, confidence scoring, evidence tagging on every finding

---

## [0.3.0] — 2026-05-12

### Added
- Interactive guided migration copilot: objective selection, target version picker, per-deprecated-package replacement choices
- CI/non-interactive mode via `--non-interactive`, `--target`, `--objective`
- Confidence scoring (`high | medium | low`) and evidence source tagging (`observed | inferred | registry`) on all findings

---

## [0.2.0] — 2026-05-10

### Added
- Initial public release
- `stack-lift migrate` interactive flow
- `stack-lift audit` read-only findings with markdown + JSON output
- Angular upgrade path: 10 → 20 with per-hop breaking-change catalogue
- React upgrade path: 16 → 19
- Live npm registry queries with peer dependency conflict detection
- AST refactors via ts-morph: `TestBed.get`, `ReactDOM.render`, `HttpModule`, `initialNavigation`
