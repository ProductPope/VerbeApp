import { describe, expect, it } from 'vitest';
import { buildCatalog, localized } from '../../src/app/catalog/catalog.js';
import { catalog } from '../../src/app/catalog/load.js';
import { HABIT_QUOTE_ID } from '../../src/app/components/ReadingStreak.js';
import { validDataset } from '../fixtures.js';

describe('buildCatalog', () => {
  it('links Standard Ebooks quotes to their chapter', () => {
    const [card] = buildCatalog(validDataset()).cards;
    expect(card).toMatchObject({
      id: 'loss-nothing-else-change',
      kind: 'quote',
      author: { en: 'Marcus Aurelius' },
      work: 'Meditations',
      locator: 'Book IX',
      link: 'https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long/text/book-9',
    });
  });

  it('links Gutenberg quotes to the book and keeps translations', () => {
    const dataset = validDataset();
    dataset.sources[0]!.edition = {
      publisher: 'Project Gutenberg',
      url: 'https://www.gutenberg.org/ebooks/2680',
      text: 'https://www.gutenberg.org/cache/epub/2680/pg2680.txt',
    };
    const quote = dataset.collections[0]!.collection.quotes[0]!;
    delete quote.section;
    quote.translations = {
      pl: { text: 'Strata to zmiana.', translator: 'X', license: 'CC0-1.0', status: 'ai-draft' },
    };
    const [card] = buildCatalog(dataset).cards;
    expect(card?.link).toBe('https://www.gutenberg.org/ebooks/2680');
    expect(card?.translations).toEqual({ pl: 'Strata to zmiana.' });
    expect(card?.draftTranslations).toEqual(['pl']);
    quote.translations.pl!.status = 'reviewed';
    expect(buildCatalog(dataset).cards[0]?.draftTranslations).toEqual([]);
  });

  it('skips collections whose source is missing and falls back to the author id', () => {
    const dataset = validDataset();
    dataset.authors = [];
    expect(buildCatalog(dataset).cards[0]?.author).toEqual({ en: 'marcus-aurelius' });
    dataset.sources = [];
    expect(buildCatalog(dataset).cards).toEqual([]);
  });

  it('includes community sayings with their contributor and inspiration', () => {
    const dataset = validDataset();
    dataset.community.push({
      path: 'data/community/marcin.json',
      collection: {
        contributor: 'Marcin',
        items: [
          {
            id: 'two-minute-start',
            text: 'Do only the first two minutes.',
            tags: ['philosophy'],
            license: 'CC0-1.0',
            inspiredBy: { url: 'https://www.reddit.com/r/LifeProTips/' },
          },
          {
            id: 'plain',
            text: 'A saying without a link.',
            tags: ['philosophy'],
            license: 'CC0-1.0',
          },
        ],
      },
    });
    const community = buildCatalog(dataset).cards.filter((c) => c.kind === 'community');
    expect(community.map((c) => [c.id, c.author.en, c.link])).toEqual([
      ['two-minute-start', 'Marcin', 'https://www.reddit.com/r/LifeProTips/'],
      ['plain', 'Marcin', undefined],
    ]);
  });
});

describe('localized', () => {
  it('falls back to English, then to an empty string', () => {
    expect(localized({ en: 'Philosophy', pl: 'Filozofia' }, 'pl')).toBe('Filozofia');
    expect(localized({ en: 'Philosophy' }, 'pl')).toBe('Philosophy');
    expect(localized({}, 'pl')).toBe('');
  });
});

describe('the bundled catalog', () => {
  it('contains every quote in data/, each with a link to its source', () => {
    expect(catalog.cards.length).toBeGreaterThanOrEqual(151);
    const quotes = catalog.cards.filter((c) => c.kind === 'quote');
    expect(quotes.every((c) => c.link?.startsWith('https://'))).toBe(true);
    expect(new Set(catalog.cards.map((c) => c.id)).size).toBe(catalog.cards.length);
  });
});

describe('streak dialog quote', () => {
  it('is in the dataset with a Polish translation', () => {
    const habit = catalog.cards.find((card) => card.id === HABIT_QUOTE_ID);
    expect(habit).toMatchObject({ author: { en: 'Epictetus' }, kind: 'quote' });
    expect(habit?.translations.pl).toBeTruthy();
  });
});
