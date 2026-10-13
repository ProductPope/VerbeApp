import { describe, expect, it } from 'vitest';
import { checkIntegrity, isPublicDomainBy } from '../src/data/integrity.js';
import type { Dataset, Quote } from '../src/data/model.js';
import { validDataset } from './fixtures.js';

const YEAR = 2026;

function messages(dataset: Dataset): string[] {
  return checkIntegrity(dataset, YEAR).map((problem) => problem.message);
}

function firstQuote(dataset: Dataset): Quote {
  const quote = dataset.collections[0]?.collection.quotes[0];
  if (!quote) throw new Error('fixture has no quote');
  return quote;
}

describe('isPublicDomainBy', () => {
  it('frees a work on 1 January, 71 years after the death year', () => {
    expect(isPublicDomainBy(1955, 2026)).toBe(true);
    expect(isPublicDomainBy(1956, 2026)).toBe(false);
  });
});

describe('checkIntegrity', () => {
  it('accepts a consistent dataset', () => {
    expect(messages(validDataset())).toEqual([]);
  });

  it('defaults to the current year', () => {
    expect(checkIntegrity(validDataset())).toEqual([]);
  });

  it('reports duplicate ids for tags, authors and sources', () => {
    const dataset = validDataset();
    dataset.tags.push({ ...dataset.tags[0]! });
    dataset.authors.push({ ...dataset.authors[0]! });
    dataset.sources.push({ ...dataset.sources[0]! });
    expect(messages(dataset)).toEqual(
      expect.arrayContaining([
        'duplicate tag id "philosophy"',
        'duplicate author id "marcus-aurelius"',
        'duplicate source id "meditations"',
      ]),
    );
  });

  it('reports an author born after their death', () => {
    const dataset = validDataset();
    dataset.authors[0]!.born = 200;
    expect(messages(dataset)).toContain('author "marcus-aurelius" is born after they died');
  });

  it('reports a source whose author is unknown', () => {
    const dataset = validDataset();
    dataset.sources[0]!.author = 'nobody';
    expect(messages(dataset)).toContain('source "meditations" refers to unknown author "nobody"');
  });

  it('rejects works whose author or translator died within the copyright term', () => {
    const dataset = validDataset();
    dataset.authors[0]!.died = 1970;
    dataset.authors[0]!.born = 1872;
    dataset.sources[0]!.translator = { name: 'Recent Translator', died: 1990 };
    expect(messages(dataset)).toEqual([
      'source "meditations": its author died in 1970, so the work is not yet in the public domain everywhere',
      'source "meditations": its translator died in 1990, so the translation is not yet in the public domain everywhere',
    ]);
  });

  it('accepts an author without a known death year', () => {
    const dataset = validDataset();
    delete dataset.authors[0]!.died;
    delete dataset.authors[0]!.born;
    expect(messages(dataset)).toEqual([]);
  });

  it('reports duplicate quote ids and texts across collections', () => {
    const dataset = validDataset();
    dataset.collections.push({
      path: 'data/quotes/meditations.json',
      collection: {
        source: 'meditations',
        quotes: [{ ...firstQuote(dataset), text: 'LOSS is nothing else than change.' }],
      },
    });
    expect(messages(dataset)).toEqual(
      expect.arrayContaining([
        'more than one collection for source "meditations"',
        'duplicate quote id "loss-nothing-else-change"',
        'duplicate quote text "loss is nothing else than change."',
      ]),
    );
  });

  it('requires the file name to match the source id', () => {
    const dataset = validDataset();
    dataset.collections[0]!.path = 'data/quotes/other.json';
    expect(messages(dataset)).toContain('file name must match its source id "meditations"');
  });

  it('reports collections for unknown sources and quotes with unknown tags', () => {
    const dataset = validDataset();
    dataset.collections[0]!.path = 'data/quotes/missing.json';
    dataset.collections[0]!.collection.source = 'missing';
    firstQuote(dataset).tags = ['philosophy', 'cooking'];
    expect(messages(dataset)).toEqual([
      'unknown source "missing"',
      'quote "loss-nothing-else-change" has unknown tag "cooking"',
    ]);
  });
});
