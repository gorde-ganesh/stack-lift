import type { UpgradeReport, BreakingChange, DependencyInfo } from '../types/index.js';

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

  return [
    '| Severity | API | Description | Fix |',
    '|----------|-----|-------------|-----|',
    ...rows,
  ].join('\n') + '\n';
}

function depTable(deps: DependencyInfo[]): string {
  if (deps.length === 0) return '_All tracked dependencies are up to date._\n';

  const rows = deps.map((d) => {
    const label = d.deprecated ? '⚠️ Deprecated' : 'Outdated';
    const reason = d.reason ? ` — ${d.reason}` : '';
    return `| ${RISK_EMOJI[d.risk]} | \`${d.name}\` | ${d.current} | ${d.latest} | ${label}${reason} |`;
  });

  return [
    '| Risk | Package | Current | Latest | Note |',
    '|------|---------|---------|--------|------|',
    ...rows,
  ].join('\n') + '\n';
}

function buildCodeExamples(changes: BreakingChange[]): string {
  const withExamples = changes.filter((c) => c.before && c.after);
  if (withExamples.length === 0) return '';

  const sections = withExamples.map((c) => {
    return [
      `#### \`${c.api}\``,
      '',
      '**Before:**',
      codeBlock(c.before!, 'typescript'),
      '',
      '**After:**',
      codeBlock(c.after!, 'typescript'),
      '',
    ].join('\n');
  });

  return ['### Code Examples', '', ...sections].join('\n');
}

export function generateMarkdownReport(report: UpgradeReport): string {
  const { stack, plan, outdatedDependencies, refactorResults, manualActions } = report;
  const riskEmoji = RISK_EMOJI[plan.riskLevel];

  const sections: string[] = [];

  // Header
  sections.push([
    `# Upgrade Report: ${stack.framework} ${plan.fromVersion} → ${plan.toVersion}`,
    '',
    `> Generated: ${report.generatedAt}`,
    '',
    '---',
    '',
  ].join('\n'));

  // Summary
  sections.push([
    '## Summary',
    '',
    `| | |`,
    `|---|---|`,
    `| **Framework** | ${stack.framework} ${stack.frameworkVersion} |`,
    `| **Target** | ${stack.framework} ${plan.toVersion} |`,
    `| **TypeScript** | ${stack.typescript ?? 'not detected'} |`,
    `| **Build tool** | ${stack.buildTool} |`,
    `| **Package manager** | ${stack.packageManager} |`,
    `| **Strategy** | ${plan.strategy === 'incremental' ? `Incremental (${plan.steps.length} steps)` : 'Direct'} |`,
    `| **Risk level** | ${riskEmoji} ${plan.riskLevel.toUpperCase()} |`,
    `| **Estimated effort** | ${plan.estimatedEffort} |`,
    `| **Breaking changes** | ${plan.totalBreakingChanges} (${plan.totalAutomatedFixes} auto-fixable) |`,
    '',
  ].join('\n'));

  // Upgrade path
  sections.push([
    '## Upgrade Path',
    '',
    plan.steps.map((s, i) =>
      `${i + 1}. **v${s.fromVersion} → v${s.toVersion}** — ${s.description}`
    ).join('\n'),
    '',
  ].join('\n'));

  // Outdated dependencies
  sections.push([
    '## Outdated Dependencies',
    '',
    depTable(outdatedDependencies),
    '',
  ].join('\n'));

  // Step-by-step breakdown
  sections.push('## Step-by-Step Upgrade Details\n');

  for (const step of plan.steps) {
    const allChanges = step.breakingChanges;

    sections.push([
      `### Step: v${step.fromVersion} → v${step.toVersion}`,
      '',
      `> ${step.description}`,
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
    ].join('\n'));
  }

  // Code suggestions
  if (refactorResults.length > 0) {
    const allSuggestions = refactorResults.flatMap((r) => r.suggestions);
    sections.push([
      '## Detected Code Issues',
      '',
      `Found **${allSuggestions.length}** location(s) in your codebase that need attention:`,
      '',
      ...refactorResults.map((r) => {
        const lines = r.suggestions.map(
          (s) => `  - Line ${s.line}: \`${s.change.api}\` — ${s.change.description}`
        );
        return [`**${r.file}**`, ...lines].join('\n');
      }),
      '',
    ].join('\n'));
  }

  // Manual actions summary
  if (manualActions.length > 0) {
    sections.push([
      '## Manual Action Checklist',
      '',
      manualActions.map((a) => `- [ ] ${a}`).join('\n'),
      '',
    ].join('\n'));
  }

  // Rollback plan
  sections.push([
    '## Rollback Plan',
    '',
    '1. Restore `package.json` and `package-lock.json` (or `yarn.lock` / `pnpm-lock.yaml`) from version control',
    '2. Run `npm install` (or yarn/pnpm equivalent) to restore previous dependency tree',
    '3. Revert any modified source files via `git checkout -- .`',
    '4. If configs were modified, restore them from git: `git checkout -- angular.json tsconfig.json webpack.config.js`',
    '',
    '> **Tip:** Create a git tag before upgrading: `git tag pre-upgrade-backup`',
    '',
  ].join('\n'));

  return sections.join('\n');
}

export function generateJsonReport(report: UpgradeReport): string {
  return JSON.stringify(report, null, 2);
}
