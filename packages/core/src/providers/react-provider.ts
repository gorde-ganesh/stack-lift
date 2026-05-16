import {
  getReactLatestVersion,
  getReactUpgradeSteps,
  REACT_SUPPORTED_VERSIONS,
} from '../knowledge/react.js';
import type { FrameworkProvider } from './framework-provider.js';

export const reactProvider: FrameworkProvider = {
  framework: 'React',
  supportedVersions: REACT_SUPPORTED_VERSIONS,
  latestVersion: getReactLatestVersion,
  upgradeSteps: getReactUpgradeSteps,
};
