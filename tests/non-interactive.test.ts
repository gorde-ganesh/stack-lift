import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

// Mock the prompt library so non-interactive mode tests never block on user input
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn().mockResolvedValue('minimal-risk'),
  checkbox: vi.fn().mockResolvedValue(['markdown', 'json']),
  confirm: vi.fn().mockResolvedValue(true),
  input: vi.fn().mockResolvedValue('./stacklift-output'),
}));

// Mock build validator so tests don't run real shell commands
vi.mock('../src/engines/build-validator.js', () => ({
  validateBuild: vi.fn().mockReturnValue([
    { step: 'install', status: 'skipped' },
    { step: 'build', status: 'skipped' },
  ]),
}));

// Mock npm registry calls so tests are fast and deterministic
vi.mock('../src/engines/npm-registry.js', () => ({
  getPackageInfoBatch: vi.fn().mockResolvedValue(new Map()),
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-lift-ni-'));
  // Copy angular-12 fixture into tmpDir
  const src = path.join(fixtures, 'angular-12');
  for (const f of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, f), path.join(tmpDir, f));
  }
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('runInteractive — non-interactive mode', () => {
  it('completes without prompting when nonInteractive=true', async () => {
    const { runInteractive } = await import('../src/engines/interaction.js');
    const { select, confirm } = await import('@inquirer/prompts');

    const result = await runInteractive(tmpDir, {
      nonInteractive: true,
      options: {
        target: '13',
        objective: 'minimal-risk',
        outputFormats: ['json'],
        outputDir: path.join(tmpDir, 'out'),
      },
    });

    // Should NOT call interactive prompts for objective/target
    expect(select).not.toHaveBeenCalled();
    // confirm may be called for "Continue with this project?" only in interactive mode
    expect(confirm).not.toHaveBeenCalled();

    expect(result.decisions.objective).toBe('minimal-risk');
    expect(result.decisions.targetVersion).toBe('13');
    expect(result.report.plan.fromVersion).toBe('12');
    expect(result.report.plan.toVersion).toBe('13');
  });

  it('defaults objective to minimal-risk when not provided', async () => {
    const { runInteractive } = await import('../src/engines/interaction.js');
    const result = await runInteractive(tmpDir, {
      nonInteractive: true,
      options: { target: '13', outputDir: path.join(tmpDir, 'out') },
    });
    expect(result.decisions.objective).toBe('minimal-risk');
  });

  it('writes artifacts to specified outputDir', async () => {
    const { runInteractive } = await import('../src/engines/interaction.js');
    const outDir = path.join(tmpDir, 'artifacts');
    await runInteractive(tmpDir, {
      nonInteractive: true,
      options: { target: '13', outputFormats: ['json'], outputDir: outDir },
    });
    expect(fs.existsSync(outDir)).toBe(true);
    const files = fs.readdirSync(outDir);
    expect(files.some(f => f.endsWith('.json'))).toBe(true);
  });

  it('always writes machine artifacts in non-interactive mode', async () => {
    const { runInteractive } = await import('../src/engines/interaction.js');
    const outDir = path.join(tmpDir, 'machine-out');
    await runInteractive(tmpDir, {
      nonInteractive: true,
      options: { target: '13', outputFormats: ['markdown'], outputDir: outDir },
    });
    expect(fs.existsSync(path.join(outDir, 'analysis.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'plan.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'execution.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'validation.json'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'findings.json'))).toBe(true);
  });

  it('report contains plan with correct hop', async () => {
    const { runInteractive } = await import('../src/engines/interaction.js');
    const result = await runInteractive(tmpDir, {
      nonInteractive: true,
      options: { target: '15', outputFormats: [], outputDir: path.join(tmpDir, 'out') },
    });
    // Angular 12 → 15 is 3 incremental hops
    expect(result.report.plan.steps.length).toBe(3);
    expect(result.report.plan.strategy).toBe('incremental');
  });

  it('session is persisted and marked done after completion', async () => {
    const { runInteractive } = await import('../src/engines/interaction.js');
    const { readSession } = await import('../src/engines/session.js');
    await runInteractive(tmpDir, {
      nonInteractive: true,
      options: { target: '13', outputFormats: [], outputDir: path.join(tmpDir, 'out') },
    });
    const session = readSession(tmpDir);
    expect(session).not.toBeNull();
    expect(session!.phase).toBe('done');
  });
});
