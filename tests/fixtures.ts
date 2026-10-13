import type { Dataset } from '../src/data/model.js';

/** A small, valid dataset; tests copy it and break one rule at a time. */
export function validDataset(): Dataset {
  return {
    tags: [
      {
        id: 'philosophy',
        label: { en: 'Philosophy', pl: 'Filozofia' },
        description: { en: 'About wisdom.' },
      },
    ],
    authors: [{ id: 'marcus-aurelius', name: { en: 'Marcus Aurelius' }, born: 121, died: 180 }],
    sources: [
      {
        id: 'meditations',
        title: 'Meditations',
        author: 'marcus-aurelius',
        translator: { name: 'George Long', died: 1879 },
        language: 'en',
        license: 'public-domain',
        edition: {
          publisher: 'Standard Ebooks',
          url: 'https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long',
          repository: 'https://github.com/standardebooks/marcus-aurelius_meditations_george-long',
        },
      },
    ],
    collections: [
      {
        path: 'data/quotes/meditations.json',
        collection: {
          source: 'meditations',
          quotes: [
            {
              id: 'loss-nothing-else-change',
              text: 'Loss is nothing else than change.',
              section: 'book-9',
              locator: 'Book IX',
              tags: ['philosophy'],
            },
          ],
        },
      },
    ],
  };
}
