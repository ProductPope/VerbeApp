import type { Card } from '../catalog/catalog.js';

/** Deterministic pseudo-random numbers (mulberry32), so tests can fix the order. */
export function seededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function swap(items: unknown[], a: number, b: number) {
  const first = items[a];
  items[a] = items[b];
  items[b] = first;
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    swap(result, i, j);
  }
  return result;
}

/** Cards the feed may show: not hidden, and in a selected category if any are selected. */
export function eligibleCards(
  cards: readonly Card[],
  hidden: readonly string[],
  tags: readonly string[],
) {
  const hiddenIds = new Set(hidden);
  return cards.filter(
    (card) =>
      !hiddenIds.has(card.id) && (tags.length === 0 || card.tags.some((tag) => tags.includes(tag))),
  );
}

/**
 * Appends one more shuffled round of the eligible cards to an endless feed.
 * A round never starts with the card that ended the previous one.
 */
export function nextRound(
  eligible: readonly Card[],
  previous: readonly Card[],
  random: () => number,
): Card[] {
  const round = shuffle(eligible, random);
  const last = previous.at(-1);
  if (round.length > 1 && round[0]?.id === last?.id) {
    swap(round, 0, 1);
  }
  return round;
}

/** How long auto-advance shows a card: enough to read it at a relaxed pace. */
export function readingTimeMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const atRelaxedPace = (words / 180) * 60_000 * 2;
  return Math.round(Math.min(30_000, Math.max(8_000, atRelaxedPace + 3_000)));
}
