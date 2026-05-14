import * as fs from 'node:fs';
import * as path from 'node:path';
import type { StackInfo, Framework, BuildTool, PackageManager } from '../types/index.js';

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function stripRange(version: string): string {
  return version.replace(/^[\^~>=<*]+/, '').split(' ')[0].split('-')[0];
}

function detectFramework(
  deps: Record<string, string>,
  devDeps: Record<string, string>
): [Framework, string] {
  const all = { ...deps, ...devDeps };

  if (all['@angular/core']) return ['Angular', stripRange(all['@angular/core'])];
  if (all['next']) return ['Next.js', stripRange(all['next'])];
  if (all['nuxt']) return ['Nuxt', stripRange(all['nuxt'])];
  if (all['react']) return ['React', stripRange(all['react'])];
  if (all['vue']) return ['Vue', stripRange(all['vue'])];
  if (all['svelte']) return ['Svelte', stripRange(all['svelte'])];

  return ['Unknown', '0.0.0'];
}

function detectBuildTool(
  projectPath: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>
): BuildTool {
  if (exists(path.join(projectPath, 'vite.config.ts')) || exists(path.join(projectPath, 'vite.config.js')))
    return 'Vite';
  if (exists(path.join(projectPath, 'angular.json'))) return 'Angular CLI';
  if (exists(path.join(projectPath, 'webpack.config.js')) || exists(path.join(projectPath, 'webpack.config.ts')))
    return 'Webpack';
  // Check all deps for well-known build tools
  const all = { ...deps, ...devDeps };
  if (all['@angular/cli'] || all['@angular-devkit/build-angular']) return 'Angular CLI';
  if (all['react-scripts']) return 'Create React App';
  if (all['vite']) return 'Vite';
  if (all['webpack']) return 'Webpack';
  if (all['parcel']) return 'Parcel';
  if (all['rollup']) return 'Rollup';
  return 'Unknown';
}

function detectPackageManager(projectPath: string): PackageManager {
  if (exists(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (exists(path.join(projectPath, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function readNodeVersion(projectPath: string, pkg: Record<string, unknown>): string | undefined {
  for (const file of ['.nvmrc', '.node-version']) {
    const p = path.join(projectPath, file);
    if (exists(p)) return fs.readFileSync(p, 'utf-8').trim().replace(/^v/, '');
  }
  const engines = pkg['engines'] as Record<string, string> | undefined;
  if (engines?.['node']) return stripRange(engines['node']);
  return undefined;
}

export function detectStack(projectPath: string): StackInfo {
  const resolved = path.resolve(projectPath);
  const pkgPath = path.join(resolved, 'package.json');
  const pkg = readJsonFile(pkgPath);

  if (!pkg) {
    throw new Error(`No package.json found at: ${resolved}`);
  }

  const deps = (pkg['dependencies'] as Record<string, string>) ?? {};
  const devDeps = (pkg['devDependencies'] as Record<string, string>) ?? {};
  const all = { ...deps, ...devDeps };

  const [framework, frameworkVersion] = detectFramework(deps, devDeps);

  return {
    framework,
    frameworkVersion,
    typescript: all['typescript'] ? stripRange(all['typescript']) : undefined,
    rxjs: all['rxjs'] ? stripRange(all['rxjs']) : undefined,
    buildTool: detectBuildTool(resolved, deps, devDeps),
    nodeVersion: readNodeVersion(resolved, pkg),
    packageManager: detectPackageManager(resolved),
    projectPath: resolved,
    rawDependencies: deps,
    rawDevDependencies: devDeps,
  };
}
