import { isLanguage, type Language } from '../i18n/strings.js';

/**
 * The service worker cannot read localStorage, so the app copies what the
 * notification needs into Cache Storage, which both can reach. It never
 * leaves the device.
 */
export interface SharedPrefs {
  language: Language;
  translation: boolean;
  hidden: string[];
  tags: string[];
  /** Local hour of the daily notification, kept for re-subscribing. */
  hour: number;
}

const CACHE_NAME = 'verbeapp-shared-prefs';

function prefsUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}shared-prefs.json`, self.location.origin).href;
}

export async function writeSharedPrefs(prefs: SharedPrefs): Promise<void> {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    prefsUrl(),
    new Response(JSON.stringify(prefs), { headers: { 'Content-Type': 'application/json' } }),
  );
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

export function parseSharedPrefs(value: unknown): SharedPrefs {
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;
  return {
    language: isLanguage(data.language) ? data.language : 'en',
    translation: data.translation !== false,
    hidden: strings(data.hidden),
    tags: strings(data.tags),
    hour:
      typeof data.hour === 'number' &&
      Number.isInteger(data.hour) &&
      data.hour >= 0 &&
      data.hour < 24
        ? data.hour
        : 8,
  };
}

export async function readSharedPrefs(): Promise<SharedPrefs> {
  try {
    const response = await (await caches.open(CACHE_NAME)).match(prefsUrl());
    return parseSharedPrefs(response ? await response.json() : undefined);
  } catch {
    return parseSharedPrefs(undefined);
  }
}
