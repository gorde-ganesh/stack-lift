import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import chalk from 'chalk';
import { SKILL_REGISTRY } from './registry.js';

export function getSkillsDir(customDir?: string): string {
  if (customDir) return path.resolve(customDir.replace(/^~/, os.homedir()));
  return path.join(os.homedir(), '.claude', 'skills');
}

export function installSkill(skillName: string, customDir?: string): void {
  const entry = SKILL_REGISTRY[skillName];
  if (!entry) {
    throw new Error(`Unknown skill: ${skillName}`);
  }

  const destDir = path.join(getSkillsDir(customDir), skillName);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(
    path.join(destDir, 'SKILL.md'),
    `# ${entry.name}\n\n${entry.description}\n`,
    'utf-8',
  );
  console.log(chalk.green(`Installed ${entry.name} at ${destDir}`));
}

export function removeSkill(skillName: string, customDir?: string): void {
  const destDir = path.join(getSkillsDir(customDir), skillName);
  fs.rmSync(destDir, { recursive: true, force: true });
  console.log(chalk.green(`Removed ${skillName}`));
}

export function listSkills(customDir?: string): void {
  const skillsDir = getSkillsDir(customDir);
  const installed = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : [];

  console.log('');
  console.log(chalk.bold('Installed skills'));
  for (const entry of installed) console.log(`  ${entry.name}`);
  if (installed.length === 0) console.log('  No skills installed yet.');
  console.log('');
}

export function searchSkills(query?: string): void {
  const matches = Object.values(SKILL_REGISTRY).filter(
    (entry) =>
      !query ||
      entry.name.includes(query) ||
      entry.description.toLowerCase().includes(query.toLowerCase()) ||
      entry.tags.some((tag) => tag.includes(query)),
  );

  console.log('');
  for (const entry of matches) {
    console.log(`${chalk.cyan(entry.name)} ${chalk.dim(`v${entry.version}`)} - ${entry.description}`);
  }
  if (matches.length === 0) console.log('No matching skills found.');
  console.log('');
}
