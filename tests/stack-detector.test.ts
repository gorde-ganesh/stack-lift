import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack } from '../src/engines/stack-detector.js';

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
