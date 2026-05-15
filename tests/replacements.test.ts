import { describe, it, expect } from 'vitest';
import {
  getReplacementEntry,
  getKnownDeprecatedPackages,
  PACKAGE_REPLACEMENTS,
} from '../src/knowledge/replacements.js';

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
    const names = entry!.alternatives.map(a => a.name);
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
    const lowEffort = entry!.alternatives.find(a => a.migrationEffort === 'low');
    expect(lowEffort).toBeDefined();
  });
});
