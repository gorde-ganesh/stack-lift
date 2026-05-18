import { describe, it, expect } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import { assertSafePath, resolveSafePath } from '../packages/core/src/path-guard.js';

describe('assertSafePath', () => {
  it('allows paths under home directory', () => {
    const safe = path.join(os.homedir(), 'some', 'project');
    expect(() => assertSafePath(safe)).not.toThrow();
  });

  it('allows paths under tmpdir', () => {
    const safe = path.join(os.tmpdir(), 'stack-lift-test');
    expect(() => assertSafePath(safe)).not.toThrow();
  });

  it('allows current working directory', () => {
    expect(() => assertSafePath(process.cwd())).not.toThrow();
  });

  it('allows subdirectory of cwd', () => {
    const sub = path.join(process.cwd(), 'packages', 'core');
    expect(() => assertSafePath(sub)).not.toThrow();
  });

  it('allows home directory itself', () => {
    expect(() => assertSafePath(os.homedir())).not.toThrow();
  });

  it('rejects a path outside allowed roots', () => {
    // /etc or C:\Windows should never be in home/tmp/cwd
    const outside = process.platform === 'win32' ? 'C:\\Windows\\System32' : '/etc/passwd';
    // Only throw if the path is genuinely outside all roots
    const home = os.homedir();
    const tmp = os.tmpdir();
    const cwd = process.cwd();
    const roots = [home, tmp, cwd];
    const isActuallyOutside = roots.every(
      (r) => !path.resolve(outside).startsWith(path.resolve(r)),
    );
    if (isActuallyOutside) {
      expect(() => assertSafePath(outside)).toThrow(/outside of allowed directories/);
    }
  });

  it('rejects path traversal attempts', () => {
    // Craft a path that starts in cwd but traverses out
    const traversal = path.join(process.cwd(), '..', '..', '..', 'etc', 'passwd');
    const resolved = path.resolve(traversal);
    const home = os.homedir();
    const tmp = os.tmpdir();
    const cwd = process.cwd();
    const isOutside = [home, tmp, cwd].every((r) => !resolved.startsWith(path.resolve(r)));
    if (isOutside) {
      expect(() => assertSafePath(traversal)).toThrow(/outside of allowed directories/);
    }
  });

  it('handles relative paths by resolving them first', () => {
    // '.' resolves to cwd which is always safe
    expect(() => assertSafePath('.')).not.toThrow();
  });
});

describe('resolveSafePath', () => {
  it('returns the resolved path when safe', () => {
    const input = path.join(os.homedir(), 'project');
    const result = resolveSafePath(input);
    expect(result).toBe(path.resolve(input));
  });

  it('throws when path is unsafe', () => {
    const outside = process.platform === 'win32' ? 'C:\\Windows\\System32' : '/etc/shadow';
    const home = os.homedir();
    const tmp = os.tmpdir();
    const cwd = process.cwd();
    const isActuallyOutside = [home, tmp, cwd].every(
      (r) => !path.resolve(outside).startsWith(path.resolve(r)),
    );
    if (isActuallyOutside) {
      expect(() => resolveSafePath(outside)).toThrow();
    }
  });
});
