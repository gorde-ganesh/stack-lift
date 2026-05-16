import { execSync } from 'node:child_process';

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
 * Branch strategy  — rollback checks out the original branch and deletes the
 *                    upgrade branch.
 * Tag strategy     — rollback checks out the backup tag to restore the working tree.
 *
 * No git commands run when:
 *  - no backup has been registered (setBackup was never called)
 *  - commit() was called (migration succeeded)
 *  - dryRun=true is passed to rollback()
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
  rollback(dryRun = false): RollbackResult {
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

    const { strategy, backupRef, originalBranch } = this.state;
    try {
      if (strategy === 'branch') {
        const target = originalBranch ?? 'main';
        this.exec(`git checkout ${target}`);
        this.exec(`git branch -D ${backupRef}`);
        return {
          success: true,
          strategy: 'branch',
          message: `Rolled back: checked out '${target}' and deleted '${backupRef}'.`,
        };
      } else {
        this.exec(`git checkout ${backupRef}`);
        return {
          success: true,
          strategy: 'tag',
          message: `Rolled back: restored project state from tag '${backupRef}'.`,
        };
      }
    } catch (err) {
      const recoveryInstructions =
        strategy === 'branch'
          ? `git checkout ${originalBranch ?? 'main'} && git branch -D ${backupRef}`
          : `git checkout ${backupRef}`;
      return {
        success: false,
        strategy,
        message: `Rollback failed: ${String(err)}`,
        recoveryInstructions,
      };
    }
  }

  private exec(cmd: string): void {
    execSync(cmd, { cwd: this.projectPath, stdio: 'pipe' });
  }
}
