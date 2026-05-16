import * as path from 'node:path';
import { defineConfig } from 'tsup';

const cwd = path.basename(process.cwd());
const isCliPackage = cwd === 'cli';

export default defineConfig({
  entry: isCliPackage ? { cli: 'src/cli.ts', 'skills-cli': 'src/skills-cli.ts' } : ['src/index.ts'],
  format: ['esm'],
  dts: !isCliPackage,
  sourcemap: true,
  outDir: 'dist',
  clean: true,
  ...(isCliPackage ? { banner: { js: '#!/usr/bin/env node' } } : {}),
});
