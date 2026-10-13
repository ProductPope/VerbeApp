import { useSyncExternalStore } from 'react';

/**
 * A small observable value persisted to localStorage under one key, when
 * storage is available. Storage failures (private mode, full disk) never
 * break the app: it keeps working for this session only.
 */
export function createLocalStore<T>(
  storage: Storage | undefined,
  key: string,
  parse: (raw: string | null) => T,
) {
  let state = parse(read());
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
      storage?.setItem(key, JSON.stringify(state));
    } catch {
      // Private mode or full storage: keep working for this session only.
    }
  }

  return {
    get: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (change: (current: T) => T) => {
      const next = change(state);
      if (next === state) return;
      state = next;
      write();
      for (const listener of listeners) listener();
    },
  };
}

export type LocalStore<T> = ReturnType<typeof createLocalStore<T>>;

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
