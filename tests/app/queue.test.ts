import { describe, expect, it } from 'vitest';
import {
  eligibleCards,
  nextBatch,
  nextRound,
  readingTimeMs,
  seededRandom,
  shuffle,
} from '../../src/app/feed/queue.js';
import { card } from './fixtures.js';

describe('seededRandom and shuffle', () => {
  it('are deterministic for a seed and keep every item', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const first = shuffle(items, seededRandom(42));
    expect(shuffle(items, seededRandom(42))).toEqual(first);
    expect([...first].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('produce numbers in [0, 1)', () => {
    const random = seededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('eligibleCards', () => {
  const cards = [card('a', ['philosophy']), card('b', ['productivity']), card('c', ['philosophy'])];

  it('drops hidden cards', () => {
    expect(eligibleCards(cards, ['b'], []).map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('keeps cards in any selected category, or all when none is selected', () => {
    expect(eligibleCards(cards, [], ['productivity']).map((c) => c.id)).toEqual(['b']);
    expect(eligibleCards(cards, [], []).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('nextRound', () => {
  it('never repeats the previous card straight away', () => {
    const cards = [card('a', []), card('b', []), card('c', [])];
    for (let seed = 0; seed < 50; seed++) {
      const random = seededRandom(seed);
      const first = nextRound(cards, [], random);
      const second = nextRound(cards, first, random);
      expect(second[0]?.id).not.toBe(first.at(-1)?.id);
      expect(second).toHaveLength(3);
    }
  });

  it('handles a single card', () => {
    const only = [card('a', [])];
    expect(nextRound(only, only, seededRandom(1))).toEqual(only);
  });
});

describe('readingTimeMs', () => {
  it('gives short quotes at least 8 seconds and caps long ones at 30', () => {
    expect(readingTimeMs('Loss is change.')).toBe(8_000);
    expect(readingTimeMs('word '.repeat(400))).toBe(30_000);
  });

  it('grows with length in between', () => {
    expect(readingTimeMs('word '.repeat(60))).toBeGreaterThan(readingTimeMs('word '.repeat(40)));
  });
});

describe('nextBatch', () => {
  const cards = 'abcdefghij'.split('').map((id) => card(id, []));

  it('shows every card once per round, a few at a time', () => {
    const random = seededRandom(3);
    const round: typeof cards = [];
    while (round.length < cards.length) {
      const { cards: batch, newRound } = nextBatch(cards, round, round, random, 4);
      expect(newRound).toBe(round.length === 0);
      expect(batch.length).toBeLessThanOrEqual(4);
      round.push(...batch);
    }
    expect(round.map((c) => c.id).sort()).toEqual(cards.map((c) => c.id));
    const next = nextBatch(cards, round, round, random, 4);
    expect(next.newRound).toBe(true);
    expect(next.cards[0]?.id).not.toBe(round.at(-1)?.id);
  });

  it('skips cards that are no longer eligible', () => {
    const { cards: batch } = nextBatch(
      cards.slice(0, 3),
      [cards[0]!],
      [cards[0]!],
      seededRandom(1),
      5,
    );
    expect(batch.map((c) => c.id).sort()).toEqual(['b', 'c']);
  });
});
