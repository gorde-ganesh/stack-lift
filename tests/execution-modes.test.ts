import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn().mockResolvedValue('minimal-risk'),
  checkbox: vi.fn().mockResolvedValue(['markdown', 'json']),
  confirm: vi.fn().mockResolvedValue(true),
  input: vi.fn().mockResolvedValue('./stacklift-output'),
}));

vi.mock('../packages/core/src/dependency-intelligence/npm-registry.js', () => ({
  getPackageInfoBatch: vi.fn().mockResolvedValue(new Map()),
}));

// Mock the entire @stack-lift/core to replace executeCommands and validateBuild.
// Using importOriginal so all other exports (detectStack, planUpgrade, etc.) stay real.
// validateBuild must also be overridden here because spreading `actual` would otherwise
// restore the real function even when build-validator.js is mocked separately.
const mockValidateBuild = vi.fn().mockResolvedValue([
  { step: 'install', status: 'success', durationMs: 10 },
  { step: 'build', status: 'success', durationMs: 10 },
]);

vi.mock('@stack-lift/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stack-lift/core')>();
  return {
    ...actual,
    validateBuild: mockValidateBuild,
    executeCommands: vi.fn().mockResolvedValue({ status: 'success', executions: [] }),
  };
});

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-lift-modes-'));
  const src = path.join(fixtures, 'angular-12');
  for (const f of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, f), path.join(tmpDir, f));
  }
  mockValidateBuild.mockClear();
});

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Windows may hold a file lock briefly; non-fatal for cleanup
  }
  vi.clearAllMocks();
});

describe('execution modes', () => {
  describe('safe mode — analysis-only, no writes', () => {
    it('does not write any artifact files', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');
      const outDir = path.join(tmpDir, 'out-safe');

      await runInteractive(tmpDir, {
        executionMode: 'safe',
        nonInteractive: true,
        options: {
          target: '13',
          objective: 'minimal-risk',
          outputFormats: ['json', 'markdown'],
          outputDir: outDir,
        },
      });

      // safe mode implies dry-run — no output directory should be created
      expect(fs.existsSync(outDir)).toBe(false);
    }, 30000);

    it('still returns a complete report and plan', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');

      const result = await runInteractive(tmpDir, {
        executionMode: 'safe',
        nonInteractive: true,
        options: { target: '13', outputDir: path.join(tmpDir, 'out-safe2') },
      });

      expect(result.report.plan.fromVersion).toBe('12');
      expect(result.report.plan.toVersion).toBe('13');
    }, 30000);
  });

  describe('guided mode — interactive, writes artifacts', () => {
    it('is the default when no executionMode is specified', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');
      const outDir = path.join(tmpDir, 'out-guided');

      const result = await runInteractive(tmpDir, {
        nonInteractive: true,
        options: { target: '13', outputFormats: ['json'], outputDir: outDir },
      });

      expect(result.report.plan.toVersion).toBe('13');
      expect(fs.existsSync(outDir)).toBe(true);
    }, 30000);

    it('writes artifacts when not in dry-run', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');
      const outDir = path.join(tmpDir, 'out-guided2');

      await runInteractive(tmpDir, {
        executionMode: 'guided',
        nonInteractive: true,
        options: { target: '13', outputFormats: ['json'], outputDir: outDir },
      });

      expect(fs.existsSync(outDir)).toBe(true);
      const files = fs.readdirSync(outDir);
      expect(files.some((f) => f.endsWith('.json'))).toBe(true);
    }, 30000);
  });

  describe('autonomous mode — non-interactive, runs validation', () => {
    it('runs without any interactive prompts', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');
      const { select, confirm } = await import('@inquirer/prompts');

      await runInteractive(tmpDir, {
        executionMode: 'autonomous',
        options: { target: '13', outputDir: path.join(tmpDir, 'out-auto') },
      });

      expect(select).not.toHaveBeenCalled();
      expect(confirm).not.toHaveBeenCalled();
    }, 30000);

    it('triggers build validation automatically', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');

      await runInteractive(tmpDir, {
        executionMode: 'autonomous',
        options: { target: '13', outputDir: path.join(tmpDir, 'out-auto2') },
      });

      // autonomous mode triggers baseline + post-migration build validation
      expect(mockValidateBuild).toHaveBeenCalled();
    }, 30000);

    it('writes artifacts without user confirmation', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');
      const outDir = path.join(tmpDir, 'out-auto3');

      await runInteractive(tmpDir, {
        executionMode: 'autonomous',
        options: { target: '13', outputFormats: ['json'], outputDir: outDir },
      });

      expect(fs.existsSync(outDir)).toBe(true);
    }, 30000);

    it('marks session as done after completion', async () => {
      const { runInteractive } = await import('../packages/cli/src/prompts/interaction.js');
      const { readSession } = await import('../packages/core/src/orchestration/session.js');

      await runInteractive(tmpDir, {
        executionMode: 'autonomous',
        options: { target: '13', outputDir: path.join(tmpDir, 'out-auto4') },
      });

      const session = readSession(tmpDir);
      expect(session?.phase).toBe('done');
    }, 30000);
  });
});
