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
  /** Daily quote notification; the subscription itself lives in the browser. */
  notify: boolean;
  /** Local hour of the daily notification, 0–23. */
  notifyHour: number;
  /** The reader has swiped once or dismissed the first-launch swipe hint. */
  swipeHintSeen: boolean;
  /** How often the reader said "Not now" to the offer to install the app. */
  installDismissals: number;
  /** When the reader last said "Not now" to it, as an ISO timestamp. */
  installDismissedAt: string | null;
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
    notify: false,
    notifyHour: 8,
    swipeHintSeen: false,
    installDismissals: 0,
    installDismissedAt: null,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;
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
      notify: data.notify === true,
      notifyHour: isHour(data.notifyHour) ? data.notifyHour : fallback.notifyHour,
      // Preferences saved before the hint existed belong to readers who
      // already know how to swipe, so only an explicit false shows it.
      swipeHintSeen: data.swipeHintSeen !== false,
      installDismissals:
        typeof data.installDismissals === 'number' &&
        Number.isInteger(data.installDismissals) &&
        data.installDismissals >= 0
          ? data.installDismissals
          : 0,
      installDismissedAt:
        typeof data.installDismissedAt === 'string' ? data.installDismissedAt : null,
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
