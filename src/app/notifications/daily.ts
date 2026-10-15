import type { Card } from '../catalog/catalog.js';
import { eligibleCards, seededRandom } from '../feed/queue.js';
import { STRINGS, type Language } from '../i18n/strings.js';

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

/**
 * The daily nudge: an invitation to open the app, without the quote itself,
 * so the quote is read in the app. The invitation changes from day to day;
 * the quote id lets a tap open the app on today's quote.
 */
export function dailyNotification(card: Card, language: Language, day: string): DailyNotification {
  const strings = STRINGS[language];
  const invites = strings.notificationInvites;
  return {
    title: strings.notificationTitle,
    body: invites[hashString(`invite:${day}`) % invites.length] ?? '',
    quoteId: card.id,
  };
}
