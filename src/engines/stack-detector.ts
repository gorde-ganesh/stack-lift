import * as fs from 'node:fs';
import * as path from 'node:path';
import type { StackInfo, Framework, BuildTool, PackageManager, TsconfigInfo } from '../types/index.js';

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function stripRange(version: string): string {
  return ((version.replace(/^[\^~>=<*]+/, '').split(' ')[0] ?? '').split('-')[0] ?? '').trim();
}

function detectFramework(
  deps: Record<string, string>,
  devDeps: Record<string, string>,
): [Framework, string] {
  // Priority order matters: check more specific frameworks first
  const all = { ...deps, ...devDeps };

  if (all['@angular/core']) return ['Angular', stripRange(all['@angular/core'])];

  // Next.js must come before React since it also lists 'react' as a dep
  const nextVer = deps['next'] ?? devDeps['next'];
  if (nextVer) return ['Next.js', stripRange(nextVer)];

  // Nuxt must come before Vue
  const nuxtVer = deps['nuxt'] ?? devDeps['nuxt'];
  if (nuxtVer) return ['Nuxt', stripRange(nuxtVer)];

  const reactVer = deps['react'] ?? devDeps['react'];
  if (reactVer) return ['React', stripRange(reactVer)];

  const vueVer = deps['vue'] ?? devDeps['vue'];
  if (vueVer) return ['Vue', stripRange(vueVer)];

  const svelteVer = deps['svelte'] ?? devDeps['svelte'];
  if (svelteVer) return ['Svelte', stripRange(svelteVer)];

  return ['Unknown', '0.0.0'];
}

function detectBuildTool(
  projectPath: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>,
): BuildTool {
  // File-based detection takes precedence over package.json
  if (
    exists(path.join(projectPath, 'vite.config.ts')) ||
    exists(path.join(projectPath, 'vite.config.js'))
  )
    return 'Vite';
  if (exists(path.join(projectPath, 'angular.json'))) return 'Angular CLI';
  if (
    exists(path.join(projectPath, 'webpack.config.js')) ||
    exists(path.join(projectPath, 'webpack.config.ts'))
  )
    return 'Webpack';
  if (
    exists(path.join(projectPath, 'rollup.config.js')) ||
    exists(path.join(projectPath, 'rollup.config.ts'))
  )
    return 'Rollup';

  // Fall back to package.json presence
  const all = { ...deps, ...devDeps };
  if (all['@angular/cli'] || all['@angular-devkit/build-angular']) return 'Angular CLI';
  if (all['react-scripts']) return 'Create React App';
  if (all['vite'] || all['@vitejs/plugin-react'] || all['@vitejs/plugin-vue']) return 'Vite';
  if (all['webpack'] || all['webpack-cli']) return 'Webpack';
  if (all['parcel'] || all['parcel-bundler']) return 'Parcel';
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
    if (exists(p)) {
      return fs.readFileSync(p, 'utf-8').trim().replace(/^v/, '');
    }
  }
  const engines = pkg['engines'] as Record<string, string> | undefined;
  if (engines?.['node']) return stripRange(engines['node']);
  return undefined;
}

/**
 * Parse package-lock.json to extract the actual installed (resolved) version for each package.
 * Supports lockfileVersion 1, 2, and 3.
 */
function parseLockfile(projectPath: string): { versions: Record<string, string>; parsed: boolean } {
  const lockPath = path.join(projectPath, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return { versions: {}, parsed: false };

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return { versions: {}, parsed: false };
  }

  const versions: Record<string, string> = {};

  // v2/v3: packages map keyed as "node_modules/<pkg>"
  const packages = raw['packages'] as Record<string, { version?: string }> | undefined;
  if (packages) {
    for (const [key, val] of Object.entries(packages)) {
      if (!key.startsWith('node_modules/') || !val.version) continue;
      const name = key.slice('node_modules/'.length);
      versions[name] = val.version;
    }
    return { versions, parsed: true };
  }

  // v1: dependencies map keyed by package name
  const deps = raw['dependencies'] as Record<string, { version?: string }> | undefined;
  if (deps) {
    for (const [name, val] of Object.entries(deps)) {
      if (val.version) versions[name] = val.version;
    }
    return { versions, parsed: true };
  }

  return { versions: {}, parsed: false };
}

function readTsconfig(projectPath: string): TsconfigInfo | undefined {
  const candidates = ['tsconfig.json', 'tsconfig.base.json'];
  for (const name of candidates) {
    const p = path.join(projectPath, name);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as {
        compilerOptions?: Record<string, unknown>;
      };
      const co = raw.compilerOptions;
      if (!co) return {};
      const info: TsconfigInfo = {};
      if (co['strict'] !== undefined) info.strict = co['strict'] as boolean;
      if (co['target'] !== undefined) info.target = co['target'] as string;
      if (co['module'] !== undefined) info.module = co['module'] as string;
      if (co['moduleResolution'] !== undefined) info.moduleResolution = co['moduleResolution'] as string;
      if (co['useDefineForClassFields'] !== undefined) info.useDefineForClassFields = co['useDefineForClassFields'] as boolean;
      if (co['experimentalDecorators'] !== undefined) info.experimentalDecorators = co['experimentalDecorators'] as boolean;
      if (co['emitDecoratorMetadata'] !== undefined) info.emitDecoratorMetadata = co['emitDecoratorMetadata'] as boolean;
      return info;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function detectIsMonorepo(projectPath: string, pkg: Record<string, unknown>): boolean {
  // Yarn/npm workspaces
  if (pkg['workspaces']) return true;
  // pnpm workspaces
  if (exists(path.join(projectPath, 'pnpm-workspace.yaml'))) return true;
  // Lerna
  if (exists(path.join(projectPath, 'lerna.json'))) return true;
  // Nx
  if (exists(path.join(projectPath, 'nx.json'))) return true;
  // Turborepo
  if (exists(path.join(projectPath, 'turbo.json'))) return true;
  return false;
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
  const isMonorepo = detectIsMonorepo(resolved, pkg);
  const { versions: resolvedVersions, parsed: lockfileParsed } = parseLockfile(resolved);
  const tsconfig = readTsconfig(resolved);

  const nodeVersion = readNodeVersion(resolved, pkg);
  const tsVer = all['typescript'];
  const rxjsVer = all['rxjs'];
  return {
    framework,
    frameworkVersion,
    ...(tsVer ? { typescript: stripRange(tsVer) } : {}),
    ...(rxjsVer ? { rxjs: stripRange(rxjsVer) } : {}),
    buildTool: detectBuildTool(resolved, deps, devDeps),
    ...(nodeVersion !== undefined ? { nodeVersion } : {}),
    packageManager: detectPackageManager(resolved),
    projectPath: resolved,
    rawDependencies: deps,
    rawDevDependencies: devDeps,
    ...(lockfileParsed ? { resolvedVersions } : {}),
    lockfileParsed,
    ...(tsconfig !== undefined ? { tsconfig } : {}),
    isMonorepo,
  };
}
