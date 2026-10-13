import { createLocalStore, useLocalStore } from '../storage/local-store.js';
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

/** Preferences persisted to localStorage when it is available. */
export function createPreferencesStore(storage: Storage | undefined, browserLanguage: string) {
  return createLocalStore(storage, STORAGE_KEY, (raw) =>
    parsePreferences(raw, defaultPreferences(browserLanguage)),
  );
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>;

export function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function usePreferences(store: PreferencesStore): Preferences {
  return useLocalStore(store);
}
