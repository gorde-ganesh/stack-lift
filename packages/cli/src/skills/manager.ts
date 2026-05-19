import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import ora from 'ora';
import { SKILL_REGISTRY } from './registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SkillFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
}

function parseSkillFrontmatter(content: string): SkillFrontmatter {
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};
  const block = content.slice(4, end);
  const result: SkillFrontmatter = {};
  for (const line of block.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key === 'name') result.name = val;
    else if (key === 'description') result.description = val;
    else if (key === 'version') result.version = val;
    else if (key === 'author') result.author = val;
    else if (key === 'tags')
      result.tags = val
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
  }
  return result;
}

function isLocalPath(input: string): boolean {
  return (
    input.startsWith('./') ||
    input.startsWith('../') ||
    input.startsWith('/') ||
    (process.platform === 'win32' && /^[A-Za-z]:[\\\/]/.test(input)) ||
    fs.existsSync(input)
  );
}

function installSkillFromLocalPath(sourcePath: string, customDir?: string): void {
  const resolved = path.resolve(sourcePath.replace(/^~/, os.homedir()));
  const spinner = ora(`Reading local skill: ${chalk.cyan(resolved)}`).start();

  if (!fs.existsSync(resolved)) {
    spinner.fail(`Path does not exist: ${chalk.dim(resolved)}`);
    process.exit(1);
  }

  const stat = fs.statSync(resolved);
  let mdFilePath: string;
  let sourceDir: string;
  let sourceIsDir: boolean;

  if (stat.isFile()) {
    if (!resolved.endsWith('.md')) {
      spinner.fail(`Not a Markdown file: ${chalk.dim(resolved)}`);
      console.log(chalk.dim('  Skill files must have a .md extension.\n'));
      process.exit(1);
    }
    mdFilePath = resolved;
    sourceDir = path.dirname(resolved);
    sourceIsDir = false;
  } else if (stat.isDirectory()) {
    const dirName = path.basename(resolved);
    const preferred = path.join(resolved, `${dirName}.md`);
    if (fs.existsSync(preferred)) {
      mdFilePath = preferred;
    } else {
      const mdFiles = fs.readdirSync(resolved).filter((f) => f.endsWith('.md'));
      if (mdFiles.length === 0) {
        spinner.fail(`No .md file found in directory: ${chalk.dim(resolved)}`);
        process.exit(1);
      }
      if (mdFiles.length > 1) {
        spinner.fail(
          `Multiple .md files in ${chalk.dim(resolved)} — name one ${chalk.white(`${dirName}.md`)} to disambiguate.`
        );
        process.exit(1);
      }
      mdFilePath = path.join(resolved, mdFiles[0]);
    }
    sourceDir = resolved;
    sourceIsDir = true;
  } else {
    spinner.fail(`Unsupported path type: ${chalk.dim(resolved)}`);
    process.exit(1);
  }

  const content = fs.readFileSync(mdFilePath, 'utf8');
  const frontmatter = parseSkillFrontmatter(content);
  const mdStem = path.basename(mdFilePath, '.md');
  const skillName = frontmatter.name ?? mdStem;

  if (!skillName || !/^[a-z0-9_-]+$/i.test(skillName)) {
    spinner.fail(`Invalid skill name: ${chalk.bold(skillName ?? '(empty)')}`);
    console.log(chalk.dim('  Skill names must be alphanumeric (letters, digits, - or _).\n'));
    process.exit(1);
  }

  const skillsDir = getSkillsDir(customDir);
  const destDir = path.join(skillsDir, skillName);
  const alreadyInstalled = fs.existsSync(destDir);

  spinner.text = `Installing ${chalk.cyan(skillName)} from local path…`;

  if (alreadyInstalled) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  fs.mkdirSync(destDir, { recursive: true });

  if (sourceIsDir) {
    copyDir(sourceDir, destDir);
  } else {
    fs.copyFileSync(mdFilePath, path.join(destDir, `${skillName}.md`));
  }

  const fileCount = countFiles(destDir);
  const version = frontmatter.version ?? '(local)';

  spinner.succeed(
    alreadyInstalled
      ? `Updated ${chalk.bold(skillName)} (local) — ${fileCount} file(s)`
      : `Installed ${chalk.bold(skillName)} (local) — ${fileCount} file(s)`
  );

  console.log('');
  console.log(`  ${chalk.dim('Location   ')} ${destDir}`);
  console.log(`  ${chalk.dim('Files      ')} ${fileCount}`);
  if (frontmatter.description) {
    console.log(`  ${chalk.dim('Description')} ${frontmatter.description}`);
  }
  console.log(`  ${chalk.dim('Version    ')} ${version}`);
  console.log('');
  console.log(`  Use inside Claude Code: ${chalk.cyan(`/${skillName}`)}`);
  console.log('');
}

export function getSkillsDir(customDir?: string): string {
  if (customDir) return path.resolve(customDir.replace(/^~/, os.homedir()));
  return path.join(os.homedir(), '.claude', 'skills');
}

function getPackageRoot(): string {
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return __dirname;
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}

export function installSkill(skillName: string, customDir?: string): void {
  if (isLocalPath(skillName)) {
    installSkillFromLocalPath(skillName, customDir);
    return;
  }

  const spinner = ora(`Looking up skill: ${chalk.cyan(skillName)}`).start();

  const entry = SKILL_REGISTRY[skillName];
  if (!entry) {
    spinner.fail(`Unknown skill: ${chalk.bold(skillName)}`);
    const known = Object.keys(SKILL_REGISTRY).map((n) => chalk.cyan(n)).join(', ');
    console.log(`\n  Available skills: ${known}`);
    console.log(chalk.dim(`  Run ${chalk.white('skills search')} to browse all skills.\n`));
    process.exit(1);
  }

  const skillsDir = getSkillsDir(customDir);
  const destDir = path.join(skillsDir, skillName);
  const alreadyInstalled = fs.existsSync(destDir);

  if (entry.source.type === 'bundled') {
    const pkgRoot = getPackageRoot();
    const srcDir = path.join(pkgRoot, entry.source.bundledPath ?? '');

    if (!fs.existsSync(srcDir)) {
      spinner.fail(
        `Skill source not found at: ${chalk.dim(srcDir)}\n  The package may be corrupt or was not installed correctly.`
      );
      process.exit(1);
    }

    spinner.text = `Installing ${chalk.cyan(skillName)}…`;

    if (alreadyInstalled) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }

    copyDir(srcDir, destDir);
    const fileCount = countFiles(destDir);

    spinner.succeed(
      alreadyInstalled
        ? `Updated ${chalk.bold(skillName)} to v${entry.version}`
        : `Installed ${chalk.bold(skillName)} v${entry.version}`
    );

    console.log('');
    console.log(`  ${chalk.dim('Location   ')} ${destDir}`);
    console.log(`  ${chalk.dim('Files      ')} ${fileCount}`);
    console.log(`  ${chalk.dim('Description')} ${entry.description}`);
    console.log('');
    console.log(`  Use inside Claude Code: ${chalk.cyan(`/${skillName}`)}`);
    console.log('');
    return;
  }

  spinner.fail(`Source type "${entry.source.type}" is not yet supported.`);
  process.exit(1);
}

export function removeSkill(skillName: string, customDir?: string): void {
  const skillsDir = getSkillsDir(customDir);
  const destDir = path.join(skillsDir, skillName);

  if (!fs.existsSync(destDir)) {
    console.error(chalk.red(`\n  Skill not installed: ${chalk.bold(skillName)}\n`));
    process.exit(1);
  }

  fs.rmSync(destDir, { recursive: true, force: true });
  console.log(`\n  ${chalk.green('✔')} Removed skill: ${chalk.bold(skillName)}\n`);
}

export function listSkills(customDir?: string): void {
  const skillsDir = getSkillsDir(customDir);

  console.log('');
  console.log(chalk.bold('  Installed skills'));
  console.log(chalk.dim(`  ${skillsDir}`));
  console.log('');

  if (!fs.existsSync(skillsDir)) {
    console.log(chalk.dim('  No skills installed yet.'));
    console.log(chalk.dim(`  Run ${chalk.white('skills add <name>')} to install one.\n`));
    return;
  }

  const dirs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  if (dirs.length === 0) {
    console.log(chalk.dim('  No skills installed yet.'));
    console.log(chalk.dim(`  Run ${chalk.white('skills add <name>')} to install one.\n`));
    return;
  }

  for (const dir of dirs) {
    const reg = SKILL_REGISTRY[dir.name];
    const version = reg?.version ?? '?';
    const desc = reg?.description ?? '';
    console.log(`  ${chalk.cyan('●')} ${chalk.bold(dir.name)} ${chalk.dim(`v${version}`)}`);
    if (desc) console.log(`    ${chalk.dim(desc)}`);
  }
  console.log('');
}

export function searchSkills(query?: string): void {
  const entries = Object.values(SKILL_REGISTRY);
  const matches = query
    ? entries.filter(
        (e) =>
          e.name.includes(query) ||
          e.description.toLowerCase().includes(query.toLowerCase()) ||
          e.tags.some((t) => t.includes(query))
      )
    : entries;

  console.log('');
  if (query) {
    console.log(chalk.bold(`  Skills matching "${query}" (${matches.length})`));
  } else {
    console.log(chalk.bold(`  Available skills (${matches.length})`));
  }
  console.log('');

  if (matches.length === 0) {
    console.log(chalk.dim('  No matching skills found.\n'));
    return;
  }

  for (const entry of matches) {
    console.log(`  ${chalk.cyan('●')} ${chalk.bold(entry.name)} ${chalk.dim(`v${entry.version} by ${entry.author}`)}`);
    console.log(`    ${entry.description}`);
    console.log(`    ${chalk.dim(entry.tags.map((t) => `#${t}`).join(' '))}`);
    console.log('');
  }

  console.log(chalk.dim(`  Install: npx stack-lift skills add <name>\n`));
}
