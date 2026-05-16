import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BuildValidationResult, PackageManager } from '@stack-lift/shared';

const PM_CMDS: Record<
  PackageManager,
  { install: string; installImmutable: string; build: string; test: string; lint: string }
> = {
  npm: {
    install: 'npm install',
    installImmutable: 'npm ci',
    build: 'npm run build',
    test: 'npm test',
    lint: 'npm run lint',
  },
  yarn: {
    install: 'yarn install',
    installImmutable: 'yarn install --immutable',
    build: 'yarn build',
    test: 'yarn test',
    lint: 'yarn lint',
  },
  pnpm: {
    install: 'pnpm install',
    installImmutable: 'pnpm install --frozen-lockfile',
    build: 'pnpm build',
    test: 'pnpm test',
    lint: 'pnpm lint',
  },
  bun: {
    install: 'bun install',
    installImmutable: 'bun install',
    build: 'bun run build',
    test: 'bun test',
    lint: 'bun run lint',
  },
};

function hasScript(projectPath: string, name: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    return Boolean(pkg.scripts?.[name]);
  } catch {
    return false;
  }
}

function runStep(
  step: BuildValidationResult['step'],
  cmd: string,
  projectPath: string,
): BuildValidationResult {
  const start = Date.now();
  try {
    const output = execSync(cmd, {
      cwd: projectPath,
      stdio: 'pipe',
      timeout: 5 * 60 * 1000,
    }).toString();
    return {
      step,
      status: 'success',
      durationMs: Date.now() - start,
      output: output.slice(0, 2000),
    };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const combined = [e.stdout?.toString(), e.stderr?.toString()].filter(Boolean).join('\n');
    return {
      step,
      status: 'failed',
      durationMs: Date.now() - start,
      error: (combined || e.message || String(err)).slice(0, 2000),
    };
  }
}

export interface ValidateOptions {
  projectPath: string;
  packageManager: PackageManager;
  lockfileParsed?: boolean;
  steps?: Array<BuildValidationResult['step']>;
}

export function validateBuild(options: ValidateOptions): BuildValidationResult[] {
  const {
    projectPath,
    packageManager,
    lockfileParsed = false,
    steps = ['install', 'build', 'test', 'lint'],
  } = options;
  const cmds = PM_CMDS[packageManager];
  const results: BuildValidationResult[] = [];

  for (const step of steps) {
    if (step !== 'install') {
      const scriptName = step === 'build' ? 'build' : step === 'test' ? 'test' : 'lint';
      if (!hasScript(projectPath, scriptName)) {
        results.push({ step, status: 'skipped' });
        continue;
      }
    }
    const cmd = step === 'install' && lockfileParsed ? cmds.installImmutable : cmds[step];
    results.push(runStep(step, cmd, projectPath));
  }

  return results;
}
