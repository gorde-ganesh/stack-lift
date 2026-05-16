import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export interface CommandOptions {
  cwd: string;
  /** Max milliseconds before the process is killed. Defaults to 5 minutes. */
  timeoutMs?: number;
  /** When true, skip execution and return a synthetic success result. */
  dryRun?: boolean;
  /** Called with each stdout chunk as it arrives. */
  onStdout?: (chunk: string) => void;
  /** Called with each stderr chunk as it arrives. */
  onStderr?: (chunk: string) => void;
  /** Extra environment variables merged over process.env. */
  env?: Record<string, string>;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface BackupRef {
  /** 'stash' when local changes were stashed; 'clean' when the tree was already clean. */
  type: 'stash' | 'clean';
  /** The commit hash at backup time — used for clean-tree rollback. */
  headRef: string;
}

export interface CommandExecution {
  cmd: string;
  result: CommandResult;
}

export interface ExecuteCommandsOptions {
  projectPath: string;
  commands: string[];
  dryRun?: boolean;
  timeoutMs?: number;
  /** Called for each stdout/stderr chunk from each command. */
  onOutput?: (cmd: string, stream: 'stdout' | 'stderr', chunk: string) => void;
  /** Skip the automatic git stash backup — use when the caller already manages rollback. */
  skipBackup?: boolean;
}

export interface ExecuteCommandsResult {
  executions: CommandExecution[];
  status: 'success' | 'failed' | 'rolled-back';
  backupRef?: BackupRef;
  /** Set when rollback itself threw — the project may need manual recovery. */
  rollbackError?: string;
}

// ── Core primitive ────────────────────────────────────────────────────────────

export function runCommand(cmd: string, options: CommandOptions): Promise<CommandResult> {
  const { cwd, timeoutMs = DEFAULT_TIMEOUT_MS, dryRun = false, onStdout, onStderr, env } = options;

  if (dryRun) {
    const msg = `[dry-run] ${cmd}`;
    onStdout?.(msg + '\n');
    return Promise.resolve({
      exitCode: 0,
      stdout: msg,
      stderr: '',
      durationMs: 0,
      timedOut: false,
    });
  }

  return new Promise((resolve) => {
    const start = Date.now();
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const child = spawn(cmd, {
      cwd,
      shell: true,
      env: { ...process.env, ...env },
    });

    child.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdoutChunks.push(chunk);
      onStdout?.(chunk);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderrChunks.push(chunk);
      onStderr?.(chunk);
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      // On Windows, shell: true wraps the command in cmd.exe, so child.kill() only kills
      // the shell — the inner process keeps running and the close event never fires.
      // taskkill /T /F kills the entire process tree instead.
      if (process.platform === 'win32' && child.pid !== undefined) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: false });
      } else {
        child.kill();
      }
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: stdoutChunks.join(''),
        stderr: stderrChunks.join(''),
        durationMs: Date.now() - start,
        timedOut,
      });
    });
  });
}

// ── Git backup / restore ──────────────────────────────────────────────────────

export async function createGitBackup(projectPath: string): Promise<BackupRef> {
  const headResult = await runCommand('git rev-parse HEAD', { cwd: projectPath });
  const headRef = headResult.stdout.trim();

  const ts = Date.now();
  const stashResult = await runCommand(
    `git stash push --include-untracked -m "stacklift-backup-${ts}"`,
    { cwd: projectPath },
  );

  // git stash outputs "No local changes to save" when the tree is clean
  const stashed = !stashResult.stdout.trim().startsWith('No local changes');
  return { type: stashed ? 'stash' : 'clean', headRef };
}

export async function restoreGitBackup(projectPath: string, ref: BackupRef): Promise<void> {
  if (ref.type === 'stash') {
    await runCommand('git stash pop', { cwd: projectPath });
  } else {
    await runCommand(`git reset --hard ${ref.headRef}`, { cwd: projectPath });
  }
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function executeCommands(
  options: ExecuteCommandsOptions,
): Promise<ExecuteCommandsResult> {
  const {
    projectPath,
    commands,
    dryRun = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onOutput,
    skipBackup = false,
  } = options;

  const executions: CommandExecution[] = [];

  // Snapshot the repo state before any mutations so we can roll back cleanly.
  const backupRef = dryRun || skipBackup ? undefined : await createGitBackup(projectPath);

  for (const cmd of commands) {
    const result = await runCommand(cmd, {
      cwd: projectPath,
      timeoutMs,
      dryRun,
      onStdout: (chunk) => onOutput?.(cmd, 'stdout', chunk),
      onStderr: (chunk) => onOutput?.(cmd, 'stderr', chunk),
    });

    executions.push({ cmd, result });

    if (result.exitCode !== 0 || result.timedOut) {
      if (!backupRef) {
        return { executions, status: 'failed' };
      }
      try {
        await restoreGitBackup(projectPath, backupRef);
        return { executions, status: 'rolled-back', backupRef };
      } catch (err) {
        return {
          executions,
          status: 'rolled-back',
          backupRef,
          rollbackError: String(err),
        };
      }
    }
  }

  return { executions, status: 'success', ...(backupRef !== undefined ? { backupRef } : {}) };
}
