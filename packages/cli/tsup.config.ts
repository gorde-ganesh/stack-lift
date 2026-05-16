import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli.ts', 'skills-cli': 'src/skills-cli.ts' },
  format: ['esm'],
  banner: { js: '#!/usr/bin/env node' },
  outDir: 'dist',
  clean: true,
});
