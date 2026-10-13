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
  edition: StandardEbooksEdition | GutenbergEdition;
}

/** Verified against the chapter files in the edition's Git repository. */
export interface StandardEbooksEdition {
  publisher: 'Standard Ebooks';
  url: string;
  repository: string;
}

/** Verified against the edition's plain-text file. */
export interface GutenbergEdition {
  publisher: 'Project Gutenberg';
  url: string;
  text: string;
}

export interface Translation {
  text: string;
  translator: string;
  license: 'public-domain' | 'CC0-1.0';
  /** ai-draft: machine-assisted and not checked by a person yet. */
  status: 'ai-draft' | 'reviewed';
}

export interface Quote {
  id: string;
  text: string;
  /** Chapter file in a Standard Ebooks edition; absent for plain-text editions. */
  section?: string;
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

/** An original saying or tip written for Verbe, not a quote from literature. */
export interface CommunityItem {
  id: string;
  text: string;
  tags: string[];
  license: 'CC0-1.0';
  inspiredBy?: { url: string; title?: string };
  translations?: Record<LanguageCode, Translation>;
}

export interface CommunityFile {
  path: string;
  collection: { contributor: string; items: CommunityItem[] };
}

export interface Dataset {
  tags: Tag[];
  authors: Author[];
  sources: Source[];
  collections: CollectionFile[];
  community: CommunityFile[];
}
