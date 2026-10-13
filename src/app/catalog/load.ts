import type { CollectionFile, CommunityFile, Source } from '../../data/model.js';
import authors from '../../../data/authors.json';
import sources from '../../../data/sources.json';
import tags from '../../../data/tags.json';
import { buildCatalog, type Catalog } from './catalog.js';

// Bundled at build time. The data has already passed schema validation in CI.
const quoteFiles = import.meta.glob<CollectionFile['collection']>('../../../data/quotes/*.json', {
  eager: true,
  import: 'default',
});
const communityFiles = import.meta.glob<CommunityFile['collection']>(
  '../../../data/community/*.json',
  { eager: true, import: 'default' },
);

export const catalog: Catalog = buildCatalog({
  tags: tags.tags,
  authors: authors.authors,
  sources: sources.sources as Source[],
  collections: Object.entries(quoteFiles).map(([path, collection]) => ({ path, collection })),
  community: Object.entries(communityFiles).map(([path, collection]) => ({ path, collection })),
});
