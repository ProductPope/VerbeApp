import { describe, expect, it } from 'vitest';
import { checkIntegrity } from '../src/data/integrity.js';
import { loadDataset } from '../scripts/lib/dataset.js';

describe('the published dataset in data/', () => {
  it('passes schema validation and integrity checks', async () => {
    const { dataset, problems } = await loadDataset();
    expect([...problems, ...checkIntegrity(dataset)]).toEqual([]);
  });

  it('gives every tag at least one quote', async () => {
    const { dataset } = await loadDataset();
    const used = new Set(
      dataset.collections.flatMap((file) => file.collection.quotes.flatMap((quote) => quote.tags)),
    );
    expect(dataset.tags.map((tag) => tag.id).filter((id) => !used.has(id))).toEqual([]);
  });
});
