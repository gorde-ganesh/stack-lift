import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getPackageInfoBatch,
  clearCache,
} from '../packages/core/src/dependency-intelligence/npm-registry.js';

afterEach(() => {
  clearCache();
  vi.restoreAllMocks();
});

describe('getPackageInfoBatch', () => {
  it('returns empty map for empty input', async () => {
    const result = await getPackageInfoBatch([]);
    expect(result.size).toBe(0);
  });

  it('processes all packages and returns a map keyed by name', async () => {
    // Mock fetch to avoid real network calls
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          name: 'test-pkg',
          version: '1.0.0',
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const names = ['pkg-a', 'pkg-b', 'pkg-c'];
    const result = await getPackageInfoBatch(names);
    expect(result.size).toBe(3);
    expect(result.has('pkg-a')).toBe(true);
    expect(result.has('pkg-b')).toBe(true);
    expect(result.has('pkg-c')).toBe(true);
  });

  it('handles fetch failures gracefully — sets null for failed packages', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', mockFetch);

    const names = ['bad-pkg'];
    const result = await getPackageInfoBatch(names);
    expect(result.has('bad-pkg')).toBe(true);
    expect(result.get('bad-pkg')).toBeNull();
  });

  it('respects concurrency — processes all items with concurrency=2', async () => {
    const inflight: string[] = [];
    let maxConcurrent = 0;
    let current = 0;

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const name = (url as string).split('/').pop() ?? 'unknown';
      current++;
      inflight.push(name);
      if (current > maxConcurrent) maxConcurrent = current;

      return new Promise((resolve) => {
        setTimeout(() => {
          current--;
          resolve({
            ok: true,
            json: () => Promise.resolve({ name, version: '1.0.0' }),
          });
        }, 10);
      });
    });
    vi.stubGlobal('fetch', mockFetch);
    clearCache();

    const names = Array.from({ length: 6 }, (_, i) => `pkg-${i}`);
    await getPackageInfoBatch(names, 2);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('returns known deprecated packages even when fetch fails', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await getPackageInfoBatch(['tslint']);
    const tslint = result.get('tslint');
    expect(tslint).not.toBeNull();
    expect(tslint?.deprecated).toBeTruthy();
  });
});
