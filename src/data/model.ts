/**
 * Types mirroring the JSON Schemas in data/schema. The schemas are the source
 * of truth for the file format; these types describe data that has passed them.
 */

export type LanguageCode = string;

/** Text keyed by language code; English is always present. */
export type LocalizedString = { en: string } & Record<LanguageCode, string>;

export interface Tag {
  id: string;
  label: LocalizedString;
  description: LocalizedString;
}

export interface Author {
  id: string;
  name: LocalizedString;
  born?: number;
  died?: number;
  circa?: boolean;
}

export interface Source {
  id: string;
  title: string;
  author: string;
  translator?: { name: string; died: number };
  language: LanguageCode;
  license: 'public-domain';
  edition: {
    publisher: 'Standard Ebooks';
    url: string;
    repository: string;
  };
}

export interface Translation {
  text: string;
  translator: string;
  license: 'public-domain' | 'CC0-1.0';
}

export interface Quote {
  id: string;
  text: string;
  section: string;
  locator: string;
  tags: string[];
  translations?: Record<LanguageCode, Translation>;
}

export interface QuoteCollection {
  source: string;
  quotes: Quote[];
}

/** One collection file together with the path it was read from. */
export interface CollectionFile {
  path: string;
  collection: QuoteCollection;
}

export interface Dataset {
  tags: Tag[];
  authors: Author[];
  sources: Source[];
  collections: CollectionFile[];
}
