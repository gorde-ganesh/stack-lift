import {
  getReactLatestVersion,
  getReactUpgradeSteps,
  REACT_SUPPORTED_VERSIONS,
} from '../knowledge/react.js';
import type { Framework, FrameworkProvider } from '@stack-lift/shared';

const reactProvider: FrameworkProvider = {
  name: 'React',
  supportedVersions: REACT_SUPPORTED_VERSIONS,
  getLatestVersion: getReactLatestVersion,
  getUpgradeSteps: getReactUpgradeSteps,
};

const providers = new Map<Framework, FrameworkProvider>([[reactProvider.name, reactProvider]]);

export function registerFrameworkProvider(provider: FrameworkProvider): void {
  providers.set(provider.name, provider);
}

export function getFrameworkProvider(framework: Framework): FrameworkProvider | undefined {
  return providers.get(framework);
}

export function listFrameworkProviders(): FrameworkProvider[] {
  return [...providers.values()];
}
