import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  readSession,
  writeSession,
  clearSession,
  newSession,
  updateSession,
} from '../src/engines/session.js';
import type { SessionState } from '../src/types/index.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-lift-session-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('session persistence', () => {
  it('returns null when no session exists', () => {
    expect(readSession(tmpDir)).toBeNull();
  });

  it('writes and reads a session round-trip', () => {
    const state = newSession(tmpDir);
    writeSession(tmpDir, state);
    const read = readSession(tmpDir);
    expect(read).not.toBeNull();
    expect(read!.projectPath).toBe(tmpDir);
    expect(read!.phase).toBe('discovery');
  });

  it('clearSession removes the file', () => {
    const state = newSession(tmpDir);
    writeSession(tmpDir, state);
    expect(readSession(tmpDir)).not.toBeNull();
    clearSession(tmpDir);
    expect(readSession(tmpDir)).toBeNull();
  });

  it('clearSession is a no-op when no session exists', () => {
    expect(() => clearSession(tmpDir)).not.toThrow();
  });

  it('updateSession creates session if none exists', () => {
    const updated = updateSession(tmpDir, { phase: 'planning' });
    expect(updated.phase).toBe('planning');
    const persisted = readSession(tmpDir);
    expect(persisted?.phase).toBe('planning');
  });

  it('updateSession merges decisions without losing existing keys', () => {
    updateSession(tmpDir, { decisions: { objective: 'security', targetVersion: '18' } });
    updateSession(tmpDir, { decisions: { outputDir: './out' } });
    const session = readSession(tmpDir);
    expect(session?.decisions.objective).toBe('security');
    expect(session?.decisions.targetVersion).toBe('18');
    expect(session?.decisions.outputDir).toBe('./out');
  });

  it('updateSession updates lastUpdatedAt each time', async () => {
    const s1 = updateSession(tmpDir, { phase: 'discovery' });
    await new Promise((r) => setTimeout(r, 5));
    const s2 = updateSession(tmpDir, { phase: 'planning' });
    expect(new Date(s2.lastUpdatedAt).getTime()).toBeGreaterThan(
      new Date(s1.lastUpdatedAt).getTime(),
    );
  });

  it('newSession initialises with discovery phase', () => {
    const s = newSession(tmpDir);
    expect(s.phase).toBe('discovery');
    expect(s.decisions).toEqual({});
    expect(s.projectPath).toBe(tmpDir);
  });

  it('session file is valid JSON', () => {
    writeSession(tmpDir, newSession(tmpDir));
    const raw = fs.readFileSync(path.join(tmpDir, '.stacklift', 'session.json'), 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
    const parsed = JSON.parse(raw) as SessionState;
    expect(parsed.phase).toBe('discovery');
  });

  it('readSession handles corrupted JSON gracefully', () => {
    const sessionDir = path.join(tmpDir, '.stacklift');
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, 'session.json'), 'NOT_JSON{{{', 'utf-8');
    expect(readSession(tmpDir)).toBeNull();
  });
});
