import { describe, expect, it } from 'vitest';
import { dailyNotification, dayKey, quoteOfTheDay } from '../../src/app/notifications/daily.js';
import { parseSharedPrefs } from '../../src/app/notifications/shared-prefs.js';
import { testCatalog } from './fixtures.js';

const { cards } = testCatalog();
const noFilters = { hidden: [], tags: [] };

describe('dayKey', () => {
  it('uses the calendar day of the given time zone', () => {
    const instant = new Date('2026-10-13T23:30:00Z');
    expect(dayKey(instant, 'UTC')).toBe('2026-10-13');
    expect(dayKey(instant, 'Europe/Warsaw')).toBe('2026-10-14');
  });
});

describe('quoteOfTheDay', () => {
  it('picks the same card all day and varies across days', () => {
    const first = quoteOfTheDay(cards, noFilters, '2026-10-13');
    expect(quoteOfTheDay(cards, noFilters, '2026-10-13')).toBe(first);
    const week = new Set(
      Array.from({ length: 14 }, (_, day) =>
        quoteOfTheDay(cards, noFilters, `2026-11-${String(day + 1).padStart(2, '0')}`),
      ),
    );
    expect(week.size).toBeGreaterThan(1);
  });

  it('respects hidden quotes and categories', () => {
    for (let day = 1; day <= 20; day++) {
      const key = `2026-12-${String(day).padStart(2, '0')}`;
      const card = quoteOfTheDay(cards, { hidden: ['beta'], tags: ['productivity'] }, key);
      expect(['gamma', 'epsilon']).toContain(card?.id);
    }
  });

  it('falls back to any visible quote when the categories leave nothing', () => {
    const card = quoteOfTheDay(
      cards,
      { hidden: ['beta', 'gamma', 'epsilon'], tags: ['productivity'] },
      '2026-10-13',
    );
    expect(['alpha', 'delta']).toContain(card?.id);
  });

  it('returns nothing when every quote is hidden', () => {
    const hidden = cards.map((card) => card.id);
    expect(quoteOfTheDay(cards, { hidden, tags: [] }, '2026-10-13')).toBeUndefined();
  });
});

describe('dailyNotification', () => {
  const alpha = cards.find((card) => card.id === 'alpha')!;

  it('titles the notification with the author and adds the translation', () => {
    expect(dailyNotification(alpha, 'pl', 'pl')).toEqual({
      title: 'Marek Aureliusz',
      body: 'Text of alpha.\n\nTekst alfa.',
      quoteId: 'alpha',
    });
  });

  it('leaves the translation out when it is off or missing', () => {
    expect(dailyNotification(alpha, 'en', undefined).body).toBe('Text of alpha.');
    const beta = cards.find((card) => card.id === 'beta')!;
    expect(dailyNotification(beta, 'en', 'pl').body).toBe('Text of beta.');
  });
});

describe('parseSharedPrefs', () => {
  it('reads valid values and falls back for the rest', () => {
    expect(
      parseSharedPrefs({
        language: 'pl',
        translation: false,
        hidden: ['a', 1],
        tags: 'x',
        hour: 7,
      }),
    ).toEqual({ language: 'pl', translation: false, hidden: ['a'], tags: [], hour: 7 });
    expect(parseSharedPrefs(null)).toEqual({
      language: 'en',
      translation: true,
      hidden: [],
      tags: [],
      hour: 8,
    });
    expect(parseSharedPrefs({ hour: 24 }).hour).toBe(8);
  });
});
