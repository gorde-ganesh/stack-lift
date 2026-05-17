import * as fs from 'node:fs';
import * as path from 'node:path';
import { runCommand } from '../execution/command-runner.js';
import { classifyBuildFailure } from '../diagnostics/failure-classifier.js';
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

async function runStep(
  step: BuildValidationResult['step'],
  cmd: string,
  projectPath: string,
): Promise<BuildValidationResult> {
  const result = await runCommand(cmd, {
    cwd: projectPath,
    timeoutMs: 5 * 60 * 1000,
  });

  if (result.exitCode === 0 && !result.timedOut) {
    return {
      step,
      status: 'success',
      durationMs: result.durationMs,
      output: result.stdout.slice(0, 2000),
    };
  }

  const error = (result.stderr || result.stdout).slice(0, 2000);
  const failed: BuildValidationResult = {
    step,
    status: 'failed',
    durationMs: result.durationMs,
    error: result.timedOut
      ? `Timed out after ${Math.round(result.durationMs / 1000)}s. ${error}`
      : error,
  };
  failed.diagnostics = classifyBuildFailure(failed);
  return failed;
}

export interface ValidateOptions {
  projectPath: string;
  packageManager: PackageManager;
  lockfileParsed?: boolean;
  steps?: Array<BuildValidationResult['step']>;
}

export async function validateBuild(options: ValidateOptions): Promise<BuildValidationResult[]> {
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
    results.push(await runStep(step, cmd, projectPath));
  }

  return results;
}
