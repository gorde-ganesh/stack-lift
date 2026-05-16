import { performance } from 'node:perf_hooks';
import { detectStack, planUpgrade } from '@stack-lift/core';
import { registerAngularProvider } from '@stack-lift/angular-provider';

registerAngularProvider();

export interface BenchmarkResult {
  name: string;
  durationMs: number;
}

export function benchmarkPlanning(projectPath: string, targetVersion?: string): BenchmarkResult {
  const started = performance.now();
  const stack = detectStack(projectPath);
  planUpgrade(stack, targetVersion);
  return {
    name: 'planning',
    durationMs: Number((performance.now() - started).toFixed(2)),
  };
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  const projectPath = process.argv[2] ?? process.cwd();
  const result = benchmarkPlanning(projectPath, process.argv[3]);
  console.log(JSON.stringify(result, null, 2));
}
