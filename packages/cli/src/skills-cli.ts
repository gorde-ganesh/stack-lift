import { Command } from 'commander';
import { createRequire } from 'node:module';
import { installSkill, listSkills, removeSkill, searchSkills } from './skills/manager.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program.name('skills').description('stack-lift skill manager').version(pkg.version);

program
  .command('add <skill>')
  .option('--dir <path>', 'Override the skills installation directory')
  .action((skill: string, options: { dir?: string }) => installSkill(skill, options.dir));

program
  .command('remove <skill>')
  .aliases(['uninstall', 'rm'])
  .option('--dir <path>', 'Override the skills directory')
  .action((skill: string, options: { dir?: string }) => removeSkill(skill, options.dir));

program
  .command('list')
  .alias('ls')
  .option('--dir <path>', 'Override the skills directory')
  .action((options: { dir?: string }) => listSkills(options.dir));

program.command('search [query]').action((query?: string) => searchSkills(query));

program.parse(process.argv);
