import type { Card, Catalog } from '../../src/app/catalog/catalog.js';

export function card(id: string, tags: string[], overrides: Partial<Card> = {}): Card {
  return {
    id,
    kind: 'quote',
    text: `Text of ${id}.`,
    translations: {},
    draftTranslations: [],
    tags,
    author: { en: 'Marcus Aurelius', pl: 'Marek Aureliusz' },
    work: 'Meditations',
    locator: 'Book IV',
    link: 'https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long/text/book-4',
    ...overrides,
  };
}

export function testCatalog(): Catalog {
  return {
    tags: [
      { id: 'philosophy', label: { en: 'Philosophy', pl: 'Filozofia' }, description: { en: 'P' } },
      {
        id: 'productivity',
        label: { en: 'Productivity', pl: 'Produktywność' },
        description: { en: 'R' },
      },
    ],
    cards: [
      card('alpha', ['philosophy'], {
        translations: { pl: 'Tekst alfa.' },
        draftTranslations: ['pl'],
      }),
      card('gamma', ['philosophy', 'productivity'], { translations: { pl: 'Tekst gamma.' } }),
      card('beta', ['productivity']),
      card('delta', ['philosophy']),
      card('epsilon', ['productivity'], {
        kind: 'community',
        author: { en: 'Marcin' },
        work: '',
        locator: '',
        link: 'https://www.reddit.com/r/LifeProTips/',
      }),
    ],
  };
}
