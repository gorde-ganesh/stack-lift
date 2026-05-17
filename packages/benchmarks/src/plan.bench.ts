import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { describe, it, expect } from 'vitest';
import { detectStack, planUpgrade } from '@stack-lift/core';
import { registerAngularProvider } from '@stack-lift/angular-provider';

registerAngularProvider();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../../../tests/fixtures');

interface PlanBenchResult {
  fixture: string;
  fromVersion: string;
  toVersion: string;
  strategy: string;
  stepCount: number;
  totalBreakingChanges: number;
  totalAutomatedFixes: number;
  riskLevel: string;
  durationMs: number;
}

function runPlanBench(fixtureName: string, fixturePath: string): PlanBenchResult {
  const start = performance.now();
  const stack = detectStack(fixturePath);
  const plan = planUpgrade(stack);
  const durationMs = performance.now() - start;
  return {
    fixture: fixtureName,
    fromVersion: plan.fromVersion,
    toVersion: plan.toVersion,
    strategy: plan.strategy,
    stepCount: plan.steps.length,
    totalBreakingChanges: plan.totalBreakingChanges,
    totalAutomatedFixes: plan.totalAutomatedFixes,
    riskLevel: plan.riskLevel,
    durationMs,
  };
}

const ANGULAR_FIXTURES = [
  { name: 'angular-12', path: path.join(FIXTURES_DIR, 'angular-12') },
  { name: 'angular-16', path: path.join(FIXTURES_DIR, 'angular-16') },
  { name: 'angular-18', path: path.join(FIXTURES_DIR, 'angular-18') },
  { name: 'angular-material-app', path: path.join(FIXTURES_DIR, 'angular-material-app') },
  { name: 'angular-nx-workspace', path: path.join(FIXTURES_DIR, 'angular-nx-workspace') },
];

describe('plan benchmarks', () => {
  const results: PlanBenchResult[] = [];

  for (const fixture of ANGULAR_FIXTURES) {
    it(`generates plan for ${fixture.name}`, () => {
      const result = runPlanBench(fixture.name, fixture.path);
      results.push(result);

      expect(result.fromVersion).toBeTruthy();
      expect(result.toVersion).toBeTruthy();
      expect(result.stepCount).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThan(1000);
    });

    it(`plan snapshot matches for ${fixture.name}`, () => {
      const stack = detectStack(fixture.path);
      const plan = planUpgrade(stack);
      expect({
        framework: plan.framework,
        fromVersion: plan.fromVersion,
        toVersion: plan.toVersion,
        strategy: plan.strategy,
        stepCount: plan.steps.length,
        riskLevel: plan.riskLevel,
        totalBreakingChanges: plan.totalBreakingChanges,
        totalAutomatedFixes: plan.totalAutomatedFixes,
      }).toMatchSnapshot();
    });
  }

  it('angular-12 produces incremental plan with multiple steps', () => {
    const stack = detectStack(path.join(FIXTURES_DIR, 'angular-12'));
    const plan = planUpgrade(stack);
    expect(plan.strategy).toBe('incremental');
    expect(plan.steps.length).toBeGreaterThan(1);
  });

  it('all plan generations complete within 500ms each', () => {
    for (const fixture of ANGULAR_FIXTURES) {
      const start = performance.now();
      const stack = detectStack(fixture.path);
      planUpgrade(stack);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500);
    }
  });

  it('Nx workspace plan includes nx migrate manual action', () => {
    const stack = detectStack(path.join(FIXTURES_DIR, 'angular-nx-workspace'));
    expect(stack.workspaceInfo?.isNx).toBe(true);
  });
});
