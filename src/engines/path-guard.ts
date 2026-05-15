import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Prevent path traversal attacks by rejecting paths that resolve outside
 * of user-writable roots.
 *
 * Allowed roots: user's home directory and /tmp (common CI scratch space).
 * Reject: absolute paths to system directories (/etc, /usr, /bin, etc.)
 */
export function assertSafePath(inputPath: string): void {
  const resolved = path.resolve(inputPath);
  const home = os.homedir();
  const tmp = os.tmpdir();
  const cwd = process.cwd();

  const allowedRoots = [home, tmp, cwd];

  const isSafe = allowedRoots.some((root) => {
    const resolvedRoot = path.resolve(root);
    return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);
  });

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
