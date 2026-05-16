import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack } from '../packages/core/src/detector/stack-detector.js';
import { planUpgrade } from '../packages/core/src/planner/upgrade-planner.js';
import { registerFrameworkProvider } from '../packages/core/src/providers/registry.js';
import { angularProvider } from '../packages/angular-provider/src/index.js';

registerFrameworkProvider(angularProvider);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

describe('planUpgrade — Angular', () => {
  it('plans Angular 12 → 18 as incremental with 6 steps', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const plan = planUpgrade(stack, '18');
    expect(plan.strategy).toBe('incremental');
    expect(plan.steps.length).toBe(6);
    expect(plan.fromVersion).toBe('12');
    expect(plan.toVersion).toBe('18');
  });

  it('plans Angular 12 → 13 as direct (single step)', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const plan = planUpgrade(stack, '13');
    expect(plan.strategy).toBe('direct');
    expect(plan.steps.length).toBe(1);
  });

  it('computes totalBreakingChanges correctly', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const plan = planUpgrade(stack, '18');
    const expected = plan.steps.reduce((n, s) => n + s.breakingChanges.length, 0);
    expect(plan.totalBreakingChanges).toBe(expected);
  });

  it('includes npm install commands for each step', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const plan = planUpgrade(stack, '13');
    expect(plan.steps[0].npmInstall.length).toBeGreaterThan(0);
    expect(plan.steps[0].npmInstall.some((p) => p.startsWith('@angular/core@'))).toBe(true);
  });

  it('throws for unsupported target version', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    expect(() => planUpgrade(stack, '99')).toThrow(/not in the supported/);
  });

  it('throws when target is not greater than current', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    expect(() => planUpgrade(stack, '11')).toThrow(/must be greater/);
  });

  it('assigns a risk level', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const plan = planUpgrade(stack, '18');
    expect(['low', 'medium', 'high', 'critical']).toContain(plan.riskLevel);
  });
});

describe('planUpgrade — React', () => {
  it('plans React 16 → 19 as incremental', () => {
    const stack = detectStack(path.join(fixtures, 'react-16'));
    const plan = planUpgrade(stack, '19');
    expect(plan.strategy).toBe('incremental');
    expect(plan.steps.length).toBe(3);
  });

  it('plans React 17 → 18 as direct', () => {
    const stack = detectStack(path.join(fixtures, 'react-17'));
    const plan = planUpgrade(stack, '18');
    expect(plan.strategy).toBe('direct');
    expect(plan.steps.length).toBe(1);
  });

  it('includes ReactDOM.render breaking change in React 17→18', () => {
    const stack = detectStack(path.join(fixtures, 'react-17'));
    const plan = planUpgrade(stack, '18');
    const apis = plan.steps.flatMap((s) => s.breakingChanges.map((c) => c.api));
    expect(apis).toContain('ReactDOM.render');
  });

  it('throws for unsupported React framework', () => {
    const stack = detectStack(path.join(fixtures, 'react-16'));
    expect(() => planUpgrade(stack, '99')).toThrow();
  });
});
