import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { writeArtifacts, writeMachineArtifacts } from '../src/engines/artifact-writer.js';
import { detectStack } from '../src/engines/stack-detector.js';
import { planUpgrade } from '../src/engines/upgrade-planner.js';
import { fileURLToPath } from 'node:url';
import type { UpgradeReport } from '../src/types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

let tmpDir: string;

function makeReport(): UpgradeReport {
  const stack = detectStack(path.join(fixtures, 'angular-12'));
  const plan = planUpgrade(stack, '13');
  return {
    stack,
    plan,
    outdatedDependencies: [
      {
        name: 'moment',
        current: '2.29.0',
        latest: '2.30.1',
        type: 'dependencies',
        risk: 'medium',
        riskCategory: 'deprecated',
        breakingChanges: false,
        deprecated: true,
        reason: 'Moment.js is in maintenance mode',
        latestSource: 'registry',
        observedIn: 'package.json',
        confidence: 'high',
      },
    ],
    peerConflicts: [],
    refactorResults: [],
    manualActions: [],
    buildStatus: 'skipped',
    generatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-lift-artifacts-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('writeArtifacts', () => {
  it('writes markdown report', () => {
    const report = makeReport();
    const results = writeArtifacts(report, tmpDir, ['markdown']);
    expect(results).toHaveLength(1);
    expect(results[0].format).toBe('markdown');
    expect(fs.existsSync(results[0].filePath)).toBe(true);
    const content = fs.readFileSync(results[0].filePath, 'utf-8');
    expect(content).toContain('# Upgrade Report');
    expect(content).toContain('Angular');
  });

  it('writes JSON report', () => {
    const report = makeReport();
    const results = writeArtifacts(report, tmpDir, ['json']);
    expect(results).toHaveLength(1);
    expect(results[0].format).toBe('json');
    const raw = fs.readFileSync(results[0].filePath, 'utf-8');
    const parsed = JSON.parse(raw) as UpgradeReport;
    expect(parsed.stack.framework).toBe('Angular');
    expect(parsed.plan.fromVersion).toBe('12');
  });

  it('writes both markdown and JSON', () => {
    const report = makeReport();
    const results = writeArtifacts(report, tmpDir, ['markdown', 'json']);
    expect(results).toHaveLength(2);
    const formats = results.map(r => r.format).sort();
    expect(formats).toEqual(['json', 'markdown']);
  });

  it('creates output directory if it does not exist', () => {
    const nested = path.join(tmpDir, 'deeply', 'nested', 'output');
    expect(fs.existsSync(nested)).toBe(false);
    writeArtifacts(makeReport(), nested, ['json']);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it('returns empty array when no formats requested', () => {
    const results = writeArtifacts(makeReport(), tmpDir, []);
    expect(results).toHaveLength(0);
  });
});

describe('writeMachineArtifacts', () => {
  it('writes findings.json', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const findingsResult = results.find(r => r.format === 'findings');
    expect(findingsResult).toBeDefined();
    expect(fs.existsSync(findingsResult!.filePath)).toBe(true);
    const raw = fs.readFileSync(findingsResult!.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { schemaVersion: string; findings: unknown[] };
    expect(parsed.schemaVersion).toBe('1.0');
    expect(Array.isArray(parsed.findings)).toBe(true);
  });

  it('writes plan.json', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const planResult = results.find(r => r.format === 'plan');
    expect(planResult).toBeDefined();
    expect(fs.existsSync(planResult!.filePath)).toBe(true);
    const raw = fs.readFileSync(planResult!.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { schemaVersion: string; steps: unknown[] };
    expect(parsed.schemaVersion).toBe('1.0');
    expect(Array.isArray(parsed.steps)).toBe(true);
  });

  it('findings.json includes deprecated package finding', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const findingsResult = results.find(r => r.format === 'findings')!;
    const raw = fs.readFileSync(findingsResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { findings: Array<{ package: string }> };
    const momentFinding = parsed.findings.find(f => f.package === 'moment');
    expect(momentFinding).toBeDefined();
  });

  it('findings.json summary counts match actual findings', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const findingsResult = results.find(r => r.format === 'findings')!;
    const raw = fs.readFileSync(findingsResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      findings: unknown[];
      summary: { totalFindings: number; deprecated: number };
    };
    expect(parsed.summary.totalFindings).toBe(parsed.findings.length);
    expect(parsed.summary.deprecated).toBe(1);
  });

  it('plan.json includes step details', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const planResult = results.find(r => r.format === 'plan')!;
    const raw = fs.readFileSync(planResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { steps: Array<{ fromVersion: string }> };
    expect(parsed.steps[0].fromVersion).toBe('12');
  });
});
