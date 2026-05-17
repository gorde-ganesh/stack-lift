import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  StackInfo,
  Framework,
  BuildTool,
  PackageManager,
  TsconfigInfo,
  WorkspaceInfo,
  NxProjectEntry,
} from '@stack-lift/shared';

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
  const all = { ...deps, ...devDeps };

  if (all['@angular/core']) return ['Angular', stripRange(all['@angular/core'])];

  const nextVer = deps['next'] ?? devDeps['next'];
  if (nextVer) return ['Next.js', stripRange(nextVer)];

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

function detectTestRunner(
  projectPath: string,
  allDeps: Record<string, string>,
): string | undefined {
  if (
    exists(path.join(projectPath, 'karma.conf.js')) ||
    exists(path.join(projectPath, 'karma.conf.ts'))
  )
    return 'Karma';
  if (
    exists(path.join(projectPath, 'jest.config.js')) ||
    exists(path.join(projectPath, 'jest.config.ts'))
  )
    return 'Jest';
  if (
    exists(path.join(projectPath, 'vitest.config.ts')) ||
    exists(path.join(projectPath, 'vitest.config.js'))
  )
    return 'Vitest';
  if (allDeps['@playwright/test']) return 'Playwright';
  if (allDeps['cypress']) return 'Cypress';
  if (allDeps['karma']) return 'Karma';
  if (allDeps['vitest']) return 'Vitest';
  if (allDeps['jest']) return 'Jest';
  return undefined;
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

function parseYarnLock(projectPath: string): { versions: Record<string, string>; parsed: boolean } {
  const lockPath = path.join(projectPath, 'yarn.lock');
  if (!fs.existsSync(lockPath)) return { versions: {}, parsed: false };

  let content: string;
  try {
    content = fs.readFileSync(lockPath, 'utf-8');
  } catch {
    return { versions: {}, parsed: false };
  }

  const versions: Record<string, string> = {};
  const blockRe = /^"?([^@\s"]+)@[^:]+:?\s*\n(?:[\s\S]*?\n)?\s+version[: ]+"?([^\s"]+)"?/gm;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(content)) !== null) {
    const name = match[1]?.trim();
    const ver = match[2]?.trim();
    if (name && ver && !versions[name]) {
      versions[name] = ver;
    }
  }
  return { versions, parsed: Object.keys(versions).length > 0 };
}

function parsePnpmLock(projectPath: string): { versions: Record<string, string>; parsed: boolean } {
  const lockPath = path.join(projectPath, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockPath)) return { versions: {}, parsed: false };

  let content: string;
  try {
    content = fs.readFileSync(lockPath, 'utf-8');
  } catch {
    return { versions: {}, parsed: false };
  }

  const versions: Record<string, string> = {};
  const pkgRe = /^\s{2}(?:\/)?([^@\s/][^@\s]*)@([^\s:(/]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = pkgRe.exec(content)) !== null) {
    const name = match[1]?.trim();
    const ver = match[2]?.trim();
    if (name && ver && !versions[name]) {
      versions[name] = ver;
    }
  }
  return { versions, parsed: Object.keys(versions).length > 0 };
}

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

  const packages = raw['packages'] as Record<string, { version?: string }> | undefined;
  if (packages) {
    for (const [key, val] of Object.entries(packages)) {
      if (!key.startsWith('node_modules/') || !val.version) continue;
      const name = key.slice('node_modules/'.length);
      versions[name] = val.version;
    }
    return { versions, parsed: true };
  }

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
      if (co['moduleResolution'] !== undefined)
        info.moduleResolution = co['moduleResolution'] as string;
      if (co['useDefineForClassFields'] !== undefined)
        info.useDefineForClassFields = co['useDefineForClassFields'] as boolean;
      if (co['experimentalDecorators'] !== undefined)
        info.experimentalDecorators = co['experimentalDecorators'] as boolean;
      if (co['emitDecoratorMetadata'] !== undefined)
        info.emitDecoratorMetadata = co['emitDecoratorMetadata'] as boolean;
      return info;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function detectIsMonorepo(projectPath: string, pkg: Record<string, unknown>): boolean {
  if (pkg['workspaces']) return true;
  if (exists(path.join(projectPath, 'pnpm-workspace.yaml'))) return true;
  if (exists(path.join(projectPath, 'lerna.json'))) return true;
  if (exists(path.join(projectPath, 'nx.json'))) return true;
  if (exists(path.join(projectPath, 'turbo.json'))) return true;
  return false;
}

function classifyNxProjectType(
  projectPath: string,
  projectRoot: string,
): NxProjectEntry['type'] {
  const fullPath = path.join(projectPath, projectRoot);
  const projectJson = readJsonFile(path.join(fullPath, 'project.json'));
  if (projectJson) {
    const pt = projectJson['projectType'] as string | undefined;
    if (pt === 'application') return 'app';
    if (pt === 'library') return 'lib';
  }
  if (projectRoot.includes('/apps/') || projectRoot.startsWith('apps/')) return 'app';
  if (projectRoot.includes('/libs/') || projectRoot.startsWith('libs/')) return 'lib';
  return 'unknown';
}

function detectNxWorkspace(
  projectPath: string,
  pkg: Record<string, unknown>,
): WorkspaceInfo | undefined {
  const nxJsonPath = path.join(projectPath, 'nx.json');
  if (!exists(nxJsonPath)) return undefined;

  const nxJson = readJsonFile(nxJsonPath);
  const projects: NxProjectEntry[] = [];

  // nx.json v15+ stores projects in projects.json or workspace.json; enumerate via project.json files
  const workspaceJson = readJsonFile(path.join(projectPath, 'workspace.json'));
  const projectsMap =
    ((nxJson?.['projects'] ?? workspaceJson?.['projects']) as Record<
      string,
      string | Record<string, unknown>
    > | null) ?? {};

  for (const [name, val] of Object.entries(projectsMap)) {
    const root = typeof val === 'string' ? val : (val['root'] as string | undefined) ?? name;
    const tags =
      typeof val === 'object' ? ((val['tags'] as string[] | undefined) ?? []) : undefined;
    projects.push({
      name,
      path: root,
      type: classifyNxProjectType(projectPath, root),
      ...(tags !== undefined ? { tags } : {}),
    });
  }

  // Also scan apps/ and libs/ directories for project.json files (Nx 14+)
  if (projects.length === 0) {
    for (const dir of ['apps', 'libs', 'packages']) {
      const dirPath = path.join(projectPath, dir);
      if (!exists(dirPath)) continue;
      try {
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const projectJsonPath = path.join(dirPath, entry.name, 'project.json');
          if (!exists(projectJsonPath)) continue;
          const pj = readJsonFile(projectJsonPath);
          const name = (pj?.['name'] as string) ?? entry.name;
          const type = dir === 'apps' ? 'app' : dir === 'libs' ? 'lib' : 'unknown';
          const tags = pj?.['tags'] as string[] | undefined;
          projects.push({
            name,
            path: `${dir}/${entry.name}`,
            type,
            ...(tags !== undefined ? { tags } : {}),
          });
        }
      } catch {
        // ignore fs errors
      }
    }
  }

  const allDeps = {
    ...((pkg['dependencies'] as Record<string, string> | undefined) ?? {}),
    ...((pkg['devDependencies'] as Record<string, string> | undefined) ?? {}),
  };
  const nxVersion = allDeps['nx'] ? stripRange(allDeps['nx']) : undefined;

  return {
    isNx: true,
    ...(nxVersion !== undefined ? { nxVersion } : {}),
    projects,
  };
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
  const workspaceInfo = isMonorepo ? detectNxWorkspace(resolved, pkg) : undefined;
  const pm = detectPackageManager(resolved);
  let lockfileResult: { versions: Record<string, string>; parsed: boolean };
  if (pm === 'yarn') {
    lockfileResult = parseYarnLock(resolved);
  } else if (pm === 'pnpm') {
    lockfileResult = parsePnpmLock(resolved);
  } else {
    lockfileResult = parseLockfile(resolved);
  }
  const { versions: resolvedVersions, parsed: lockfileParsed } = lockfileResult;
  const tsconfig = readTsconfig(resolved);
  const testRunner = detectTestRunner(resolved, all);

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
    packageManager: pm,
    projectPath: resolved,
    rawDependencies: deps,
    rawDevDependencies: devDeps,
    ...(lockfileParsed ? { resolvedVersions } : {}),
    lockfileParsed,
    ...(tsconfig !== undefined ? { tsconfig } : {}),
    isMonorepo,
    ...(workspaceInfo !== undefined ? { workspaceInfo } : {}),
    ...(testRunner !== undefined ? { testRunner } : {}),
  };
}
