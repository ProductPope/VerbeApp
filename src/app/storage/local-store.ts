import { useSyncExternalStore } from 'react';

/**
 * A small observable value persisted to localStorage under one key, when
 * storage is available. Storage failures (private mode, full disk) never
 * break the app: it keeps working for this session only.
 *
 * Several copies of the app can share the same storage: a background tab, the
 * installed app, or an old version still open after an update. Each change is
 * therefore applied to the latest saved value, never to this copy's possibly
 * stale one, so an older copy cannot overwrite what a newer one saved.
 */
export function createLocalStore<T>(
  storage: Storage | undefined,
  key: string,
  parse: (raw: string | null) => T,
) {
  let saved = read();
  let state = parse(saved);
  const listeners = new Set<() => void>();

  function read(): string | null {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function write() {
    try {
      const raw = JSON.stringify(state);
      storage?.setItem(key, raw);
      saved = raw;
    } catch {
      // Private mode or full storage: keep working for this session only.
    }
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  /** Adopts what another copy saved since this one last read or wrote. */
  function refresh(): boolean {
    const latest = read();
    if (latest === saved) return false;
    saved = latest;
    state = parse(latest);
    return true;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if ((event.key === key || event.key === null) && refresh()) notify();
    });
  }

  return {
    get: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (change: (current: T) => T) => {
      const refreshed = refresh();
      const next = change(state);
      if (next !== state) {
        state = next;
        write();
      } else if (!refreshed) {
        return;
      }
      notify();
    },
  };
}

export type LocalStore<T> = ReturnType<typeof createLocalStore<T>>;

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
