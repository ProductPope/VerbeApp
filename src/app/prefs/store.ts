import { useSyncExternalStore } from 'react';
import { isLanguage, type Language } from '../i18n/strings.js';

/** Everything the app remembers on this device. Never sent anywhere. */
export interface Preferences {
  language: Language;
  favorites: string[];
  hidden: string[];
  /** Selected category ids; empty means all categories. */
  tags: string[];
  autoplay: boolean;
  /** Show the Polish translation under each quote. */
  translation: boolean;
}

export const STORAGE_KEY = 'verbeapp:preferences:v1';

export function defaultPreferences(browserLanguage = ''): Preferences {
  return {
    language: browserLanguage.toLowerCase().startsWith('pl') ? 'pl' : 'en',
    favorites: [],
    hidden: [],
    tags: [],
    autoplay: false,
    translation: true,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Reads stored preferences, ignoring anything malformed rather than failing. */
export function parsePreferences(raw: string | null, fallback: Preferences): Preferences {
  if (raw === null) return fallback;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      language: isLanguage(data.language) ? data.language : fallback.language,
      favorites: stringArray(data.favorites),
      hidden: stringArray(data.hidden),
      tags: stringArray(data.tags),
      autoplay: data.autoplay === true,
      translation: data.translation !== false,
    };
  } catch {
    return fallback;
  }
}

/** A small observable store persisted to localStorage when it is available. */
export function createPreferencesStore(storage: Storage | undefined, browserLanguage: string) {
  let state = parsePreferences(read(), defaultPreferences(browserLanguage));
  const listeners = new Set<() => void>();

  function read(): string | null {
    try {
      return storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  function write() {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state));
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
    update: (change: (current: Preferences) => Preferences) => {
      state = change(state);
      write();
      for (const listener of listeners) listener();
    },
  };
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>;

export function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function usePreferences(store: PreferencesStore): Preferences {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
