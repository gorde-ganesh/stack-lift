import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack } from '../packages/core/src/detector/stack-detector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

describe('detectStack', () => {
  it('detects Angular 12 project', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    expect(stack.framework).toBe('Angular');
    expect(stack.frameworkVersion).toBe('12.1.0');
    expect(stack.typescript).toBe('4.2.3');
    expect(stack.rxjs).toBe('6.6.0');
    expect(stack.buildTool).toBe('Angular CLI');
  });

  it('detects Angular 16 project', () => {
    const stack = detectStack(path.join(fixtures, 'angular-16'));
    expect(stack.framework).toBe('Angular');
    expect(stack.frameworkVersion).toBe('16.2.0');
    expect(stack.typescript).toBe('5.1.6');
    expect(stack.buildTool).toBe('Angular CLI');
    expect(stack.isMonorepo).toBeFalsy();
  });

  it('detects Angular 18 project', () => {
    const stack = detectStack(path.join(fixtures, 'angular-18'));
    expect(stack.framework).toBe('Angular');
    expect(stack.frameworkVersion).toBe('18.2.0');
    expect(stack.typescript).toBe('5.5.2');
    expect(stack.buildTool).toBe('Angular CLI');
  });

  it('detects Angular Material project with material and cdk deps', () => {
    const stack = detectStack(path.join(fixtures, 'angular-material-app'));
    expect(stack.framework).toBe('Angular');
    expect(stack.frameworkVersion).toBe('15.2.0');
    expect(stack.rawDependencies['@angular/material']).toBeDefined();
    expect(stack.rawDependencies['@angular/cdk']).toBeDefined();
  });

  it('detects Nx workspace with isMonorepo=true and workspaceInfo', () => {
    const stack = detectStack(path.join(fixtures, 'angular-nx-workspace'));
    expect(stack.framework).toBe('Angular');
    expect(stack.isMonorepo).toBe(true);
    expect(stack.workspaceInfo).toBeDefined();
    expect(stack.workspaceInfo?.isNx).toBe(true);
  });

  it('enumerates Nx workspace projects with correct types', () => {
    const stack = detectStack(path.join(fixtures, 'angular-nx-workspace'));
    const projects = stack.workspaceInfo?.projects ?? [];
    expect(projects.length).toBeGreaterThanOrEqual(3);
    const apps = projects.filter((p) => p.type === 'app');
    const libs = projects.filter((p) => p.type === 'lib');
    expect(apps.length).toBeGreaterThanOrEqual(2);
    expect(libs.length).toBeGreaterThanOrEqual(1);
    const names = projects.map((p) => p.name);
    expect(names).toContain('store');
    expect(names).toContain('admin');
    expect(names).toContain('shared-ui');
  });

  it('Nx projects carry correct path relative to workspace root', () => {
    const stack = detectStack(path.join(fixtures, 'angular-nx-workspace'));
    const store = stack.workspaceInfo?.projects.find((p) => p.name === 'store');
    expect(store?.path).toMatch(/apps[/\\]store/);
  });

  it('detects React 16 project', () => {
    const stack = detectStack(path.join(fixtures, 'react-16'));
    expect(stack.framework).toBe('React');
    expect(stack.frameworkVersion).toBe('16.14.0');
    expect(stack.typescript).toBe('4.0.3');
    expect(stack.buildTool).toBe('Create React App');
  });

  it('detects React 17 project with Vite', () => {
    const stack = detectStack(path.join(fixtures, 'react-17'));
    expect(stack.framework).toBe('React');
    expect(stack.frameworkVersion).toBe('17.0.2');
    expect(stack.buildTool).toBe('Vite');
  });

  it('detects package manager as npm when no lock file present', () => {
    const stack = detectStack(path.join(fixtures, 'react-16'));
    expect(stack.packageManager).toBe('npm');
  });

  it('throws when no package.json is found', () => {
    expect(() => detectStack('/tmp/nonexistent-project-xyz')).toThrow(/No package\.json/);
  });

  it('exposes rawDependencies and rawDevDependencies', () => {
    const stack = detectStack(path.join(fixtures, 'angular-12'));
    expect(stack.rawDependencies['@angular/core']).toBeDefined();
    expect(stack.rawDevDependencies['typescript']).toBeDefined();
  });
});
