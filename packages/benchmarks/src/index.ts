import { performance } from 'node:perf_hooks';
import { detectStack, planUpgrade } from '@stack-lift/core';
import { registerAngularProvider } from '@stack-lift/angular-provider';

export interface BenchmarkFixture {
  name: string;
  projectPath: string;
  targetVersion?: string;
}

export interface BenchmarkResult {
  fixture: string;
  framework: string;
  fromVersion: string;
  toVersion: string;
  stepCount: number;
  durationMs: number;
}

registerAngularProvider();

export function runPlanningBenchmark(fixture: BenchmarkFixture): BenchmarkResult {
  const start = performance.now();
  const stack = detectStack(fixture.projectPath);
  const plan = planUpgrade(stack, fixture.targetVersion);
  const durationMs = performance.now() - start;

  return {
    fixture: fixture.name,
    framework: stack.framework,
    fromVersion: plan.fromVersion,
    toVersion: plan.toVersion,
    stepCount: plan.steps.length,
    durationMs,
  };
}

export function runPlanningBenchmarks(fixtures: BenchmarkFixture[]): BenchmarkResult[] {
  return fixtures.map((fixture) => runPlanningBenchmark(fixture));
}
