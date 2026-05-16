import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RollbackManager } from '../src/engines/rollback-manager.js';

vi.mock('../src/engines/command-runner.js', () => ({
  runCommand: vi.fn(),
}));

const { runCommand } = await import('../src/engines/command-runner.js');
const mockedRun = vi.mocked(runCommand);

const success = { exitCode: 0, stdout: '', stderr: '', durationMs: 0, timedOut: false };
const failure = (stderr = 'git error') => ({
  exitCode: 1,
  stdout: '',
  stderr,
  durationMs: 0,
  timedOut: false,
});

beforeEach(() => {
  mockedRun.mockReset();
});

describe('RollbackManager — no backup registered', () => {
  it('rollback returns success with "none" strategy when setBackup was never called', async () => {
    const mgr = new RollbackManager('/some/path');
    const result = await mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('none');
    expect(mockedRun).not.toHaveBeenCalled();
  });
});

describe('RollbackManager — committed (migration succeeded)', () => {
  it('rollback is a no-op after commit()', async () => {
    const mgr = new RollbackManager('/some/path');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'main');
    mgr.commit();
    const result = await mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/committed/);
    expect(mockedRun).not.toHaveBeenCalled();
  });
});

describe('RollbackManager — dry-run', () => {
  it('rollback skips git commands when dryRun=true', async () => {
    const mgr = new RollbackManager('/some/path');
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = await mgr.rollback(true);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/\[dry-run\]/);
    expect(mockedRun).not.toHaveBeenCalled();
  });
});

describe('RollbackManager — no git repo', () => {
  it('returns failure when git is not available', async () => {
    mockedRun.mockResolvedValue(failure('not a git repository'));
    const mgr = new RollbackManager('/not-a-repo');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'main');
    const result = await mgr.rollback();
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Not a git repository/);
    expect(result.recoveryInstructions).toBeDefined();
  });
});

describe('RollbackManager — branch strategy', () => {
  it('resets working tree, checks out original branch, and deletes upgrade branch', async () => {
    mockedRun.mockResolvedValue(success);
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'main');
    const result = await mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('branch');
    const calls = mockedRun.mock.calls.map(([cmd]) => cmd);
    expect(calls).toContain('git rev-parse --git-dir');
    expect(calls).toContain('git reset --hard HEAD');
    expect(calls).toContain('git clean -fd');
    expect(calls).toContain('git checkout main');
    expect(calls).toContain('git branch -D upgrade/stack-lift');
  });

  it('falls back to "main" when originalBranch is not set', async () => {
    mockedRun.mockResolvedValue(success);
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch');
    await mgr.rollback();
    const calls = mockedRun.mock.calls.map(([cmd]) => cmd);
    expect(calls).toContain('git checkout main');
  });

  it('returns failure with recovery instructions when git checkout fails', async () => {
    mockedRun
      .mockResolvedValueOnce(success) // git rev-parse --git-dir
      .mockResolvedValueOnce(success) // git reset --hard HEAD
      .mockResolvedValueOnce(success) // git clean -fd
      .mockResolvedValueOnce(failure('branch conflict')); // git checkout develop fails
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'develop');
    const result = await mgr.rollback();
    expect(result.success).toBe(false);
    expect(result.strategy).toBe('branch');
    expect(result.recoveryInstructions).toMatch(/git checkout develop/);
    expect(result.recoveryInstructions).toMatch(/git branch -D upgrade\/stack-lift/);
  });
});

describe('RollbackManager — tag strategy', () => {
  it('hard-resets to the backup tag to restore files', async () => {
    mockedRun.mockResolvedValue(success);
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = await mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('tag');
    const calls = mockedRun.mock.calls.map(([cmd]) => cmd);
    expect(calls).toContain('git reset --hard pre-upgrade-backup');
  });

  it('returns failure with recovery instructions when reset fails', async () => {
    mockedRun
      .mockResolvedValueOnce(success) // git rev-parse --git-dir
      .mockResolvedValueOnce(failure('could not reset'));
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = await mgr.rollback();
    expect(result.success).toBe(false);
    expect(result.recoveryInstructions).toBe('git reset --hard pre-upgrade-backup');
  });
});

describe('RollbackManager — setBackup resets committed state', () => {
  it('calling setBackup after commit re-enables rollback', async () => {
    mockedRun.mockResolvedValue(success);
    const mgr = new RollbackManager('/repo');
    mgr.setBackup('upgrade/stack-lift', 'branch', 'main');
    mgr.commit();
    // Reset with a new backup — committed flag should clear
    mgr.setBackup('pre-upgrade-backup', 'tag');
    const result = await mgr.rollback();
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('tag');
    expect(mockedRun).toHaveBeenCalled();
  });
});
