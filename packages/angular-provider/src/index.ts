import { registerFrameworkProvider } from '@stack-lift/core';
import type { FrameworkProvider, UpgradeStep } from '@stack-lift/shared';

export const ANGULAR_SUPPORTED_VERSIONS = [
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
] as const;

function createStep(fromVersion: string, toVersion: string): UpgradeStep {
  return {
    fromVersion,
    toVersion,
    description: `Angular ${fromVersion} to ${toVersion}: framework, CLI, Material, and TypeScript alignment`,
    breakingChanges: [],
    automatedFixes: 0,
    manualActions: [
      `Run ng update @angular/core@${toVersion} @angular/cli@${toVersion}`,
      'Review Angular update guide tasks for application-specific migrations',
      'Run the project test suite after dependency installation',
    ],
    npmInstall: [`@angular/core@${toVersion}`, `@angular/cli@${toVersion}`],
    conditionalNpmInstall: [
      {
        packages: [`@angular/material@${toVersion}`, `@angular/cdk@${toVersion}`],
        condition: '@angular/material or @angular/cdk present',
      },
    ],
    referenceUrl: `https://angular.dev/update-guide?v=${fromVersion}.0-${toVersion}.0`,
  };
}

export function getAngularUpgradeSteps(fromVersion: string, toVersion: string): UpgradeStep[] {
  const steps: UpgradeStep[] = [];
  for (let major = Number(fromVersion); major < Number(toVersion); major++) {
    steps.push(createStep(String(major), String(major + 1)));
  }
  return steps;
}

export function getAngularLatestVersion(): string {
  return ANGULAR_SUPPORTED_VERSIONS[ANGULAR_SUPPORTED_VERSIONS.length - 1] ?? '20';
}

export const angularProvider: FrameworkProvider = {
  name: 'Angular',
  supportedVersions: ANGULAR_SUPPORTED_VERSIONS,
  getLatestVersion: getAngularLatestVersion,
  getUpgradeSteps: getAngularUpgradeSteps,
};

export function registerAngularProvider(): FrameworkProvider {
  registerFrameworkProvider(angularProvider);
  return angularProvider;
}
