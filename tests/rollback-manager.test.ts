import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { RollbackManager } from '../src/engines/rollback-manager.js';

vi.mock('node:child_process', () => ({ execSync: vi.fn() }));

const mockedExec = vi.mocked(execSync);

beforeEach(() => {
  mockedExec.mockReset();
});

describe('RollbackManager — no backup registered', () => {
  it('rollback returns success with "none" strategy when setBackup was never called', () => {
    const mgr = new RollbackManager('/some/path');
    const result = mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('none');
    expect(mockedExec).not.toHaveBeenCalled();
  });
});

describe('RollbackManager — committed (migration succeeded)', () => {
  it('rollback is a no-op after commit()', () => {
    const mgr = new RollbackManager('/some/path');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'main');
    mgr.commit();
    const result = mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/committed/);
    expect(mockedExec).not.toHaveBeenCalled();
  });
});

describe('RollbackManager — dry-run', () => {
  it('rollback skips git commands when dryRun=true', () => {
    const mgr = new RollbackManager('/some/path');
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = mgr.rollback(true);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/\[dry-run\]/);
    expect(mockedExec).not.toHaveBeenCalled();
  });
});

describe('RollbackManager — branch strategy', () => {
  it('checks out original branch and deletes upgrade branch', () => {
    mockedExec.mockReturnValue(Buffer.from(''));
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'main');
    const result = mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('branch');
    expect(mockedExec).toHaveBeenCalledWith(
      'git checkout main',
      expect.objectContaining({ cwd: '/repo' }),
    );
    expect(mockedExec).toHaveBeenCalledWith(
      'git branch -D upgrade/stack-lift',
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('falls back to "main" when originalBranch is not set', () => {
    mockedExec.mockReturnValue(Buffer.from(''));
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch');
    mgr.rollback();
    expect(mockedExec).toHaveBeenCalledWith('git checkout main', expect.anything());
  });

  it('returns failure with recovery instructions when git checkout throws', () => {
    mockedExec.mockImplementation(() => {
      throw new Error('git error');
    });
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'develop');
    const result = mgr.rollback();
    expect(result.success).toBe(false);
    expect(result.strategy).toBe('branch');
    expect(result.recoveryInstructions).toMatch(/git checkout develop/);
    expect(result.recoveryInstructions).toMatch(/git branch -D upgrade\/stack-lift/);
  });
});

describe('RollbackManager — tag strategy', () => {
  it('checks out the backup tag to restore files', () => {
    mockedExec.mockReturnValue(Buffer.from(''));
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('tag');
    expect(mockedExec).toHaveBeenCalledWith(
      'git checkout pre-upgrade-backup',
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('returns failure with recovery instructions when checkout fails', () => {
    mockedExec.mockImplementation(() => {
      throw new Error('detached HEAD');
    });
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = mgr.rollback();
    expect(result.success).toBe(false);
    expect(result.recoveryInstructions).toBe('git checkout pre-upgrade-backup');
  });
});

describe('RollbackManager — setBackup resets committed state', () => {
  it('calling setBackup after commit re-enables rollback', () => {
    mockedExec.mockReturnValue(Buffer.from(''));
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'main');
    mgr.commit();
    // Reset with a new backup — committed flag should clear
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('tag');
    expect(mockedExec).toHaveBeenCalled();
  });
});
