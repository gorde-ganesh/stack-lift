import type { UpgradeReport, BreakingChange, DependencyInfo, PeerDepConflict } from '../types/index.js';

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

function changeTable(changes: BreakingChange[]): string {
  if (changes.length === 0) return '_No breaking changes in this step._\n';

  const rows = changes.map((c) => {
    const automated = c.automated ? '✅ Auto' : '🔧 Manual';
    return `| ${SEVERITY_EMOJI[c.severity]} | \`${c.api}\` | ${c.description} | ${automated} |`;
  });

  return (
    [
      '| Severity | API | Description | Fix |',
      '|----------|-----|-------------|-----|',
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
    return `| ${RISK_EMOJI[d.risk]} | \`${d.name}\` | ${d.current} | ${d.latest}${sourceTag} | ${label}${reason} |`;
  });

  return (
    [
      sourceNote,
      '',
      '| Risk | Package | Current | Latest | Note |',
      '|------|---------|---------|--------|------|',
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
