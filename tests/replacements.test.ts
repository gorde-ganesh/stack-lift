import { describe, it, expect } from 'vitest';
import {
  getReplacementEntry,
  getKnownDeprecatedPackages,
  getApplicableReplacements,
  PACKAGE_REPLACEMENTS,
} from '../packages/core/src/knowledge/replacements.js';

describe('PACKAGE_REPLACEMENTS knowledge base', () => {
  it('has entries for all known deprecated packages', () => {
    const known = getKnownDeprecatedPackages();
    expect(known.length).toBeGreaterThan(8);
  });

  it('moment entry has at least 3 alternatives', () => {
    const entry = getReplacementEntry('moment');
    expect(entry).toBeDefined();
    expect(entry!.alternatives.length).toBeGreaterThanOrEqual(3);
  });

  it('protractor entry includes playwright as an alternative', () => {
    const entry = getReplacementEntry('protractor');
    expect(entry).toBeDefined();
    const names = entry!.alternatives.map((a) => a.name);
    expect(names).toContain('@playwright/test');
  });

  it('every entry has a skipOption', () => {
    for (const [name, entry] of Object.entries(PACKAGE_REPLACEMENTS)) {
      expect(entry.skipOption, `${name} missing skipOption`).toBeTruthy();
    }
  });

  it('every alternative has required fields', () => {
    for (const [name, entry] of Object.entries(PACKAGE_REPLACEMENTS)) {
      for (const alt of entry.alternatives) {
        expect(alt.name, `${name} alt missing name`).toBeTruthy();
        expect(alt.description, `${name}/${alt.name} missing description`).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(alt.apiSimilarity);
        expect(['high', 'medium', 'low']).toContain(alt.migrationEffort);
      }
    }
  });

  it('returns undefined for unknown package', () => {
    expect(getReplacementEntry('some-totally-unknown-package')).toBeUndefined();
  });

  it('new packages are present: karma, lodash, @angular/flex-layout', () => {
    expect(getReplacementEntry('karma')).toBeDefined();
    expect(getReplacementEntry('lodash')).toBeDefined();
    expect(getReplacementEntry('@angular/flex-layout')).toBeDefined();
  });

  it('@angular-material-components/datetime-picker has low-effort alternative', () => {
    const entry = getReplacementEntry('@angular-material-components/datetime-picker');
    expect(entry).toBeDefined();
    const lowEffort = entry!.alternatives.find((a) => a.migrationEffort === 'low');
    expect(lowEffort).toBeDefined();
  });
});

describe('getApplicableReplacements — provider-aware filtering', () => {
  it('returns universal entries for any framework', () => {
    const result = getApplicableReplacements('Angular', ['moment', 'lodash']);
    expect(result['moment']).toBeDefined();
    expect(result['lodash']).toBeDefined();
  });

  it('returns Angular-only entries for Angular projects', () => {
    const result = getApplicableReplacements('Angular', ['protractor', 'codelyzer', 'karma']);
    expect(result['protractor']).toBeDefined();
    expect(result['codelyzer']).toBeDefined();
    expect(result['karma']).toBeDefined();
  });

  it('filters out Angular-only entries for React projects', () => {
    const result = getApplicableReplacements('React', ['protractor', 'codelyzer', 'karma']);
    expect(result['protractor']).toBeUndefined();
    expect(result['codelyzer']).toBeUndefined();
    expect(result['karma']).toBeUndefined();
  });

  it('returns React-only entries for React projects', () => {
    const result = getApplicableReplacements('React', ['react-scripts', 'react-query']);
    expect(result['react-scripts']).toBeDefined();
    expect(result['react-query']).toBeDefined();
  });

  it('filters out React-only entries for Angular projects', () => {
    const result = getApplicableReplacements('Angular', ['react-scripts', 'react-query']);
    expect(result['react-scripts']).toBeUndefined();
    expect(result['react-query']).toBeUndefined();
  });

  it('returns empty object for unknown packages', () => {
    const result = getApplicableReplacements('Angular', ['totally-unknown-pkg']);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('mixes universal and framework-specific entries correctly', () => {
    const result = getApplicableReplacements('Angular', [
      'moment',       // universal
      'protractor',   // Angular-only
      'react-scripts', // React-only
    ]);
    expect(result['moment']).toBeDefined();
    expect(result['protractor']).toBeDefined();
    expect(result['react-scripts']).toBeUndefined();
  });

  it('all Angular-specific entries have applicableTo containing Angular', () => {
    const angularOnly = ['protractor', 'codelyzer', '@angular/flex-layout', 'karma',
      '@angular-material-components/datetime-picker', 'rxjs-compat', 'zone.js'];
    for (const pkg of angularOnly) {
      const entry = getReplacementEntry(pkg);
      expect(entry?.applicableTo, `${pkg} should have applicableTo`).toBeDefined();
      expect(entry?.applicableTo, `${pkg} should include Angular`).toContain('Angular');
    }
  });

  it('all React-specific entries have applicableTo containing React', () => {
    const reactOnly = ['react-scripts', 'react-router', 'react-router-dom', 'react-query'];
    for (const pkg of reactOnly) {
      const entry = getReplacementEntry(pkg);
      expect(entry?.applicableTo, `${pkg} should have applicableTo`).toBeDefined();
      expect(entry?.applicableTo, `${pkg} should include React`).toContain('React');
    }
  });

  it('universal entries have no applicableTo or empty applicableTo', () => {
    const universal = ['moment', 'lodash', 'node-sass', 'request', 'classnames'];
    for (const pkg of universal) {
      const entry = getReplacementEntry(pkg);
      expect(
        !entry?.applicableTo || entry.applicableTo.length === 0,
        `${pkg} should be universal`,
      ).toBe(true);
    }
  });
});
