import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UpgradePlan, ConfigMigrationResult } from '@stack-lift/shared';
import { assertSafePath } from '../path-guard.js';

// ── Internal migration interface ─────────────────────────────────────────────

interface ConfigMigration {
  id: string;
  fromVersion: string;
  toVersion: string;
  targetFile: string;
  description: string;
  check(projectPath: string): boolean;
  apply(projectPath: string, dryRun: boolean): ConfigMigrationResult;
}

// ── JSON helpers ─────────────────────────────────────────────────────────────

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJson(filePath: string, data: unknown): void {
  assertSafePath(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function buildDiff(before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const out: string[] = [];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) continue;
    if (b !== undefined) out.push(`- ${b}`);
    if (a !== undefined) out.push(`+ ${a}`);
  }
  return out.join('\n');
}

// ── Migration: 12→13 tsconfig useDefineForClassFields ───────────────────────

const migration_12_13_useDefineForClassFields: ConfigMigration = {
  id: 'angular-12-13-useDefineForClassFields',
  fromVersion: '12',
  toVersion: '13',
  targetFile: 'tsconfig.json',
  description:
    'Set useDefineForClassFields: false in compilerOptions (required for Angular decorator metadata)',

  check(projectPath: string): boolean {
    const tsconfig = readJson(path.join(projectPath, 'tsconfig.json'));
    if (tsconfig === null || typeof tsconfig !== 'object') return false;
    const opts = (tsconfig as Record<string, unknown>)['compilerOptions'];
    if (!opts || typeof opts !== 'object') return true;
    return (opts as Record<string, unknown>)['useDefineForClassFields'] !== false;
  },

  apply(projectPath: string, dryRun: boolean): ConfigMigrationResult {
    const filePath = path.join(projectPath, 'tsconfig.json');
    const tsconfig = readJson(filePath);
    const needed = this.check(projectPath);
    const base: Omit<ConfigMigrationResult, 'applied' | 'before' | 'after' | 'diff'> = {
      id: this.id,
      file: 'tsconfig.json',
      description: this.description,
      fromVersion: this.fromVersion,
      toVersion: this.toVersion,
      needed,
      dryRun,
    };

    if (!needed || tsconfig === null || typeof tsconfig !== 'object') {
      return { ...base, applied: false };
    }

    const before = JSON.stringify(tsconfig, null, 2) + '\n';
    const updated = tsconfig as Record<string, unknown>;
    if (!updated['compilerOptions'] || typeof updated['compilerOptions'] !== 'object') {
      updated['compilerOptions'] = {};
    }
    (updated['compilerOptions'] as Record<string, unknown>)['useDefineForClassFields'] = false;

    const after = JSON.stringify(updated, null, 2) + '\n';

    if (!dryRun) writeJson(filePath, updated);

    return { ...base, applied: true, before, after, diff: buildDiff(before, after) };
  },
};

// ── Migration: 15→16 angular.json browserTarget → buildTarget ───────────────

function renameBrowserTarget(obj: unknown): { changed: boolean; result: unknown } {
  if (Array.isArray(obj)) {
    let changed = false;
    const result = obj.map((item) => {
      const r = renameBrowserTarget(item);
      if (r.changed) changed = true;
      return r.result;
    });
    return { changed, result };
  }
  if (obj !== null && typeof obj === 'object') {
    let changed = false;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = key === 'browserTarget' ? 'buildTarget' : key;
      if (newKey !== key) changed = true;
      const r = renameBrowserTarget(value);
      if (r.changed) changed = true;
      result[newKey] = r.result;
    }
    return { changed, result };
  }
  return { changed: false, result: obj };
}

const migration_15_16_browserTarget: ConfigMigration = {
  id: 'angular-15-16-browserTarget',
  fromVersion: '15',
  toVersion: '16',
  targetFile: 'angular.json',
  description: 'Rename browserTarget → buildTarget in angular.json (Angular 16 builder API change)',

  check(projectPath: string): boolean {
    const angularJson = readJson(path.join(projectPath, 'angular.json'));
    if (angularJson === null) return false;
    return JSON.stringify(angularJson).includes('"browserTarget"');
  },

  apply(projectPath: string, dryRun: boolean): ConfigMigrationResult {
    const filePath = path.join(projectPath, 'angular.json');
    const angularJson = readJson(filePath);
    const needed = this.check(projectPath);
    const base: Omit<ConfigMigrationResult, 'applied' | 'before' | 'after' | 'diff'> = {
      id: this.id,
      file: 'angular.json',
      description: this.description,
      fromVersion: this.fromVersion,
      toVersion: this.toVersion,
      needed,
      dryRun,
    };

    if (!needed || angularJson === null) return { ...base, applied: false };

    const before = JSON.stringify(angularJson, null, 2) + '\n';
    const { result: updated } = renameBrowserTarget(angularJson);
    const after = JSON.stringify(updated, null, 2) + '\n';

    if (!dryRun) writeJson(filePath, updated);

    return { ...base, applied: true, before, after, diff: buildDiff(before, after) };
  },
};

// ── Migration: 16→17 angular.json standalone default ────────────────────────

const migration_16_17_standalone: ConfigMigration = {
  id: 'angular-16-17-standalone-default',
  fromVersion: '16',
  toVersion: '17',
  targetFile: 'angular.json',
  description: 'Set standalone: true in schematics defaults for @schematics/angular:component',

  check(projectPath: string): boolean {
    const angularJson = readJson(path.join(projectPath, 'angular.json'));
    if (angularJson === null || typeof angularJson !== 'object') return false;
    const root = angularJson as Record<string, unknown>;
    const schematics = root['schematics'];
    if (!schematics || typeof schematics !== 'object') return true;
    const componentDefaults = (schematics as Record<string, unknown>)[
      '@schematics/angular:component'
    ];
    if (!componentDefaults || typeof componentDefaults !== 'object') return true;
    return (componentDefaults as Record<string, unknown>)['standalone'] !== true;
  },

  apply(projectPath: string, dryRun: boolean): ConfigMigrationResult {
    const filePath = path.join(projectPath, 'angular.json');
    const angularJson = readJson(filePath);
    const needed = this.check(projectPath);
    const base: Omit<ConfigMigrationResult, 'applied' | 'before' | 'after' | 'diff'> = {
      id: this.id,
      file: 'angular.json',
      description: this.description,
      fromVersion: this.fromVersion,
      toVersion: this.toVersion,
      needed,
      dryRun,
    };

    if (!needed || angularJson === null || typeof angularJson !== 'object') {
      return { ...base, applied: false };
    }

    const before = JSON.stringify(angularJson, null, 2) + '\n';
    const updated = angularJson as Record<string, unknown>;
    if (!updated['schematics'] || typeof updated['schematics'] !== 'object') {
      updated['schematics'] = {};
    }
    const schematics = updated['schematics'] as Record<string, unknown>;
    if (
      !schematics['@schematics/angular:component'] ||
      typeof schematics['@schematics/angular:component'] !== 'object'
    ) {
      schematics['@schematics/angular:component'] = {};
    }
    (schematics['@schematics/angular:component'] as Record<string, unknown>)['standalone'] = true;

    const after = JSON.stringify(updated, null, 2) + '\n';

    if (!dryRun) writeJson(filePath, updated);

    return { ...base, applied: true, before, after, diff: buildDiff(before, after) };
  },
};

// ── Migration: 17→18 tsconfig target ES2022 ─────────────────────────────────

const migration_17_18_es2022: ConfigMigration = {
  id: 'angular-17-18-es2022-target',
  fromVersion: '17',
  toVersion: '18',
  targetFile: 'tsconfig.json',
  description: 'Update compilerOptions.target to ES2022 (Angular 18 baseline requirement)',

  check(projectPath: string): boolean {
    const tsconfig = readJson(path.join(projectPath, 'tsconfig.json'));
    if (tsconfig === null || typeof tsconfig !== 'object') return false;
    const opts = (tsconfig as Record<string, unknown>)['compilerOptions'];
    if (!opts || typeof opts !== 'object') return true;
    const target = (opts as Record<string, unknown>)['target'];
    return typeof target !== 'string' || target.toLowerCase() !== 'es2022';
  },

  apply(projectPath: string, dryRun: boolean): ConfigMigrationResult {
    const filePath = path.join(projectPath, 'tsconfig.json');
    const tsconfig = readJson(filePath);
    const needed = this.check(projectPath);
    const base: Omit<ConfigMigrationResult, 'applied' | 'before' | 'after' | 'diff'> = {
      id: this.id,
      file: 'tsconfig.json',
      description: this.description,
      fromVersion: this.fromVersion,
      toVersion: this.toVersion,
      needed,
      dryRun,
    };

    if (!needed || tsconfig === null || typeof tsconfig !== 'object') {
      return { ...base, applied: false };
    }

    const before = JSON.stringify(tsconfig, null, 2) + '\n';
    const updated = tsconfig as Record<string, unknown>;
    if (!updated['compilerOptions'] || typeof updated['compilerOptions'] !== 'object') {
      updated['compilerOptions'] = {};
    }
    (updated['compilerOptions'] as Record<string, unknown>)['target'] = 'ES2022';
    const after = JSON.stringify(updated, null, 2) + '\n';

    if (!dryRun) writeJson(filePath, updated);

    return { ...base, applied: true, before, after, diff: buildDiff(before, after) };
  },
};

// ── Migration: 18→19 angular.json builder rename ────────────────────────────

const OLD_BUILDER = '@angular-devkit/build-angular:browser';
const NEW_BUILDER = '@angular/build:application';

function replaceBuilder(obj: unknown): { changed: boolean; result: unknown } {
  if (Array.isArray(obj)) {
    let changed = false;
    const result = obj.map((item) => {
      const r = replaceBuilder(item);
      if (r.changed) changed = true;
      return r.result;
    });
    return { changed, result };
  }
  if (obj !== null && typeof obj === 'object') {
    let changed = false;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === 'builder' && value === OLD_BUILDER) {
        result[key] = NEW_BUILDER;
        changed = true;
      } else {
        const r = replaceBuilder(value);
        if (r.changed) changed = true;
        result[key] = r.result;
      }
    }
    return { changed, result };
  }
  return { changed: false, result: obj };
}

const migration_18_19_builder: ConfigMigration = {
  id: 'angular-18-19-application-builder',
  fromVersion: '18',
  toVersion: '19',
  targetFile: 'angular.json',
  description: `Replace builder ${OLD_BUILDER} with ${NEW_BUILDER} in angular.json`,

  check(projectPath: string): boolean {
    const angularJson = readJson(path.join(projectPath, 'angular.json'));
    if (angularJson === null) return false;
    return JSON.stringify(angularJson).includes(JSON.stringify(OLD_BUILDER));
  },

  apply(projectPath: string, dryRun: boolean): ConfigMigrationResult {
    const filePath = path.join(projectPath, 'angular.json');
    const angularJson = readJson(filePath);
    const needed = this.check(projectPath);
    const base: Omit<ConfigMigrationResult, 'applied' | 'before' | 'after' | 'diff'> = {
      id: this.id,
      file: 'angular.json',
      description: this.description,
      fromVersion: this.fromVersion,
      toVersion: this.toVersion,
      needed,
      dryRun,
    };

    if (!needed || angularJson === null) return { ...base, applied: false };

    const before = JSON.stringify(angularJson, null, 2) + '\n';
    const { result: updated } = replaceBuilder(angularJson);
    const after = JSON.stringify(updated, null, 2) + '\n';

    if (!dryRun) writeJson(filePath, updated);

    return { ...base, applied: true, before, after, diff: buildDiff(before, after) };
  },
};

// ── Catalogue ────────────────────────────────────────────────────────────────

const ALL_MIGRATIONS: ConfigMigration[] = [
  migration_12_13_useDefineForClassFields,
  migration_15_16_browserTarget,
  migration_16_17_standalone,
  migration_17_18_es2022,
  migration_18_19_builder,
];

// ── Public API ───────────────────────────────────────────────────────────────

function collectApplicableMigrations(plan: UpgradePlan): ConfigMigration[] {
  const hops = new Set(plan.steps.map((s) => `${s.fromVersion}:${s.toVersion}`));
  return ALL_MIGRATIONS.filter((m) => hops.has(`${m.fromVersion}:${m.toVersion}`));
}

/** Returns results for all config migrations that apply to the upgrade plan, without writing files. */
export function analyzeConfigMigrations(
  projectPath: string,
  plan: UpgradePlan,
): ConfigMigrationResult[] {
  const applicable = collectApplicableMigrations(plan);
  return applicable.map((m) => {
    const needed = m.check(projectPath);
    return {
      id: m.id,
      file: m.targetFile,
      description: m.description,
      fromVersion: m.fromVersion,
      toVersion: m.toVersion,
      needed,
      applied: false,
      dryRun: true,
    };
  });
}

/** Applies all needed config migrations for the upgrade plan. Pass dryRun=true to preview without writing. */
export function applyConfigMigrations(
  projectPath: string,
  plan: UpgradePlan,
  dryRun = false,
): ConfigMigrationResult[] {
  const applicable = collectApplicableMigrations(plan);
  return applicable.map((m) => m.apply(projectPath, dryRun));
}
