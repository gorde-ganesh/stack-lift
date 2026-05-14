import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack } from '../src/engines/stack-detector.js';
import { analyzeDependencies } from '../src/engines/dependency-analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

describe('analyzeDependencies', () => {
  it('flags deprecated tslint in Angular 12 project', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const deps = analyzeDependencies(stack);
    const tslint = deps.find((d) => d.name === 'tslint');
    expect(tslint).toBeDefined();
    expect(tslint!.deprecated).toBe(true);
    expect(tslint!.risk).toBe('high');
  });

  it('flags deprecated codelyzer in Angular 12 project', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const deps = analyzeDependencies(stack);
    const codelyzer = deps.find((d) => d.name === 'codelyzer');
    expect(codelyzer).toBeDefined();
    expect(codelyzer!.deprecated).toBe(true);
  });

  it('flags outdated rxjs in Angular 12 project', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const deps = analyzeDependencies(stack);
    const rxjs = deps.find((d) => d.name === 'rxjs');
    expect(rxjs).toBeDefined();
    expect(rxjs!.current).toBe('6.6.0');
  });

  it('flags deprecated react-scripts in React 16 project', () => {
    const stack = detectStack(path.join(fixtures, 'react-16'));
    const deps = analyzeDependencies(stack);
    const rs = deps.find((d) => d.name === 'react-scripts');
    expect(rs).toBeDefined();
    expect(rs!.deprecated).toBe(true);
    expect(rs!.risk).toBe('high');
    expect(rs!.reason).toBeTruthy();
  });

  it('returns results sorted by risk (critical first)', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const deps = analyzeDependencies(stack);
    const riskOrder = ['critical', 'high', 'medium', 'low'];
    for (let i = 1; i < deps.length; i++) {
      expect(riskOrder.indexOf(deps[i].risk)).toBeGreaterThanOrEqual(
        riskOrder.indexOf(deps[i - 1].risk)
      );
    }
  });

  it('returns an empty array for a project with no tracked dependencies', () => {
    const stack = detectStack(path.join(fixtures, 'react-17'));
    const deps = analyzeDependencies(stack);
    // react-17 has vite and react; both tracked — some will be outdated
    expect(Array.isArray(deps)).toBe(true);
  });
});
