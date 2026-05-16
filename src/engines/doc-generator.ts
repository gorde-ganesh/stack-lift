import type {
  UpgradeReport,
  BreakingChange,
  DependencyInfo,
  PeerDepConflict,
  BuildValidationResult,
} from '../types/index.js';

const RISK_EMOJI: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

const SEVERITY_EMOJI: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

function codeBlock(code: string, lang = ''): string {
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '✅ High',
  medium: '⚠️ Medium',
  low: '❓ Low',
};

function changeTable(changes: BreakingChange[]): string {
  if (changes.length === 0) return '_No breaking changes in this step._\n';

  const rows = changes.map((c) => {
    const automated = c.automated ? '✅ Auto' : '🔧 Manual';
    const conf = CONFIDENCE_LABEL[c.confidence ?? 'medium'] ?? CONFIDENCE_LABEL['medium'];
    return `| ${SEVERITY_EMOJI[c.severity]} | \`${c.api}\` | ${c.description} | ${automated} | ${conf} |`;
  });

  return (
    [
      '| Severity | API | Description | Fix | Confidence |',
      '|----------|-----|-------------|-----|-----------|',
      ...rows,
    ].join('\n') + '\n'
  );
}

function depTable(deps: DependencyInfo[], lockfileParsed?: boolean): string {
  if (deps.length === 0) return '_All tracked dependencies are up to date._\n';

  const sourceNote = lockfileParsed
    ? '_Current versions read from lockfile (resolved). Latest from npm registry._'
    : '_Current versions read from package.json ranges. No lockfile found — install exact versions may differ._';

  const rows = deps.map((d) => {
    const label = d.deprecated ? '⚠️ Deprecated' : 'Outdated';
    const reason = d.reason ? ` — ${d.reason}` : '';
    const sourceTag = d.latestSource === 'registry' ? '' : ' _(fallback)_';
    const conf = CONFIDENCE_LABEL[d.confidence ?? 'medium'] ?? '';
    return `| ${RISK_EMOJI[d.risk]} | \`${d.name}\` | ${d.current} | ${d.latest}${sourceTag} | ${label}${reason} | ${conf} |`;
  });

  return (
    [
      sourceNote,
      '',
      '| Risk | Package | Current | Latest | Note | Confidence |',
      '|------|---------|---------|--------|------|-----------|',
      ...rows,
    ].join('\n') + '\n'
  );
}

function peerConflictTable(conflicts: PeerDepConflict[]): string {
  if (conflicts.length === 0) return '';

  const rows = conflicts.map((c) => {
    const status = c.unresolvable ? '🔴 Unresolvable' : '🟠 Conflict';
    return `| ${status} | \`${c.package}\` | \`${c.installedVersion}\` | \`${c.requiredRange}\` | \`${c.requiredBy}\` |`;
  });

  return [
    '## Peer Dependency Conflicts',
    '',
    '> These packages were detected in your install but do not satisfy the peer requirement declared by another package. Verify against the actual lockfile before acting.',
    '',
    '| Status | Package | Installed | Required Range | Required By |',
    '|--------|---------|-----------|----------------|-------------|',
    ...rows,
    '',
  ].join('\n');
}

function buildCodeExamples(changes: BreakingChange[]): string {
  const withExamples = changes.filter(
    (c): c is BreakingChange & { before: string; after: string } => Boolean(c.before && c.after),
  );
  if (withExamples.length === 0) return '';

  const sections = withExamples.map((c) => {
    return [
      `#### \`${c.api}\``,
      '',
      '**Before:**',
      codeBlock(c.before, 'typescript'),
      '',
      '**After:**',
      codeBlock(c.after, 'typescript'),
      '',
    ].join('\n');
  });

  return ['### Code Examples', '', ...sections].join('\n');
}

export function generateMarkdownReport(report: UpgradeReport): string {
  const { stack, plan, outdatedDependencies, peerConflicts, refactorResults, manualActions } = report;
  const riskEmoji = RISK_EMOJI[plan.riskLevel];

  const sections: string[] = [];

  // Header
  sections.push(
    [
      `# Upgrade Report: ${stack.framework} ${plan.fromVersion} → ${plan.toVersion}`,
      '',
      `> Generated: ${report.generatedAt}`,
      '',
      '---',
      '',
    ].join('\n'),
  );

  // Evidence quality note
  const lockfileNote = stack.lockfileParsed
    ? '✅ Lockfile parsed — installed versions are exact.'
    : '⚠️ No lockfile found — installed versions estimated from package.json ranges.';
  const tsconfigNote = stack.tsconfig ? '✅ tsconfig.json read.' : '⚠️ tsconfig.json not found.';

  sections.push(
    [
      '## Evidence Sources',
      '',
      `| Source | Status |`,
      `|--------|--------|`,
      `| package.json | ✅ Read directly |`,
      `| Lockfile (resolved versions) | ${lockfileNote} |`,
      `| tsconfig.json | ${tsconfigNote} |`,
      `| npm registry (latest versions) | ✅ Live query at report generation time |`,
      `| Breaking change catalogue | ℹ️ Inferred from static knowledge base — verify against official migration guide |`,
      '',
    ].join('\n'),
  );

  // Summary
  const tsInfo = stack.tsconfig
    ? `${stack.typescript ?? 'not detected'} (strict: ${stack.tsconfig.strict ?? 'not set'})`
    : (stack.typescript ?? 'not detected');

  sections.push(
    [
      '## Summary',
      '',
      `| | |`,
      `|---|---|`,
      `| **Framework** | ${stack.framework} ${stack.frameworkVersion} |`,
      `| **Target** | ${stack.framework} ${plan.toVersion} |`,
      `| **TypeScript** | ${tsInfo} |`,
      `| **Build tool** | ${stack.buildTool} |`,
      `| **Package manager** | ${stack.packageManager} |`,
      `| **Strategy** | ${plan.strategy === 'incremental' ? `Incremental (${plan.steps.length} steps)` : 'Direct'} |`,
      `| **Risk level** | ${riskEmoji} ${plan.riskLevel.toUpperCase()} |`,
      `| **Estimated effort** | ${plan.estimatedEffort} |`,
      `| **Effort basis** | ${plan.effortBasis} |`,
      `| **Breaking changes** | ${plan.totalBreakingChanges} (${plan.totalAutomatedFixes} auto-fixable) |`,
      '',
    ].join('\n'),
  );

  // Upgrade path
  sections.push(
    [
      '## Upgrade Path',
      '',
      plan.steps
        .map((s, i) => `${i + 1}. **v${s.fromVersion} → v${s.toVersion}** — ${s.description}`)
        .join('\n'),
      '',
    ].join('\n'),
  );

  // Outdated dependencies
  sections.push(['## Outdated Dependencies', '', depTable(outdatedDependencies, stack.lockfileParsed), ''].join('\n'));

  // Peer conflicts
  if (peerConflicts.length > 0) {
    sections.push(peerConflictTable(peerConflicts));
  }

  // Step-by-step breakdown
  sections.push('## Step-by-Step Upgrade Details\n');

  for (const step of plan.steps) {
    const allChanges = step.breakingChanges;

    const refLink = step.referenceUrl
      ? `\n> 📖 Official guide: [Angular Update Guide](${step.referenceUrl})\n`
      : '';

    sections.push(
      [
        `### Step: v${step.fromVersion} → v${step.toVersion}`,
        '',
        `> ${step.description}`,
        refLink,
        '> ℹ️ Breaking changes below are from the static knowledge catalogue. Verify each against the official migration guide before applying.',
        '',
        '#### Breaking Changes',
        '',
        changeTable(allChanges),
        '',
        buildCodeExamples(allChanges),
        '#### Manual Actions Required',
        '',
        step.manualActions.map((a) => `- [ ] ${a}`).join('\n'),
        '',
        '#### npm Install Command',
        '',
        codeBlock(`npm install ${step.npmInstall.join(' ')}`, 'bash'),
        '',
      ].join('\n'),
    );
  }

  // Code suggestions
  if (refactorResults.length > 0) {
    const allSuggestions = refactorResults.flatMap((r) => r.suggestions);
    sections.push(
      [
        '## Detected Code Issues',
        '',
        `Found **${allSuggestions.length}** location(s) in your codebase that need attention:`,
        '',
        ...refactorResults.map((r) => {
          const lines = r.suggestions.map(
            (s) => `  - Line ${s.line}: \`${s.change.api}\` — ${s.change.description}`,
          );
          return [`**${r.file}**`, ...lines].join('\n');
        }),
        '',
      ].join('\n'),
    );
  }

  // Manual actions summary
  if (manualActions.length > 0) {
    sections.push(
      [
        '## Manual Action Checklist',
        '',
        manualActions.map((a) => `- [ ] ${a}`).join('\n'),
        '',
      ].join('\n'),
    );
  }

  // Build validation
  if (report.buildValidation && report.buildValidation.length > 0) {
    const baseline = report.baselineValidation ?? [];
    const hasBaseline = baseline.length > 0;

    const rows = report.buildValidation.map((r: BuildValidationResult) => {
      const icon = r.status === 'success' ? '✅' : r.status === 'failed' ? '❌' : '⏭️';
      const dur = r.durationMs !== undefined ? ` (${Math.round(r.durationMs / 1000)}s)` : '';
      const err = r.error ? `\n  \`\`\`\n  ${r.error.slice(0, 300)}\n  \`\`\`` : '';

      if (hasBaseline) {
        const base = baseline.find((b) => b.step === r.step);
        let classification = '';
        if (base) {
          if (base.status !== 'failed' && r.status === 'failed') classification = ' ⚠️ migration-induced';
          else if (base.status === 'failed' && r.status === 'failed') classification = ' (pre-existing)';
          else if (base.status === 'skipped' && r.status === 'skipped') classification = ' (no script)';
        }
        const baseIcon = base ? (base.status === 'success' ? '✅' : base.status === 'failed' ? '❌' : '⏭️') : '—';
        return `| ${r.step} | ${baseIcon} | ${icon}${dur} | ${r.status}${classification} |${err}`;
      }

      return `| ${icon} | ${r.step} | ${r.status}${dur} |${err}`;
    });

    if (hasBaseline) {
      sections.push(
        [
          '## Build Validation',
          '',
          '| Step | Baseline | Post-migration | Classification |',
          '|------|----------|----------------|----------------|',
          ...rows,
          '',
          '> ⚠️ = migration-induced failure &nbsp; (pre-existing) = existed before migration',
          '',
        ].join('\n'),
      );
    } else {
      sections.push(
        [
          '## Build Validation',
          '',
          '| Status | Step | Result |',
          '|--------|------|--------|',
          ...rows,
          '',
        ].join('\n'),
      );
    }
  }

  // Rollback plan
  sections.push(
    [
      '## Rollback Plan',
      '',
      '1. Restore `package.json` and `package-lock.json` (or `yarn.lock` / `pnpm-lock.yaml`) from version control',
      '2. Run `npm install` (or yarn/pnpm equivalent) to restore previous dependency tree',
      '3. Revert any modified source files via `git checkout -- .`',
      '4. If configs were modified, restore them from git: `git checkout -- angular.json tsconfig.json webpack.config.js`',
      '',
      '> **Tip:** Create a git tag before upgrading: `git tag pre-upgrade-backup`',
      '',
    ].join('\n'),
  );

  return sections.join('\n');
}

export function generateJsonReport(report: UpgradeReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * findings.json — structured, evidence-based list of every finding.
 * Machine-readable; designed for CI consumption.
 */
export function generateFindingsJson(report: UpgradeReport): string {
  const findings = [
    ...report.outdatedDependencies.map((d) => ({
      type: d.deprecated ? 'deprecated_package' : 'outdated_package',
      package: d.name,
      current: d.current,
      latest: d.latest,
      riskLevel: d.risk,
      riskCategory: d.riskCategory ?? (d.deprecated ? 'deprecated' : 'breaking-compatibility'),
      confidence: d.confidence,
      source: d.observedIn ?? 'package.json',
      evidence: d.latestSource === 'registry' ? 'npm registry query' : 'static knowledge base',
      reason: d.reason ?? null,
    })),
    ...report.peerConflicts.map((c) => ({
      type: 'peer_conflict',
      package: c.package,
      installedVersion: c.installedVersion,
      requiredRange: c.requiredRange,
      requiredBy: c.requiredBy,
      unresolvable: c.unresolvable,
      confidence: 'high',
      source: 'package.json + lockfile',
      evidence: 'semver peer constraint check',
    })),
    ...report.refactorResults.flatMap((r) =>
      r.suggestions.map((s) => ({
        type: 'code_issue',
        file: r.file,
        line: s.line ?? null,
        api: s.change.api,
        description: s.change.description,
        automated: s.change.automated,
        severity: s.change.severity,
        confidence: s.change.confidence ?? 'medium',
        source: r.file,
        evidence: 'source pattern scan',
      })),
    ),
  ];

  return JSON.stringify(
    {
      schemaVersion: '1.0',
      generatedAt: report.generatedAt,
      project: {
        framework: report.stack.framework,
        version: report.stack.frameworkVersion,
        packageManager: report.stack.packageManager,
        lockfileParsed: report.stack.lockfileParsed,
      },
      summary: {
        totalFindings: findings.length,
        deprecated: report.outdatedDependencies.filter((d) => d.deprecated).length,
        outdated: report.outdatedDependencies.filter((d) => !d.deprecated).length,
        peerConflicts: report.peerConflicts.length,
        codeIssues: report.refactorResults.flatMap((r) => r.suggestions).length,
      },
      findings,
    },
    null,
    2,
  );
}

/**
 * plan.json — machine-readable upgrade plan, decisions, and validation results.
 */
export function generatePlanJson(report: UpgradeReport): string {
  return JSON.stringify(
    {
      schemaVersion: '1.0',
      generatedAt: report.generatedAt,
      framework: report.stack.framework,
      fromVersion: report.plan.fromVersion,
      toVersion: report.plan.toVersion,
      strategy: report.plan.strategy,
      riskLevel: report.plan.riskLevel,
      estimatedEffort: report.plan.estimatedEffort,
      effortBasis: report.plan.effortBasis,
      decisions: report.decisions ?? null,
      steps: report.plan.steps.map((s) => ({
        fromVersion: s.fromVersion,
        toVersion: s.toVersion,
        description: s.description,
        referenceUrl: s.referenceUrl ?? null,
        npmInstall: s.npmInstall,
        manualActions: s.manualActions,
        breakingChanges: s.breakingChanges.map((c) => ({
          api: c.api,
          description: c.description,
          automated: c.automated,
          severity: c.severity,
          confidence: c.confidence,
          category: c.category,
        })),
      })),
      buildValidation: report.buildValidation ?? null,
    },
    null,
    2,
  );
}
