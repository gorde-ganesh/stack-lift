import * as crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SessionFingerprint, SessionState } from '../types/index.js';

const SESSION_DIR = '.stacklift';
const SESSION_FILE = 'session.json';

function sessionPath(projectPath: string): string {
  return path.join(projectPath, SESSION_DIR, SESSION_FILE);
}

export function readSession(projectPath: string): SessionState | null {
  const p = sessionPath(projectPath);
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function writeSession(projectPath: string, state: SessionState): void {
  const dir = path.join(projectPath, SESSION_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sessionPath(projectPath), JSON.stringify(state, null, 2), 'utf-8');
}

export function clearSession(projectPath: string): void {
  try {
    fs.rmSync(sessionPath(projectPath), { force: true });
  } catch {
    // ignore
  }
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function gitHead(projectPath: string): string | undefined {
  try {
    return execSync('git rev-parse HEAD', { cwd: projectPath, stdio: 'pipe' }).toString().trim();
  } catch {
    return undefined;
  }
}

export function computeFingerprint(
  projectPath: string,
  frameworkVersion: string,
): SessionFingerprint {
  const packageJsonContent = fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8');
  const packageJsonHash = sha256(packageJsonContent);

  const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
  let lockfileHash: string | undefined;
  for (const lf of lockfiles) {
    const lfPath = path.join(projectPath, lf);
    if (fs.existsSync(lfPath)) {
      lockfileHash = sha256(fs.readFileSync(lfPath, 'utf-8'));
      break;
    }
  }

  const fp: SessionFingerprint = {
    packageJsonHash,
    frameworkVersion,
  };
  if (lockfileHash !== undefined) fp.lockfileHash = lockfileHash;
  const head = gitHead(projectPath);
  if (head !== undefined) fp.gitHead = head;
  return fp;
}

export function isFingerprintStale(
  saved: SessionFingerprint,
  current: SessionFingerprint,
): boolean {
  if (saved.packageJsonHash !== current.packageJsonHash) return true;
  if (saved.lockfileHash !== current.lockfileHash) return true;
  if (saved.gitHead && current.gitHead && saved.gitHead !== current.gitHead) return true;
  return false;
}

export function newSession(projectPath: string): SessionState {
  return {
    projectPath,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    decisions: {},
    phase: 'discovery',
  };
}

export function updateSession(projectPath: string, patch: Partial<SessionState>): SessionState {
  const existing = readSession(projectPath) ?? newSession(projectPath);
  const updated: SessionState = {
    ...existing,
    ...patch,
    decisions: { ...existing.decisions, ...(patch.decisions ?? {}) },
    lastUpdatedAt: new Date().toISOString(),
  };
  writeSession(projectPath, updated);
  return updated;
}
