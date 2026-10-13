import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSharedPrefs, writeSharedPrefs } from '../../src/app/notifications/shared-prefs.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function fakeCaches() {
  const store = new Map<string, Response>();
  return {
    store,
    open: vi.fn(() =>
      Promise.resolve({
        put: (url: string, response: Response) => {
          store.set(url, response);
          return Promise.resolve();
        },
        match: (url: string) => Promise.resolve(store.get(url)?.clone()),
      }),
    ),
  };
}

describe('shared preferences for the service worker', () => {
  const prefs = { language: 'pl' as const, translation: false, hidden: ['a'], tags: [], hour: 6 };

  it('round-trips through Cache Storage', async () => {
    const caches = fakeCaches();
    vi.stubGlobal('caches', caches);
    await writeSharedPrefs(prefs);
    expect([...caches.store.keys()]).toEqual(['http://localhost:3000/shared-prefs.json']);
    expect(await readSharedPrefs()).toEqual(prefs);
  });

  it('falls back to defaults when nothing is stored or storage fails', async () => {
    vi.stubGlobal('caches', fakeCaches());
    expect((await readSharedPrefs()).language).toBe('en');
    vi.stubGlobal('caches', { open: () => Promise.reject(new Error('blocked')) });
    expect((await readSharedPrefs()).hour).toBe(8);
  });

  it('does nothing without Cache Storage', async () => {
    vi.stubGlobal('caches', undefined);
    await expect(writeSharedPrefs(prefs)).resolves.toBeUndefined();
  });
});
