import { localized, type Card } from '../catalog/catalog.js';
import { eligibleCards, seededRandom } from '../feed/queue.js';
import type { Language } from '../i18n/strings.js';

/** The calendar day on the reader's clock, e.g. 2026-10-13. */
export function dayKey(date: Date, timeZone?: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    ...(timeZone === undefined ? {} : { timeZone }),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

/**
 * Picks the same card all day, a different one the next day. Respects the
 * reader's hidden quotes and categories; if they exclude everything, falls
 * back to any quote that is not hidden.
 */
export function quoteOfTheDay(
  cards: readonly Card[],
  filters: { hidden: readonly string[]; tags: readonly string[] },
  day: string,
): Card | undefined {
  let pool = eligibleCards(cards, filters.hidden, filters.tags);
  if (pool.length === 0) pool = eligibleCards(cards, filters.hidden, []);
  if (pool.length === 0) return undefined;
  const index = Math.floor(seededRandom(hashString(day))() * pool.length);
  return pool[index];
}

export interface DailyNotification {
  title: string;
  body: string;
  quoteId: string;
}

export function dailyNotification(
  card: Card,
  language: Language,
  translationLanguage: Language | undefined,
): DailyNotification {
  const translation =
    translationLanguage === undefined ? undefined : card.translations[translationLanguage];
  return {
    title: localized(card.author, language),
    body: translation === undefined ? card.text : `${card.text}\n\n${translation}`,
    quoteId: card.id,
  };
}
