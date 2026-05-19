// Bump all workspace packages to the same version, derived from the CLI package.
// Usage: BUMP=patch node scripts/bump-version.cjs
// BUMP can be: patch | minor | major | prerelease
'use strict';
const fs = require('fs');
const path = require('path');

const bump = process.env.BUMP;
if (!bump) { console.error('BUMP env var is required'); process.exit(1); }

const cliPkg = JSON.parse(fs.readFileSync('packages/cli/package.json', 'utf8'));
const [major, minor, patch] = cliPkg.version.split('-')[0].split('.').map(Number);
const preMatch = cliPkg.version.match(/-rc\.(\d+)$/);

let newVer;
if (bump === 'major')           newVer = `${major + 1}.0.0`;
else if (bump === 'minor')      newVer = `${major}.${minor + 1}.0`;
else if (bump === 'patch')      newVer = `${major}.${minor}.${patch + 1}`;
else if (bump === 'prerelease') {
  const n = preMatch ? Number(preMatch[1]) + 1 : 0;
  newVer = `${major}.${minor}.${patch}-rc.${n}`;
} else {
  console.error('Unknown bump type:', bump);
  process.exit(1);
}

const scoped = ['schemas', 'shared', 'core', 'angular-provider', 'cli', 'benchmarks'];

for (const ws of fs.readdirSync('packages')) {
  const pkgPath = path.join('packages', ws, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = newVer;
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[section]) continue;
    for (const name of scoped) {
      const key = `@stack-lift/${name}`;
      if (pkg[section][key] !== undefined) pkg[section][key] = newVer;
    }
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

console.log(`Bumped all workspace packages to ${newVer}`);
