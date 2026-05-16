import { runCommand } from './command-runner.js';

export type RollbackStrategy = 'branch' | 'tag' | 'none';

export interface RollbackResult {
  success: boolean;
  strategy: RollbackStrategy;
  message: string;
  /** Present when rollback itself failed — manual steps to recover the project. */
  recoveryInstructions?: string;
}

interface BackupState {
  strategy: 'branch' | 'tag';
  /** upgrade branch name (branch strategy) or tag name (tag strategy). */
  backupRef: string;
  /** Branch that was active before the upgrade branch was created (branch strategy only). */
  originalBranch?: string;
}

/**
 * Tracks a branch/tag-based git backup and can restore the project to its
 * pre-migration state on failure, or commit (mark as done) on success.
 *
 * Branch strategy  — rollback resets the working tree, checks out the original
 *                    branch, and deletes the upgrade branch.
 * Tag strategy     — rollback hard-resets to the backup tag commit.
 *
 * No git commands run when:
 *  - no backup has been registered (setBackup was never called)
 *  - commit() was called (migration succeeded)
 *  - dryRun=true is passed to rollback()
 *  - git is not available in the project directory
 */
export class RollbackManager {
  private readonly projectPath: string;
  private state: BackupState | null = null;
  private committed = false;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /** Record the backup reference created before migration started. */
  setBackup(backupRef: string, strategy: 'branch' | 'tag', originalBranch?: string): void {
    this.state = {
      strategy,
      backupRef,
      ...(originalBranch !== undefined ? { originalBranch } : {}),
    };
    this.committed = false;
  }

  /** Mark migration as successful — rollback becomes a no-op. */
  commit(): void {
    this.committed = true;
  }

  /** Restore the project to its pre-migration state. */
  async rollback(dryRun = false): Promise<RollbackResult> {
    if (!this.state) {
      return {
        success: true,
        strategy: 'none',
        message: 'No backup registered; nothing to roll back.',
      };
    }
    if (this.committed) {
      return {
        success: true,
        strategy: this.state.strategy,
        message: 'Migration committed — rollback skipped.',
      };
    }
    if (dryRun) {
      return {
        success: true,
        strategy: this.state.strategy,
        message: '[dry-run] Rollback skipped.',
      };
    }

    // Verify git is available before attempting any git operations.
    const gitCheck = await runCommand('git rev-parse --git-dir', { cwd: this.projectPath });
    if (gitCheck.exitCode !== 0) {
      return {
        success: false,
        strategy: this.state.strategy,
        message: 'Not a git repository; cannot roll back automatically.',
        recoveryInstructions: 'Restore your files manually from a backup.',
      };
    }

    const { strategy, backupRef, originalBranch } = this.state;
    try {
      if (strategy === 'branch') {
        const target = originalBranch ?? 'main';

        // Clean the working tree before checkout to avoid "dirty tree" conflicts.
        await runCommand('git reset --hard HEAD', { cwd: this.projectPath });
        await runCommand('git clean -fd', { cwd: this.projectPath });

        const checkoutResult = await runCommand(`git checkout ${target}`, {
          cwd: this.projectPath,
        });
        if (checkoutResult.exitCode !== 0) {
          return {
            success: false,
            strategy: 'branch',
            message: `Rollback: checkout '${target}' failed: ${checkoutResult.stderr.trim()}`,
            recoveryInstructions: `git checkout ${target} && git branch -D ${backupRef}`,
          };
        }

        await runCommand(`git branch -D ${backupRef}`, { cwd: this.projectPath });
        return {
          success: true,
          strategy: 'branch',
          message: `Rolled back: checked out '${target}' and deleted '${backupRef}'.`,
        };
      } else {
        // Tag strategy: hard-reset to the tagged commit (avoids detached HEAD).
        const resetResult = await runCommand(`git reset --hard ${backupRef}`, {
          cwd: this.projectPath,
        });
        if (resetResult.exitCode !== 0) {
          return {
            success: false,
            strategy: 'tag',
            message: `Rollback: reset to tag '${backupRef}' failed: ${resetResult.stderr.trim()}`,
            recoveryInstructions: `git reset --hard ${backupRef}`,
          };
        }
        return {
          success: true,
          strategy: 'tag',
          message: `Rolled back: reset to tag '${backupRef}'.`,
        };
      }
    } catch (err) {
      const recoveryInstructions =
        strategy === 'branch'
          ? `git checkout ${originalBranch ?? 'main'} && git branch -D ${backupRef}`
          : `git reset --hard ${backupRef}`;
      return {
        success: false,
        strategy,
        message: `Rollback failed: ${String(err)}`,
        recoveryInstructions,
      };
    }
  }
}
