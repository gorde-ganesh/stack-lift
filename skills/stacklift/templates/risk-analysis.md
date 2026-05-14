# Risk Analysis: {{FRAMEWORK}} {{FROM_VERSION}} → {{TO_VERSION}}

> Project: `{{PROJECT_PATH}}`  
> Generated: {{GENERATED_AT}}

---

## Risk Summary

| Dimension | Score | Level |
|-----------|-------|-------|
| Breaking change density | {{BREAKING_SCORE}}/10 | {{BREAKING_LEVEL}} |
| Deprecated package exposure | {{DEPRECATED_SCORE}}/10 | {{DEPRECATED_LEVEL}} |
| Version span | {{VERSION_SPAN_SCORE}}/10 | {{VERSION_SPAN_LEVEL}} |
| Codebase size | {{CODEBASE_SCORE}}/10 | {{CODEBASE_LEVEL}} |
| Test coverage | {{TEST_SCORE}}/10 | {{TEST_LEVEL}} |
| Manual intervention required | {{MANUAL_SCORE}}/10 | {{MANUAL_LEVEL}} |
| **Overall** | **{{OVERALL_SCORE}}/10** | **{{OVERALL_LEVEL}}** |

### Score legend

| Level | Score | Meaning |
|-------|-------|---------|
| 🟢 Low | 1–3 | Upgrade is straightforward; mostly automated |
| 🟡 Medium | 4–6 | Some manual work required; plan a sprint |
| 🟠 High | 7–8 | Significant manual effort; block time and involve senior engineers |
| 🔴 Critical | 9–10 | Multi-week effort; requires dedicated upgrade project |

---

## Dimension Breakdown

### 1. Breaking Change Density — {{BREAKING_LEVEL}}

**Total breaking changes across all steps:** {{TOTAL_BREAKING_CHANGES}}  
**Auto-fixable:** {{AUTOMATED_FIX_COUNT}} ({{AUTOMATED_PERCENT}}%)  
**Requires manual intervention:** {{MANUAL_FIX_COUNT}} ({{MANUAL_PERCENT}}%)  
**High-severity changes:** {{HIGH_SEVERITY_COUNT}}

Top high-severity items:

{{#each HIGH_SEVERITY_CHANGES}}
- `{{API}}` (v{{FROM_VERSION}} → v{{TO_VERSION}}): {{DESCRIPTION}}
{{/each}}

**Assessment:** {{BREAKING_ASSESSMENT}}

---

### 2. Deprecated Package Exposure — {{DEPRECATED_LEVEL}}

**Deprecated packages found:** {{DEPRECATED_COUNT}}  
**Abandoned packages found:** {{ABANDONED_COUNT}}  
**Security advisories:** {{SECURITY_COUNT}}

| Package | Status | Blocks upgrade? | Replacement |
|---------|--------|----------------|-------------|
{{#each DEPRECATED_PACKAGES}}
| `{{NAME}}` | {{STATUS}} | {{BLOCKS}} | `{{REPLACEMENT}}` |
{{/each}}

**Assessment:** {{DEPRECATED_ASSESSMENT}}

---

### 3. Version Span — {{VERSION_SPAN_LEVEL}}

**Hops required:** {{STEP_COUNT}}  
**Major versions spanned:** {{MAJOR_VERSIONS_SPANNED}}  
**Oldest supported version for target:** {{OLDEST_SUPPORTED}}  
**Direct upgrade possible:** {{DIRECT_UPGRADE_POSSIBLE}}

A larger version span increases risk because each intermediate hop introduces new breaking changes that compound. Incremental upgrades allow validation at each step.

**Assessment:** {{VERSION_SPAN_ASSESSMENT}}

---

### 4. Codebase Size — {{CODEBASE_LEVEL}}

**Source files scanned:** {{SOURCE_FILE_COUNT}}  
**Files with detected issues:** {{AFFECTED_FILE_COUNT}}  
**Components / modules:** {{COMPONENT_COUNT}}  
**Test files:** {{TEST_FILE_COUNT}}

Larger codebases have more surface area for breaking changes and require more time to validate after each upgrade step.

**Assessment:** {{CODEBASE_ASSESSMENT}}

---

### 5. Test Coverage — {{TEST_LEVEL}}

**Test framework detected:** {{TEST_FRAMEWORK}}  
**Test files found:** {{TEST_FILE_COUNT}}  
**Test-to-source ratio:** {{TEST_RATIO}}

High test coverage significantly reduces upgrade risk by catching regressions automatically. Low coverage means manual QA is needed after each step.

Recommendation:
{{#if LOW_COVERAGE}}
⚠️ Test coverage appears low. Before upgrading, consider adding integration tests for critical paths (login, main data flows, core components). This will catch regressions that would otherwise require manual discovery.
{{else}}
✅ Test coverage looks adequate. Run the full suite after each hop and treat any new failure as a blocker.
{{/if}}

**Assessment:** {{TEST_ASSESSMENT}}

---

### 6. Manual Intervention Required — {{MANUAL_LEVEL}}

**Total manual action items:** {{TOTAL_MANUAL_ACTIONS}}  
**Config file changes:** {{CONFIG_CHANGES}}  
**API migration items:** {{API_MIGRATION_COUNT}}  
**Architectural changes:** {{ARCHITECTURAL_CHANGES}}

Manual actions that require the most care:

{{#each HIGH_EFFORT_MANUAL_ACTIONS}}
- **{{ACTION}}** — {{EFFORT_ESTIMATE}}, affects {{FILES_AFFECTED}} files
{{/each}}

**Assessment:** {{MANUAL_ASSESSMENT}}

---

## Risk Factors

### Factors That Increase Risk

{{#each RISK_FACTORS}}
- ⚠️ **{{FACTOR}}**: {{EXPLANATION}}
{{/each}}

### Factors That Reduce Risk

{{#each MITIGATING_FACTORS}}
- ✅ **{{FACTOR}}**: {{EXPLANATION}}
{{/each}}

---

## Upgrade Readiness Assessment

{{READINESS_VERDICT}}

### Recommended approach

{{RECOMMENDED_APPROACH}}

### Suggested timeline

| Phase | Work | Time |
|-------|------|------|
{{#each PHASES}}
| {{PHASE}} | {{WORK}} | {{TIME}} |
{{/each}}

---

## Pre-Upgrade Checklist

Complete these before starting the upgrade to reduce risk:

{{#each PRE_UPGRADE_ITEMS}}
- [ ] {{ITEM}}
{{/each}}

Standard pre-upgrade steps:
- [ ] All current tests pass
- [ ] Production build succeeds with zero errors
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Git working tree is clean
- [ ] Upgrade branch created: `git checkout -b upgrade/{{FRAMEWORK_LOWER}}-{{TARGET_VERSION}}`
- [ ] Backup tag created: `git tag pre-upgrade-backup`
- [ ] Team has been notified — no other PRs merge to main during the upgrade window

---

## Post-Upgrade Validation Criteria

The upgrade is complete when all of the following are true:

- [ ] `{{TYPECHECK_COMMAND}}` exits with 0 errors
- [ ] `{{BUILD_COMMAND}}` succeeds with no warnings about deprecated APIs
- [ ] `{{TEST_COMMAND}}` passes with no regressions
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] Application loads and core flows work in a browser
- [ ] CI pipeline passes on the upgrade branch

---

## Rollback Decision Criteria

Roll back if:

- More than {{ROLLBACK_THRESHOLD}} new TypeScript errors introduced that cannot be resolved in a reasonable time
- More than {{TEST_FAILURE_THRESHOLD}}% of tests fail after a single hop
- A critical business flow is broken and the fix is non-obvious
- A required library has no compatible version for the target framework

Rollback command:
```bash
git checkout pre-upgrade-backup -- .
{{INSTALL_COMMAND}}
```

---

*Generated by [StackLift](https://github.com/gorde-ganesh/stack-lift)*
