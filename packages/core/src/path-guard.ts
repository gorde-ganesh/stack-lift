import * as path from 'node:path';
import * as os from 'node:os';

/** Normalise a root for prefix comparison — always ends with a separator. */
function normRoot(p: string): string {
  const r = path.resolve(p);
  return r.endsWith(path.sep) ? r : r + path.sep;
}

/** Return true when `candidate` is equal to or strictly under `root`. */
function isUnderRoot(candidate: string, root: string): boolean {
  const normCandidate = path.resolve(candidate);
  const normR = normRoot(root);
  // Equal to the root itself
  if (normCandidate === path.resolve(root)) return true;
  // On Windows, UNC roots (\\server\share\) need case-insensitive comparison
  if (process.platform === 'win32') {
    return normCandidate.toLowerCase().startsWith(normR.toLowerCase());
  }
  return normCandidate.startsWith(normR);
}

/**
 * Prevent path traversal attacks by rejecting paths that resolve outside
 * of user-writable roots.
 */
export function assertSafePath(inputPath: string): void {
  const resolved = path.resolve(inputPath);
  const home = os.homedir();
  const tmp = os.tmpdir();
  const cwd = process.cwd();

  const allowedRoots = [home, tmp, cwd];

  const isSafe = allowedRoots.some((root) => isUnderRoot(resolved, root));

  if (!isSafe) {
    throw new Error(
      `Path "${resolved}" is outside of allowed directories. ` +
        `Only paths under $HOME, $TMPDIR, or the current working directory are permitted.`,
    );
  }
}

/** Resolve a path and assert it is safe, returning the resolved string. */
export function resolveSafePath(inputPath: string): string {
  const resolved = path.resolve(inputPath);
  assertSafePath(resolved);
  return resolved;
}
