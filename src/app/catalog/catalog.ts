import type { Dataset, LocalizedString, Source, Tag } from '../../data/model.js';

/** One item the feed can show: a sourced quote, a community saying or the reader's own quote. */
export interface Card {
  id: string;
  kind: 'quote' | 'community' | 'personal';
  /** The quote itself, in English unless `language` says otherwise. */
  text: string;
  /** Language of `text` when it is not English; only the reader's own quotes set it. */
  language?: string;
  /** Translations keyed by language code. */
  translations: Record<string, string>;
  /** Languages whose translation is an AI draft no person has checked yet. */
  draftTranslations: string[];
  tags: string[];
  /** Author name per language, the contributor for community sayings, or empty when unknown. */
  author: LocalizedString;
  /** Title of the work; empty for community sayings and unknown sources. */
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

type Translations = Record<string, { text: string; status: string }> | undefined;

function translationTexts(translations: Translations): Record<string, string> {
  return Object.fromEntries(
    Object.entries(translations ?? {}).map(([language, { text }]) => [language, text]),
  );
}

function draftLanguages(translations: Translations): string[] {
  return Object.entries(translations ?? {})
    .filter(([, { status }]) => status !== 'reviewed')
    .map(([language]) => language);
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
        draftTranslations: draftLanguages(quote.translations),
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
        draftTranslations: draftLanguages(item.translations),
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
