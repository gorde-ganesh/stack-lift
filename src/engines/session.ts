import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SessionState } from '../types/index.js';

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

export function newSession(projectPath: string): SessionState {
  return {
    projectPath,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    decisions: {},
    phase: 'discovery',
  };
}

export function updateSession(
  projectPath: string,
  patch: Partial<SessionState>,
): SessionState {
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
