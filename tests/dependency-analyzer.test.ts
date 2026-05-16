import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack } from '../src/engines/stack-detector.js';
import { analyzeDependencies } from '../src/engines/dependency-analyzer.js';
import * as registry from '../src/engines/npm-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

// Mock the registry so tests run offline and deterministically
beforeEach(() => {
  vi.spyOn(registry, 'getPackageInfoBatch').mockImplementation(async (names) => {
    const results = new Map<string, registry.RegistryPackageInfo | null>();
    for (const name of names) {
      if (name === 'tslint') {
        results.set(name, {
          name,
          latest: '6.1.3',
          deprecated: 'Deprecated Jan 2020. Migrate to ESLint + @typescript-eslint.',
          hasBreakingChanges: false,
          riskOverride: 'high',
        });
      } else if (name === 'codelyzer') {
        results.set(name, {
          name,
          latest: '6.0.2',
          deprecated: 'Deprecated. Use angular-eslint instead.',
          hasBreakingChanges: false,
          riskOverride: 'high',
        });
      } else if (name === 'rxjs') {
        results.set(name, { name, latest: '7.8.1', hasBreakingChanges: true });
      } else if (name === 'react-scripts') {
        results.set(name, {
          name,
          latest: '5.0.1',
          deprecated: 'Create React App is unmaintained. Migrate to Vite or Next.js.',
          hasBreakingChanges: false,
          riskOverride: 'high',
        });
      } else if (name === '@angular/core') {
        results.set(name, { name, latest: '18.0.0', hasBreakingChanges: true });
      } else if (name === 'react') {
        results.set(name, { name, latest: '19.0.0', hasBreakingChanges: true });
      } else if (name === 'react-dom') {
        results.set(name, { name, latest: '19.0.0', hasBreakingChanges: true });
      } else if (name === 'vite') {
        results.set(name, { name, latest: '5.4.0', hasBreakingChanges: true });
      } else {
        results.set(name, null);
      }
    }
    return results;
  });
});

describe('analyzeDependencies', () => {
  it('flags deprecated tslint in Angular 12 project', async () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const { outdated: deps } = await analyzeDependencies(stack);
    const tslint = deps.find((d) => d.name === 'tslint');
    expect(tslint).toBeDefined();
    expect(tslint!.deprecated).toBe(true);
    expect(tslint!.risk).toBe('high');
  });

  it('flags deprecated codelyzer in Angular 12 project', async () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const { outdated: deps } = await analyzeDependencies(stack);
    const codelyzer = deps.find((d) => d.name === 'codelyzer');
    expect(codelyzer).toBeDefined();
    expect(codelyzer!.deprecated).toBe(true);
  });

  it('flags outdated rxjs in Angular 12 project', async () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const { outdated: deps } = await analyzeDependencies(stack);
    const rxjs = deps.find((d) => d.name === 'rxjs');
    expect(rxjs).toBeDefined();
    expect(rxjs!.current).toBe('6.6.0');
  });

  it('flags deprecated react-scripts in React 16 project', async () => {
    const stack = detectStack(path.join(fixtures, 'react-16'));
    const { outdated: deps } = await analyzeDependencies(stack);
    const rs = deps.find((d) => d.name === 'react-scripts');
    expect(rs).toBeDefined();
    expect(rs!.deprecated).toBe(true);
    expect(rs!.risk).toBe('high');
    expect(rs!.reason).toBeTruthy();
  });

  it('returns results sorted by risk (critical first)', async () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    const { outdated: deps } = await analyzeDependencies(stack);
    const riskOrder = ['critical', 'high', 'medium', 'low'];
    for (let i = 1; i < deps.length; i++) {
      expect(riskOrder.indexOf(deps[i]!.risk)).toBeGreaterThanOrEqual(
        riskOrder.indexOf(deps[i - 1]!.risk),
      );
    }
  });

  it('returns outdated array and peerConflicts for a project with tracked dependencies', async () => {
    const stack = detectStack(path.join(fixtures, 'react-17'));
    const result = await analyzeDependencies(stack);
    expect(Array.isArray(result.outdated)).toBe(true);
    expect(Array.isArray(result.peerConflicts)).toBe(true);
  });
});
