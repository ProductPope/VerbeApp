import { describe, expect, it } from 'vitest';
import { validateAgainstSchema } from '../src/data/validate.js';
import { validDataset } from './fixtures.js';

describe('JSON Schemas', () => {
  const dataset = validDataset();
  const collection = dataset.collections[0]!.collection;

  it('accept valid files', () => {
    expect(validateAgainstSchema('tags', { tags: dataset.tags })).toEqual([]);
    expect(validateAgainstSchema('authors', { authors: dataset.authors })).toEqual([]);
    expect(validateAgainstSchema('sources', { sources: dataset.sources })).toEqual([]);
    expect(validateAgainstSchema('quote-collection', collection)).toEqual([]);
  });

  it('require English text in localized strings', () => {
    const errors = validateAgainstSchema('tags', {
      tags: [{ id: 'x', label: { pl: 'Tylko po polsku' }, description: { en: 'Text' } }],
    });
    expect(errors).toContain("/tags/0/label must have required property 'en'");
  });

  it('reject ids that are not kebab-case slugs', () => {
    const errors = validateAgainstSchema('quote-collection', {
      ...collection,
      quotes: [{ ...collection.quotes[0], id: 'Not A Slug' }],
    });
    expect(errors.some((error) => error.startsWith('/quotes/0/id'))).toBe(true);
  });

  it('reject quotes too long to read on a phone', () => {
    const errors = validateAgainstSchema('quote-collection', {
      ...collection,
      quotes: [{ ...collection.quotes[0], text: 'word '.repeat(100) }],
    });
    expect(errors).toContain('/quotes/0/text must NOT have more than 400 characters');
  });

  it('reject unknown fields, so typos do not pass silently', () => {
    const errors = validateAgainstSchema('quote-collection', {
      ...collection,
      quotes: [{ ...collection.quotes[0], tag: ['philosophy'] }],
    });
    expect(errors).toContain('/quotes/0 must NOT have additional properties');
  });

  it('accept a Polish translation with attribution and reject one without', () => {
    const translated = {
      ...collection,
      quotes: [
        {
          ...collection.quotes[0],
          translations: {
            pl: {
              text: 'Strata to nic innego jak zmiana.',
              translator: 'VerbeApp contributors',
              license: 'CC0-1.0',
            },
          },
        },
      ],
    };
    expect(validateAgainstSchema('quote-collection', translated)).toEqual([]);

    const unattributed = {
      ...collection,
      quotes: [
        {
          ...collection.quotes[0],
          translations: { pl: { text: 'Strata to nic innego jak zmiana.' } },
        },
      ],
    };
    expect(validateAgainstSchema('quote-collection', unattributed)).toEqual(
      expect.arrayContaining([
        "/quotes/0/translations/pl must have required property 'translator'",
      ]),
    );
  });

  it('only accept public-domain sources from Standard Ebooks', () => {
    const errors = validateAgainstSchema('sources', {
      sources: [{ ...dataset.sources[0], license: 'CC-BY-SA-4.0' }],
    });
    expect(errors).toContain('/sources/0/license must be equal to constant');
  });
});
