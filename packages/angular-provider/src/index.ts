import { registerFrameworkProvider, type FrameworkProvider } from '@stack-lift/core';
import {
  ANGULAR_SUPPORTED_VERSIONS,
  fetchLatestAngularVersion,
  getAngularLatestVersion,
  getAngularUpgradeSteps,
} from './angular.js';

export {
  ANGULAR_SUPPORTED_VERSIONS,
  fetchLatestAngularVersion,
  getAngularLatestVersion,
  getAngularUpgradeSteps,
} from './angular.js';

export const angularProvider: FrameworkProvider = {
  framework: 'Angular',
  supportedVersions: ANGULAR_SUPPORTED_VERSIONS,
  latestVersion: getAngularLatestVersion,
  fetchLatestVersion: fetchLatestAngularVersion,
  upgradeSteps: getAngularUpgradeSteps,
};

export function registerAngularProvider(): void {
  registerFrameworkProvider(angularProvider);
}
