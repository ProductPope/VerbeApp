import type { Dataset, LocalizedString, Source, Tag } from '../../data/model.js';

/** One item the feed can show: a sourced quote or a community saying. */
export interface Card {
  id: string;
  kind: 'quote' | 'community';
  /** English text, always present. */
  text: string;
  /** Translations keyed by language code. */
  translations: Record<string, string>;
  tags: string[];
  /** Author name per language, or the contributor for community sayings. */
  author: LocalizedString;
  /** Title of the work; empty for community sayings. */
  work: string;
  locator: string;
  /** Where to read the quote in context, or what inspired a community saying. */
  link?: string;
}

export interface Catalog {
  cards: Card[];
  tags: Tag[];
}

function chapterUrl(source: Source, section: string | undefined): string {
  const { edition } = source;
  if (edition.publisher === 'Standard Ebooks' && section !== undefined) {
    return `${edition.url}/text/${section}`;
  }
  return edition.url;
}

function translationTexts(
  translations: Record<string, { text: string }> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(translations ?? {}).map(([language, { text }]) => [language, text]),
  );
}

/** Flattens a validated dataset into the cards the app displays. */
export function buildCatalog(dataset: Dataset): Catalog {
  const sources = new Map(dataset.sources.map((source) => [source.id, source]));
  const authors = new Map(dataset.authors.map((author) => [author.id, author]));
  const cards: Card[] = [];

  for (const { collection } of dataset.collections) {
    const source = sources.get(collection.source);
    if (!source) continue;
    const author = authors.get(source.author)?.name ?? { en: source.author };
    for (const quote of collection.quotes) {
      cards.push({
        id: quote.id,
        kind: 'quote',
        text: quote.text,
        translations: translationTexts(quote.translations),
        tags: quote.tags,
        author,
        work: source.title,
        locator: quote.locator,
        link: chapterUrl(source, quote.section),
      });
    }
  }

  for (const { collection } of dataset.community) {
    for (const item of collection.items) {
      cards.push({
        id: item.id,
        kind: 'community',
        text: item.text,
        translations: translationTexts(item.translations),
        tags: item.tags,
        author: { en: collection.contributor },
        work: '',
        locator: '',
        ...(item.inspiredBy ? { link: item.inspiredBy.url } : {}),
      });
    }
  }

  return { cards, tags: dataset.tags };
}

/** Picks the text for a language, falling back to English. */
export function localized(
  value: Readonly<Record<string, string | undefined>>,
  language: string,
): string {
  return value[language] ?? value.en ?? '';
}
