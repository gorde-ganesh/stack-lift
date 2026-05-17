import type {
  UpgradeReport,
  BreakingChange,
  DependencyInfo,
  PeerDepConflict,
  BuildValidationResult,
  FailureDiagnostic,
} from '@stack-lift/shared';
import { SCHEMA_VERSION } from '@stack-lift/schemas';

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

function _changeTable(changes: BreakingChange[]): string {
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

const AUTOMATION_LABEL: Record<string, string> = {
  automatable: 'Automatable',
  assisted: 'Assisted',
  advisory: 'Advisory',
};

function migrationRuleTable(changes: BreakingChange[]): string {
  if (changes.length === 0) return '_No breaking changes in this step._\n';

  const rows = changes.map((c) => {
    const automationLevel = c.automationLevel ?? (c.automated ? 'automatable' : 'assisted');
    const automated = c.automated ? 'safe auto-fix' : AUTOMATION_LABEL[automationLevel];
    const remediation = c.remediationGuidance ?? c.after ?? c.description;
    const conf = CONFIDENCE_LABEL[c.confidence ?? 'medium'] ?? CONFIDENCE_LABEL['medium'];
    return `| ${SEVERITY_EMOJI[c.severity]} | \`${c.api}\` | ${c.description} | ${automated} | ${remediation} | ${conf} |`;
  });

  return (
    [
      '| Severity | API | Description | Fix | Remediation | Confidence |',
      '|----------|-----|-------------|-----|-------------|-----------|',
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

const CATEGORY_LABEL: Record<string, string> = {
  'peer-dependency-conflict': 'Peer Dependency Conflict',
  'angular-compiler-incompatibility': 'Angular Compiler Error',
  'builder-config-mismatch': 'Builder Config Mismatch',
  'test-runner-breakage': 'Test Runner Failure',
  'typescript-error': 'TypeScript Error',
  'module-not-found': 'Module Not Found',
  timeout: 'Build Timeout',
  unknown: 'Unknown Failure',
};

function diagnosticsSection(diagnostics: FailureDiagnostic[]): string {
  if (diagnostics.length === 0) return '';

  const items = diagnostics.map((d) => {
    const label = CATEGORY_LABEL[d.category] ?? d.category;
    const conf = CONFIDENCE_LABEL[d.confidence] ?? '';
    const detail = d.detail ? `\n\n  \`\`\`\n  ${d.detail}\n  \`\`\`` : '';
    const remediations = d.remediations
      .map((r) => {
        const cmd = r.command ? `\n    \`${r.command}\`` : '';
        const docs = r.docsUrl ? ` — [docs](${r.docsUrl})` : '';
        return `  - ${r.action}${docs}${cmd}`;
      })
      .join('\n');
    return [`### ${label} (${conf})`, '', `**${d.summary}**${detail}`, '', remediations].join('\n');
  });

  return ['## Failure Diagnostics', '', ...items, ''].join('\n');
}

export function generateMarkdownReport(report: UpgradeReport): string {
  const { stack, plan, outdatedDependencies, peerConflicts, refactorResults, manualActions } =
    report;
  const riskEmoji = RISK_EMOJI[plan.riskLevel];

  const sections: string[] = [];

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
      `| **Migration rules** | ${plan.migrationRuleCounts?.automatable ?? 0} automatable, ${plan.migrationRuleCounts?.assisted ?? 0} assisted, ${plan.migrationRuleCounts?.advisory ?? 0} advisory |`,
      '',
    ].join('\n'),
  );

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

  sections.push(
    ['## Outdated Dependencies', '', depTable(outdatedDependencies, stack.lockfileParsed), ''].join(
      '\n',
    ),
  );

  if (peerConflicts.length > 0) {
    sections.push(peerConflictTable(peerConflicts));
  }

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
        migrationRuleTable(allChanges),
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

  if (report.configMigrations && report.configMigrations.length > 0) {
    const needed = report.configMigrations.filter((m) => m.needed);
    const applied = report.configMigrations.filter((m) => m.applied);
    const rows = report.configMigrations.map((m) => {
      const status = m.applied ? '✅ Applied' : m.needed ? '⚠️ Needed' : '✔️ Already done';
      return `| \`${m.file}\` | v${m.fromVersion}→v${m.toVersion} | ${m.description} | ${status} |`;
    });
    const summary =
      applied.length > 0
        ? `${applied.length} applied`
        : needed.length > 0
          ? `${needed.length} needed — re-run with \`--apply\` to write`
          : 'no changes needed';
    sections.push(
      [
        '## Config Migrations',
        '',
        `> ${summary}`,
        '',
        '| File | Version hop | Change | Status |',
        '|------|-------------|--------|--------|',
        ...rows,
        '',
      ].join('\n'),
    );
  }

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
          if (base.status !== 'failed' && r.status === 'failed')
            classification = ' ⚠️ migration-induced';
          else if (base.status === 'failed' && r.status === 'failed')
            classification = ' (pre-existing)';
          else if (base.status === 'skipped' && r.status === 'skipped')
            classification = ' (no script)';
        }
        const baseIcon = base
          ? base.status === 'success'
            ? '✅'
            : base.status === 'failed'
              ? '❌'
              : '⏭️'
          : '—';
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

  if (report.diagnosticSummary && report.diagnosticSummary.totalFailures > 0) {
    sections.push(diagnosticsSection(report.diagnosticSummary.diagnostics));
  }

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

export const STABLE_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export interface SerializeOptions {
  omitTimestamp?: boolean;
}

function stableStringify(value: unknown, indent = 2): string {
  function sortKeys(_key: string, val: unknown): unknown {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
      );
    }
    return val;
  }
  return JSON.stringify(value, sortKeys, indent);
}

function resolveTimestamp(report: UpgradeReport, opts?: SerializeOptions): string {
  return opts?.omitTimestamp ? STABLE_TIMESTAMP : report.generatedAt;
}

function buildFindingsList(report: UpgradeReport) {
  return [
    ...report.outdatedDependencies.map((d) => ({
      api: undefined,
      automated: undefined,
      confidence: d.confidence,
      current: d.current,
      description: undefined,
      evidence: d.latestSource === 'registry' ? 'npm registry query' : 'static knowledge base',
      file: undefined,
      latest: d.latest,
      line: undefined,
      package: d.name,
      reason: d.reason ?? null,
      riskCategory: d.riskCategory ?? (d.deprecated ? 'deprecated' : 'breaking-compatibility'),
      riskLevel: d.risk,
      severity: undefined,
      source: d.observedIn ?? 'package.json',
      type: d.deprecated ? 'deprecated_package' : 'outdated_package',
    })),
    ...report.peerConflicts.map((c) => ({
      confidence: 'high' as const,
      evidence: 'semver peer constraint check',
      installedVersion: c.installedVersion,
      package: c.package,
      requiredBy: c.requiredBy,
      requiredRange: c.requiredRange,
      source: 'package.json + lockfile',
      type: 'peer_conflict',
      unresolvable: c.unresolvable,
    })),
    ...report.refactorResults.flatMap((r) =>
      r.suggestions.map((s) => ({
        api: s.change.api,
        automated: s.change.automated,
        automationLevel: s.change.automationLevel ?? (s.change.automated ? 'automatable' : 'assisted'),
        confidence: s.change.confidence ?? 'medium',
        description: s.change.description,
        evidence: 'source pattern scan',
        file: r.file,
        line: s.line ?? null,
        severity: s.change.severity,
        remediationGuidance: s.change.remediationGuidance ?? null,
        source: r.file,
        type: 'code_issue',
      })),
    ),
  ]
    .map((f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)))
    .sort((a, b) => {
      const typeOrder = (a['type'] as string).localeCompare(b['type'] as string);
      if (typeOrder !== 0) return typeOrder;
      const aKey = (a['package'] ?? a['file'] ?? '') as string;
      const bKey = (b['package'] ?? b['file'] ?? '') as string;
      return aKey.localeCompare(bKey);
    });
}

export function generateFindingsJson(report: UpgradeReport, opts?: SerializeOptions): string {
  const findings = buildFindingsList(report);

  return stableStringify({
    findings,
    generatedAt: resolveTimestamp(report, opts),
    project: {
      framework: report.stack.framework,
      lockfileParsed: report.stack.lockfileParsed,
      packageManager: report.stack.packageManager,
      version: report.stack.frameworkVersion,
    },
    schemaVersion: SCHEMA_VERSION,
    summary: {
      codeIssues: report.refactorResults.flatMap((r) => r.suggestions).length,
      deprecated: report.outdatedDependencies.filter((d) => d.deprecated).length,
      outdated: report.outdatedDependencies.filter((d) => !d.deprecated).length,
      peerConflicts: report.peerConflicts.length,
      totalFindings: findings.length,
    },
  });
}

export function generateAnalysisJson(report: UpgradeReport, opts?: SerializeOptions): string {
  const findings = buildFindingsList(report);

  return stableStringify({
    findings,
    generatedAt: resolveTimestamp(report, opts),
    project: {
      framework: report.stack.framework,
      lockfileParsed: report.stack.lockfileParsed,
      packageManager: report.stack.packageManager,
      version: report.stack.frameworkVersion,
    },
    schemaVersion: SCHEMA_VERSION,
    summary: {
      codeIssues: report.refactorResults.flatMap((r) => r.suggestions).length,
      deprecated: report.outdatedDependencies.filter((d) => d.deprecated).length,
      outdated: report.outdatedDependencies.filter((d) => !d.deprecated).length,
      peerConflicts: report.peerConflicts.length,
      totalFindings: findings.length,
    },
  });
}

export function generateExecutionJson(report: UpgradeReport, opts?: SerializeOptions): string {
  const files = [...report.refactorResults]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((r) => ({
      applied: r.applied ?? [],
      file: r.file,
      suggestions: [...r.suggestions]
        .sort((a, b) => (a.change.api ?? '').localeCompare(b.change.api ?? ''))
        .map((s) => ({
          api: s.change.api,
          automated: s.change.automated,
          automationLevel: s.change.automationLevel ?? (s.change.automated ? 'automatable' : 'assisted'),
          confidence: s.change.confidence ?? 'medium',
          description: s.change.description,
          line: s.line ?? null,
          remediationGuidance: s.change.remediationGuidance ?? null,
          severity: s.change.severity,
        })),
    }));

  const totalSuggestions = files.reduce((n, f) => n + f.suggestions.length, 0);
  const filesModified = files.filter((f) => f.applied.length > 0).length;
  const applied = files.reduce((n, f) => n + f.applied.length, 0);

  const commands = report.commandExecutions
    ? report.commandExecutions.map((e) => ({
        cmd: e.cmd,
        durationMs: e.durationMs,
        exitCode: e.exitCode,
        stderrSummary: e.stderrSummary ?? null,
        stdoutSummary: e.stdoutSummary ?? null,
        timedOut: e.timedOut,
      }))
    : null;

  const commandsFailed = report.commandExecutions?.filter((e) => e.exitCode !== 0).length ?? 0;

  return stableStringify({
    ...(commands !== null ? { commandExecutionStatus: report.commandExecutionStatus ?? null } : {}),
    ...(commands !== null ? { commands } : {}),
    files,
    generatedAt: resolveTimestamp(report, opts),
    project: {
      framework: report.stack.framework,
      targetVersion: report.plan.toVersion,
      version: report.stack.frameworkVersion,
    },
    schemaVersion: SCHEMA_VERSION,
    summary: {
      applied,
      ...(commands !== null ? { commandsFailed } : {}),
      ...(commands !== null ? { commandsRun: commands.length } : {}),
      filesModified,
      filesScanned: files.length,
      totalSuggestions,
    },
  });
}

export function generateValidationJson(report: UpgradeReport, opts?: SerializeOptions): string {
  const stepOrder = ['install', 'build', 'test', 'lint'];
  const sortSteps = (steps: BuildValidationResult[]) =>
    [...steps].sort((a, b) => stepOrder.indexOf(a.step) - stepOrder.indexOf(b.step));

  const postMigration = sortSteps(report.buildValidation ?? []).map((r) => ({
    durationMs: r.durationMs ?? null,
    error: r.error ?? null,
    status: r.status,
    step: r.step,
  }));

  const baseline = report.baselineValidation
    ? sortSteps(report.baselineValidation).map((r) => ({
        durationMs: r.durationMs ?? null,
        error: r.error ?? null,
        status: r.status,
        step: r.step,
      }))
    : null;

  const regressions = postMigration
    .filter((r) => {
      if (r.status !== 'failed') return false;
      const base = baseline?.find((b) => b.step === r.step);
      return !base || base.status !== 'failed';
    })
    .map((r) => r.step)
    .sort();

  const passed = postMigration.filter((r) => r.status === 'success').length;
  const failed = postMigration.filter((r) => r.status === 'failed').length;
  const skipped = postMigration.filter((r) => r.status === 'skipped').length;

  return stableStringify({
    baseline,
    generatedAt: resolveTimestamp(report, opts),
    postMigration,
    project: {
      framework: report.stack.framework,
      targetVersion: report.plan.toVersion,
      version: report.stack.frameworkVersion,
    },
    regressions,
    schemaVersion: SCHEMA_VERSION,
    summary: {
      failed,
      passed,
      regressions: regressions.length,
      skipped,
      totalSteps: postMigration.length,
    },
  });
}

export function generatePlanJson(report: UpgradeReport, opts?: SerializeOptions): string {
  return stableStringify({
    buildValidation: report.buildValidation ?? null,
    decisions: report.decisions ?? null,
    effortBasis: report.plan.effortBasis,
    estimatedEffort: report.plan.estimatedEffort,
    framework: report.stack.framework,
    fromVersion: report.plan.fromVersion,
    generatedAt: resolveTimestamp(report, opts),
    migrationRuleCounts: report.plan.migrationRuleCounts ?? null,
    riskLevel: report.plan.riskLevel,
    schemaVersion: SCHEMA_VERSION,
    steps: report.plan.steps.map((s) => ({
      breakingChanges: [...s.breakingChanges]
        .sort((a, b) => a.api.localeCompare(b.api))
        .map((c) => ({
          api: c.api,
          automated: c.automated,
          automationLevel: c.automationLevel ?? (c.automated ? 'automatable' : 'assisted'),
          category: c.category,
          confidence: c.confidence,
          description: c.description,
          remediationGuidance: c.remediationGuidance ?? null,
          severity: c.severity,
        })),
      description: s.description,
      fromVersion: s.fromVersion,
      manualActions: s.manualActions,
      npmInstall: s.npmInstall,
      referenceUrl: s.referenceUrl ?? null,
      toVersion: s.toVersion,
    })),
    strategy: report.plan.strategy,
    toVersion: report.plan.toVersion,
  });
}
