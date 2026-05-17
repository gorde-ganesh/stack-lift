import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { detectStack, analyzeDependencies } from '@stack-lift/core';
import { registerAngularProvider } from '@stack-lift/angular-provider';

registerAngularProvider();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../../../tests/fixtures');

const ANGULAR_FIXTURES = [
  { name: 'angular-12', path: path.join(FIXTURES_DIR, 'angular-12') },
  { name: 'angular-16', path: path.join(FIXTURES_DIR, 'angular-16') },
  { name: 'angular-18', path: path.join(FIXTURES_DIR, 'angular-18') },
  { name: 'angular-material-app', path: path.join(FIXTURES_DIR, 'angular-material-app') },
  { name: 'angular-nx-workspace', path: path.join(FIXTURES_DIR, 'angular-nx-workspace') },
];

describe('audit benchmarks', () => {
  for (const fixture of ANGULAR_FIXTURES) {
    it(`detects stack for ${fixture.name}`, () => {
      const stack = detectStack(fixture.path);
      expect(stack.framework).toBe('Angular');
      expect(stack.frameworkVersion).toBeTruthy();
      expect(stack.packageManager).toBeTruthy();
      expect(stack.buildTool).toBeTruthy();
    });

    it(`stack snapshot matches for ${fixture.name}`, () => {
      const stack = detectStack(fixture.path);
      expect({
        framework: stack.framework,
        frameworkVersion: stack.frameworkVersion,
        buildTool: stack.buildTool,
        packageManager: stack.packageManager,
        isMonorepo: stack.isMonorepo ?? false,
        testRunner: stack.testRunner,
        hasNxWorkspace: stack.workspaceInfo?.isNx ?? false,
        nxProjectCount: stack.workspaceInfo?.projects.length ?? 0,
      }).toMatchSnapshot();
    });
  }

  it('detects Nx workspace with projects in angular-nx-workspace', () => {
    const stack = detectStack(path.join(FIXTURES_DIR, 'angular-nx-workspace'));
    expect(stack.isMonorepo).toBe(true);
    expect(stack.workspaceInfo?.isNx).toBe(true);
    const projects = stack.workspaceInfo?.projects ?? [];
    expect(projects.length).toBeGreaterThanOrEqual(3);
    const apps = projects.filter((p) => p.type === 'app');
    const libs = projects.filter((p) => p.type === 'lib');
    expect(apps.length).toBeGreaterThanOrEqual(2);
    expect(libs.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Angular Material in material app fixture', () => {
    const stack = detectStack(path.join(FIXTURES_DIR, 'angular-material-app'));
    expect(stack.rawDependencies['@angular/material']).toBeTruthy();
    expect(stack.rawDependencies['@angular/cdk']).toBeTruthy();
  });

  it('dependency analysis runs without throwing for angular-12', async () => {
    const stack = detectStack(path.join(FIXTURES_DIR, 'angular-12'));
    const result = await analyzeDependencies(stack);
    expect(result).toHaveProperty('outdated');
    expect(result).toHaveProperty('peerConflicts');
    expect(Array.isArray(result.outdated)).toBe(true);
  }, 30_000);
});
