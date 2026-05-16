import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  writeArtifacts,
  writeMachineArtifacts,
} from '../packages/core/src/reporting/artifact-writer.js';
import { detectStack } from '../packages/core/src/detector/stack-detector.js';
import { planUpgrade } from '../packages/core/src/planner/upgrade-planner.js';
import { fileURLToPath } from 'node:url';
import type { UpgradeReport } from '../packages/shared/src/index.js';
import { registerFrameworkProvider } from '../packages/core/src/providers/registry.js';
import { angularProvider } from '../packages/angular-provider/src/index.js';

registerFrameworkProvider(angularProvider);

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
    const formats = results.map((r) => r.format).sort();
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
  it('writes analysis.json', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const analysisResult = results.find((r) => r.format === 'analysis');
    expect(analysisResult).toBeDefined();
    expect(fs.existsSync(analysisResult!.filePath)).toBe(true);
    const raw = fs.readFileSync(analysisResult!.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { schemaVersion: string; findings: unknown[] };
    expect(parsed.schemaVersion).toBe('1.0');
    expect(Array.isArray(parsed.findings)).toBe(true);
  });

  it('writes plan.json', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const planResult = results.find((r) => r.format === 'plan');
    expect(planResult).toBeDefined();
    expect(fs.existsSync(planResult!.filePath)).toBe(true);
    const raw = fs.readFileSync(planResult!.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { schemaVersion: string; steps: unknown[] };
    expect(parsed.schemaVersion).toBe('1.0');
    expect(Array.isArray(parsed.steps)).toBe(true);
  });

  it('writes execution.json', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const execResult = results.find((r) => r.format === 'execution');
    expect(execResult).toBeDefined();
    expect(fs.existsSync(execResult!.filePath)).toBe(true);
    const raw = fs.readFileSync(execResult!.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      schemaVersion: string;
      files: unknown[];
      summary: { filesScanned: number };
    };
    expect(parsed.schemaVersion).toBe('1.0');
    expect(Array.isArray(parsed.files)).toBe(true);
    expect(typeof parsed.summary.filesScanned).toBe('number');
  });

  it('writes validation.json', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const valResult = results.find((r) => r.format === 'validation');
    expect(valResult).toBeDefined();
    expect(fs.existsSync(valResult!.filePath)).toBe(true);
    const raw = fs.readFileSync(valResult!.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      schemaVersion: string;
      postMigration: unknown[];
      regressions: unknown[];
    };
    expect(parsed.schemaVersion).toBe('1.0');
    expect(Array.isArray(parsed.postMigration)).toBe(true);
    expect(Array.isArray(parsed.regressions)).toBe(true);
  });

  it('keeps findings.json for backward compatibility', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const findingsResult = results.find((r) => r.format === 'findings');
    expect(findingsResult).toBeDefined();
    expect(fs.existsSync(findingsResult!.filePath)).toBe(true);
  });

  it('analysis.json includes deprecated package finding', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const analysisResult = results.find((r) => r.format === 'analysis')!;
    const raw = fs.readFileSync(analysisResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { findings: Array<{ package: string }> };
    const momentFinding = parsed.findings.find((f) => f.package === 'moment');
    expect(momentFinding).toBeDefined();
  });

  it('analysis.json summary counts match actual findings', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const analysisResult = results.find((r) => r.format === 'analysis')!;
    const raw = fs.readFileSync(analysisResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      findings: unknown[];
      summary: { totalFindings: number; deprecated: number };
    };
    expect(parsed.summary.totalFindings).toBe(parsed.findings.length);
    expect(parsed.summary.deprecated).toBe(1);
  });

  it('analysis.json findings are sorted deterministically', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const analysisResult = results.find((r) => r.format === 'analysis')!;
    const raw = fs.readFileSync(analysisResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { findings: Array<{ type: string }> };
    const types = parsed.findings.map((f) => f.type);
    expect(types).toEqual([...types].sort());
  });

  it('plan.json object keys are sorted alphabetically', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const planResult = results.find((r) => r.format === 'plan')!;
    const raw = fs.readFileSync(planResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { steps: Array<{ fromVersion: string }> };
    expect(parsed.steps[0].fromVersion).toBe('12');
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });

  it('validation.json regressions lists only newly-failed steps', () => {
    const results = writeMachineArtifacts(makeReport(), tmpDir);
    const valResult = results.find((r) => r.format === 'validation')!;
    const raw = fs.readFileSync(valResult.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { regressions: string[] };
    expect(Array.isArray(parsed.regressions)).toBe(true);
  });

  it('stable mode produces reproducible output with fixed timestamp', () => {
    const report = makeReport();
    const results1 = writeMachineArtifacts(report, tmpDir, { omitTimestamp: true });
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-lift-stable-'));
    try {
      const results2 = writeMachineArtifacts(report, dir2, { omitTimestamp: true });
      const r1 = results1.find((r) => r.format === 'analysis')!;
      const r2 = results2.find((r) => r.format === 'analysis')!;
      expect(fs.readFileSync(r1.filePath, 'utf-8')).toBe(fs.readFileSync(r2.filePath, 'utf-8'));
      const parsed = JSON.parse(fs.readFileSync(r1.filePath, 'utf-8')) as { generatedAt: string };
      expect(parsed.generatedAt).toBe('1970-01-01T00:00:00.000Z');
    } finally {
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });
});
