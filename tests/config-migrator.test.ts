import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  analyzeConfigMigrations,
  applyConfigMigrations,
} from '../packages/core/src/migration/config-migrator.js';
import type { UpgradePlan } from '../packages/shared/src/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePlan(from: string, to: string): UpgradePlan {
  return {
    framework: 'Angular',
    fromVersion: from,
    toVersion: to,
    strategy: 'incremental',
    steps: [
      {
        fromVersion: from,
        toVersion: to,
        description: `Upgrade Angular ${from} to ${to}`,
        breakingChanges: [],
        automatedFixes: 0,
        manualActions: [],
        npmInstall: [],
      },
    ],
    totalBreakingChanges: 0,
    totalAutomatedFixes: 0,
    riskLevel: 'low',
    estimatedEffort: '< 1 day',
    effortBasis: 'test',
  };
}

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sl-cfg-test-'));
}

function writeTsconfig(dir: string, content: object): void {
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(content, null, 2));
}

function writeAngularJson(dir: string, content: object): void {
  fs.writeFileSync(path.join(dir, 'angular.json'), JSON.stringify(content, null, 2));
}

function readJson(dir: string, file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
}

let projectDir: string;

beforeEach(() => {
  projectDir = tmpDir();
});

afterEach(() => {
  fs.rmSync(projectDir, { recursive: true, force: true });
});

// ── analyzeConfigMigrations ───────────────────────────────────────────────────

describe('analyzeConfigMigrations — no files present', () => {
  it('returns needed=false for tsconfig migration when file is absent', () => {
    const plan = makePlan('12', '13');
    const results = analyzeConfigMigrations(projectDir, plan);
    expect(results).toHaveLength(1);
    expect(results[0]!.needed).toBe(false);
    expect(results[0]!.applied).toBe(false);
  });

  it('returns needed=false for angular.json migration when file is absent', () => {
    const plan = makePlan('15', '16');
    const results = analyzeConfigMigrations(projectDir, plan);
    expect(results).toHaveLength(1);
    expect(results[0]!.needed).toBe(false);
  });
});

describe('analyzeConfigMigrations — 12→13 useDefineForClassFields', () => {
  it('needed=true when useDefineForClassFields is missing', () => {
    writeTsconfig(projectDir, { compilerOptions: { strict: true } });
    const results = analyzeConfigMigrations(projectDir, makePlan('12', '13'));
    expect(results[0]!.needed).toBe(true);
    expect(results[0]!.applied).toBe(false);
    expect(results[0]!.id).toBe('angular-12-13-useDefineForClassFields');
  });

  it('needed=false when useDefineForClassFields is already false', () => {
    writeTsconfig(projectDir, { compilerOptions: { useDefineForClassFields: false } });
    const results = analyzeConfigMigrations(projectDir, makePlan('12', '13'));
    expect(results[0]!.needed).toBe(false);
  });

  it('needed=true when useDefineForClassFields is true', () => {
    writeTsconfig(projectDir, { compilerOptions: { useDefineForClassFields: true } });
    const results = analyzeConfigMigrations(projectDir, makePlan('12', '13'));
    expect(results[0]!.needed).toBe(true);
  });
});

describe('analyzeConfigMigrations — 15→16 browserTarget', () => {
  it('needed=true when angular.json has browserTarget', () => {
    writeAngularJson(projectDir, {
      projects: {
        app: { architect: { serve: { options: { browserTarget: 'app:build' } } } },
      },
    });
    const results = analyzeConfigMigrations(projectDir, makePlan('15', '16'));
    expect(results[0]!.needed).toBe(true);
    expect(results[0]!.id).toBe('angular-15-16-browserTarget');
  });

  it('needed=false when angular.json has no browserTarget', () => {
    writeAngularJson(projectDir, {
      projects: { app: { architect: { serve: { options: { buildTarget: 'app:build' } } } } },
    });
    const results = analyzeConfigMigrations(projectDir, makePlan('15', '16'));
    expect(results[0]!.needed).toBe(false);
  });
});

describe('analyzeConfigMigrations — 16→17 standalone', () => {
  it('needed=true when schematics default is missing', () => {
    writeAngularJson(projectDir, { version: 1, schematics: {} });
    const results = analyzeConfigMigrations(projectDir, makePlan('16', '17'));
    expect(results[0]!.needed).toBe(true);
    expect(results[0]!.id).toBe('angular-16-17-standalone-default');
  });

  it('needed=false when standalone default is already true', () => {
    writeAngularJson(projectDir, {
      schematics: { '@schematics/angular:component': { standalone: true } },
    });
    const results = analyzeConfigMigrations(projectDir, makePlan('16', '17'));
    expect(results[0]!.needed).toBe(false);
  });
});

describe('analyzeConfigMigrations — 17→18 ES2022 target', () => {
  it('needed=true when target is ES2020', () => {
    writeTsconfig(projectDir, { compilerOptions: { target: 'ES2020' } });
    const results = analyzeConfigMigrations(projectDir, makePlan('17', '18'));
    expect(results[0]!.needed).toBe(true);
    expect(results[0]!.id).toBe('angular-17-18-es2022-target');
  });

  it('needed=false when target is ES2022', () => {
    writeTsconfig(projectDir, { compilerOptions: { target: 'ES2022' } });
    const results = analyzeConfigMigrations(projectDir, makePlan('17', '18'));
    expect(results[0]!.needed).toBe(false);
  });

  it('needed=false when target is es2022 (case-insensitive)', () => {
    writeTsconfig(projectDir, { compilerOptions: { target: 'es2022' } });
    const results = analyzeConfigMigrations(projectDir, makePlan('17', '18'));
    expect(results[0]!.needed).toBe(false);
  });
});

describe('analyzeConfigMigrations — 18→19 builder rename', () => {
  it('needed=true when old builder is present', () => {
    writeAngularJson(projectDir, {
      projects: {
        app: { architect: { build: { builder: '@angular-devkit/build-angular:browser' } } },
      },
    });
    const results = analyzeConfigMigrations(projectDir, makePlan('18', '19'));
    expect(results[0]!.needed).toBe(true);
    expect(results[0]!.id).toBe('angular-18-19-application-builder');
  });

  it('needed=false when new builder is already in use', () => {
    writeAngularJson(projectDir, {
      projects: { app: { architect: { build: { builder: '@angular/build:application' } } } },
    });
    const results = analyzeConfigMigrations(projectDir, makePlan('18', '19'));
    expect(results[0]!.needed).toBe(false);
  });
});

// ── applyConfigMigrations — dry-run ──────────────────────────────────────────

describe('applyConfigMigrations — dry-run (no file writes)', () => {
  it('12→13: returns diff but does not write file', () => {
    writeTsconfig(projectDir, { compilerOptions: { strict: true } });
    const results = applyConfigMigrations(projectDir, makePlan('12', '13'), true);

    expect(results[0]!.applied).toBe(true);
    expect(results[0]!.dryRun).toBe(true);
    expect(results[0]!.diff).toBeDefined();
    expect(results[0]!.after).toContain('"useDefineForClassFields": false');

    // file must not be modified
    const onDisk = readJson(projectDir, 'tsconfig.json') as Record<string, unknown>;
    const opts = onDisk['compilerOptions'] as Record<string, unknown>;
    expect(opts['useDefineForClassFields']).toBeUndefined();
  });

  it('15→16: returns diff but does not write file', () => {
    writeAngularJson(projectDir, {
      projects: { app: { architect: { serve: { options: { browserTarget: 'app:build' } } } } },
    });
    const results = applyConfigMigrations(projectDir, makePlan('15', '16'), true);
    expect(results[0]!.applied).toBe(true);
    expect(results[0]!.after).toContain('buildTarget');

    const onDisk = JSON.stringify(readJson(projectDir, 'angular.json'));
    expect(onDisk).toContain('browserTarget'); // not written
  });
});

// ── applyConfigMigrations — writes ───────────────────────────────────────────

describe('applyConfigMigrations — apply mode (writes files)', () => {
  it('12→13: writes useDefineForClassFields: false', () => {
    writeTsconfig(projectDir, { compilerOptions: { strict: true } });
    const results = applyConfigMigrations(projectDir, makePlan('12', '13'), false);
    expect(results[0]!.applied).toBe(true);

    const onDisk = readJson(projectDir, 'tsconfig.json') as Record<string, unknown>;
    const opts = onDisk['compilerOptions'] as Record<string, unknown>;
    expect(opts['useDefineForClassFields']).toBe(false);
  });

  it('15→16: renames browserTarget → buildTarget in angular.json', () => {
    writeAngularJson(projectDir, {
      projects: { app: { architect: { serve: { options: { browserTarget: 'app:build' } } } } },
    });
    applyConfigMigrations(projectDir, makePlan('15', '16'), false);

    const onDisk = JSON.stringify(readJson(projectDir, 'angular.json'));
    expect(onDisk).not.toContain('browserTarget');
    expect(onDisk).toContain('buildTarget');
  });

  it('16→17: sets standalone: true in schematics defaults', () => {
    writeAngularJson(projectDir, { schematics: {} });
    applyConfigMigrations(projectDir, makePlan('16', '17'), false);

    const onDisk = readJson(projectDir, 'angular.json') as Record<string, unknown>;
    const schematics = onDisk['schematics'] as Record<string, unknown>;
    const comp = schematics['@schematics/angular:component'] as Record<string, unknown>;
    expect(comp['standalone']).toBe(true);
  });

  it('17→18: sets target to ES2022', () => {
    writeTsconfig(projectDir, { compilerOptions: { target: 'ES2020' } });
    applyConfigMigrations(projectDir, makePlan('17', '18'), false);

    const onDisk = readJson(projectDir, 'tsconfig.json') as Record<string, unknown>;
    const opts = onDisk['compilerOptions'] as Record<string, unknown>;
    expect(opts['target']).toBe('ES2022');
  });

  it('18→19: replaces builder name', () => {
    writeAngularJson(projectDir, {
      projects: {
        app: { architect: { build: { builder: '@angular-devkit/build-angular:browser' } } },
      },
    });
    applyConfigMigrations(projectDir, makePlan('18', '19'), false);

    const onDisk = JSON.stringify(readJson(projectDir, 'angular.json'));
    expect(onDisk).not.toContain('@angular-devkit/build-angular:browser');
    expect(onDisk).toContain('@angular/build:application');
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe('idempotency — safe to apply twice', () => {
  it('12→13: second apply returns needed=false', () => {
    writeTsconfig(projectDir, { compilerOptions: {} });
    applyConfigMigrations(projectDir, makePlan('12', '13'), false);
    const second = applyConfigMigrations(projectDir, makePlan('12', '13'), false);
    expect(second[0]!.needed).toBe(false);
    expect(second[0]!.applied).toBe(false);
  });

  it('17→18: second apply returns needed=false', () => {
    writeTsconfig(projectDir, { compilerOptions: { target: 'ES2020' } });
    applyConfigMigrations(projectDir, makePlan('17', '18'), false);
    const second = applyConfigMigrations(projectDir, makePlan('17', '18'), false);
    expect(second[0]!.needed).toBe(false);
    expect(second[0]!.applied).toBe(false);
  });

  it('18→19: second apply returns needed=false', () => {
    writeAngularJson(projectDir, {
      projects: {
        app: { architect: { build: { builder: '@angular-devkit/build-angular:browser' } } },
      },
    });
    applyConfigMigrations(projectDir, makePlan('18', '19'), false);
    const second = applyConfigMigrations(projectDir, makePlan('18', '19'), false);
    expect(second[0]!.needed).toBe(false);
  });
});

// ── Plan filtering — only matching hops run ───────────────────────────────────

describe('plan hop filtering', () => {
  it('only migrations matching plan hops are returned', () => {
    const plan = makePlan('17', '18');
    const results = analyzeConfigMigrations(projectDir, plan);
    expect(results.every((r) => r.fromVersion === '17' && r.toVersion === '18')).toBe(true);
  });

  it('returns empty array when no migrations match plan', () => {
    const plan = makePlan('14', '15'); // no migrations defined for this hop
    const results = analyzeConfigMigrations(projectDir, plan);
    expect(results).toHaveLength(0);
  });
});
