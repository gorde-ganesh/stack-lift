import { Command } from 'commander';
import { createRequire } from 'node:module';
import { installSkill, removeSkill, listSkills, searchSkills } from './skills/manager.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('skills')
  .description('skills.sh — Claude Code skill manager')
  .version(pkg.version)
  .addHelpText(
    'after',
    `
Examples:
  $ npx stack-lift skills add stacklift
  $ skills add stacklift
  $ skills list
  $ skills search angular
  $ skills remove stacklift
`
  );

program
  .command('add <skill>')
  .description('Install a skill into Claude Code (~/.claude/skills/)')
  .option('--dir <path>', 'Override the skills installation directory')
  .action(async (skill: string, options: { dir?: string }) => {
    await installSkill(skill, options.dir);
  });

program
  .command('remove <skill>')
  .aliases(['uninstall', 'rm'])
  .description('Remove an installed skill')
  .option('--dir <path>', 'Override the skills directory')
  .action((skill: string, options: { dir?: string }) => {
    removeSkill(skill, options.dir);
  });

program
  .command('list')
  .alias('ls')
  .description('List installed skills')
  .option('--dir <path>', 'Override the skills directory')
  .action((options: { dir?: string }) => {
    listSkills(options.dir);
  });

program
  .command('search [query]')
  .description('Search available skills in the registry')
  .action((query?: string) => {
    searchSkills(query);
  });

program.parse(process.argv);
