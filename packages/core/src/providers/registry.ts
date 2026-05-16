import type { Framework } from '@stack-lift/shared';
import type { FrameworkProvider } from './framework-provider.js';
import { reactProvider } from './react-provider.js';

const providers = new Map<Framework, FrameworkProvider>();

export function registerFrameworkProvider(provider: FrameworkProvider): void {
  providers.set(provider.framework, provider);
}

export function getFrameworkProvider(framework: Framework): FrameworkProvider | undefined {
  return providers.get(framework);
}

export function listFrameworkProviders(): FrameworkProvider[] {
  return Array.from(providers.values());
}

registerFrameworkProvider(reactProvider);
