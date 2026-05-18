import { describe, it, expect } from 'vitest';
import {
  classifyBuildFailure,
  buildDiagnosticSummary,
} from '../packages/core/src/diagnostics/failure-classifier.js';
import type { BuildValidationResult } from '@stack-lift/shared';

function failedResult(
  error: string,
  step: BuildValidationResult['step'] = 'build',
): BuildValidationResult {
  return { step, status: 'failed', error };
}

describe('classifyBuildFailure', () => {
  it('returns empty array for successful steps', () => {
    const result: BuildValidationResult = { step: 'build', status: 'success' };
    expect(classifyBuildFailure(result)).toEqual([]);
  });

  it('returns empty array for skipped steps', () => {
    const result: BuildValidationResult = { step: 'lint', status: 'skipped' };
    expect(classifyBuildFailure(result)).toEqual([]);
  });

  it('classifies ERESOLVE as peer-dependency-conflict', () => {
    const r = failedResult('npm ERR! code ERESOLVE\nnpm ERR! Could not resolve');
    const d = classifyBuildFailure(r);
    expect(d).toHaveLength(1);
    expect(d[0]!.category).toBe('peer-dependency-conflict');
    expect(d[0]!.confidence).toBe('high');
    expect(d[0]!.remediations.length).toBeGreaterThan(0);
  });

  it('classifies unmet peer as peer-dependency-conflict', () => {
    const r = failedResult('error: unmet peer dependency @angular/core@14');
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('peer-dependency-conflict');
  });

  it('classifies NG compiler error as angular-compiler-incompatibility', () => {
    const r = failedResult('Error: NG0301: Export of name RouterModule not found!');
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('angular-compiler-incompatibility');
  });

  it('classifies ngtsc error as angular-compiler-incompatibility', () => {
    const r = failedResult('ngtsc error TS-992012: template compilation failed');
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('angular-compiler-incompatibility');
  });

  it('classifies builder not found as builder-config-mismatch', () => {
    const r = failedResult('Error: builder not found for target build:browser');
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('builder-config-mismatch');
  });

  it('classifies karma error as test-runner-breakage', () => {
    const r = failedResult('karma error: cannot find karma-chrome-launcher', 'test');
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('test-runner-breakage');
  });

  it('classifies TypeScript error as typescript-error', () => {
    const r = failedResult("error TS2345: Argument of type 'string' is not assignable");
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('typescript-error');
  });

  it('classifies MODULE_NOT_FOUND as module-not-found', () => {
    const r = failedResult("Error: Cannot find module '@angular/core'");
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('module-not-found');
  });

  it('classifies timed out error as timeout', () => {
    const r = failedResult('Timed out after 300s. ETIMEDOUT');
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('timeout');
  });

  it('classifies unknown error gracefully', () => {
    const r = failedResult('some totally unrecognised error message qqq');
    const d = classifyBuildFailure(r);
    expect(d[0]!.category).toBe('unknown');
    expect(d[0]!.confidence).toBe('low');
  });

  it('each diagnostic has at least one remediation', () => {
    const errors = [
      'ERESOLVE could not resolve',
      'NG0301 template error',
      'error TS2305: Module has no exported member',
      'Cannot find module @angular/cdk',
    ];
    for (const err of errors) {
      const d = classifyBuildFailure(failedResult(err));
      expect(d[0]!.remediations.length).toBeGreaterThan(0);
    }
  });
});

describe('buildDiagnosticSummary', () => {
  it('returns zero failures for all-success results', () => {
    const results: BuildValidationResult[] = [
      { step: 'install', status: 'success' },
      { step: 'build', status: 'success' },
    ];
    const summary = buildDiagnosticSummary(results);
    expect(summary.totalFailures).toBe(0);
    expect(summary.diagnostics).toHaveLength(0);
    expect(summary.categories).toHaveLength(0);
  });

  it('aggregates diagnostics from multiple failed steps', () => {
    const results: BuildValidationResult[] = [
      {
        step: 'install',
        status: 'failed',
        error: 'ERESOLVE peer dep conflict',
        diagnostics: [
          {
            category: 'peer-dependency-conflict',
            summary: 'test',
            remediations: [],
            confidence: 'high',
          },
        ],
      },
      {
        step: 'build',
        status: 'failed',
        error: 'error TS2345 type mismatch',
        diagnostics: [
          {
            category: 'typescript-error',
            summary: 'test',
            remediations: [],
            confidence: 'high',
          },
        ],
      },
    ];
    const summary = buildDiagnosticSummary(results);
    expect(summary.totalFailures).toBe(2);
    expect(summary.diagnostics).toHaveLength(2);
    expect(summary.categories).toContain('peer-dependency-conflict');
    expect(summary.categories).toContain('typescript-error');
  });

  it('deduplicates categories', () => {
    const results: BuildValidationResult[] = [
      {
        step: 'build',
        status: 'failed',
        error: 'ERESOLVE',
        diagnostics: [
          {
            category: 'peer-dependency-conflict',
            summary: 'a',
            remediations: [],
            confidence: 'high',
          },
        ],
      },
      {
        step: 'test',
        status: 'failed',
        error: 'ERESOLVE',
        diagnostics: [
          {
            category: 'peer-dependency-conflict',
            summary: 'b',
            remediations: [],
            confidence: 'high',
          },
        ],
      },
    ];
    const summary = buildDiagnosticSummary(results);
    expect(summary.categories).toHaveLength(1);
  });
});
