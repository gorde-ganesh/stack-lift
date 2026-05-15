import type { BreakingChange } from '../types/index.js';

export interface TypeScriptUpgradeInfo {
  fromVersion: string;
  toVersion: string;
  breakingChanges: BreakingChange[];
  notes: string[];
}

const TS_UPGRADES: TypeScriptUpgradeInfo[] = [
  {
    fromVersion: '4',
    toVersion: '5',
    breakingChanges: [
      {
        api: 'const enum declarations in .d.ts',
        description:
          'isolatedModules now errors on const enum in ambient contexts in stricter scenarios',
        automated: false,
        severity: 'low',
        fromVersion: '4',
        toVersion: '5',
        category: 'config',
      },
      {
        api: 'Decorators (experimentalDecorators)',
        description:
          'TypeScript 5 ships stage-3 decorators; experimentalDecorators now covers legacy decorators only',
        automated: false,
        severity: 'medium',
        fromVersion: '4',
        toVersion: '5',
        category: 'syntax',
        searchPattern: 'experimentalDecorators',
      },
    ],
    notes: [
      'TypeScript 5.x is a recommended upgrade — mostly additive with improved type inference',
      'Run tsc --noEmit after upgrade and fix any new strict errors',
    ],
  },
];

export function getTypeScriptBreakingChanges(from: string, to: string): BreakingChange[] {
  const fromMajor = parseInt(from.split('.')[0] ?? '0', 10);
  const toMajor = parseInt(to.split('.')[0] ?? '0', 10);

  return TS_UPGRADES.filter(
    (u) => parseInt(u.fromVersion) >= fromMajor && parseInt(u.toVersion) <= toMajor,
  ).flatMap((u) => u.breakingChanges);
}
