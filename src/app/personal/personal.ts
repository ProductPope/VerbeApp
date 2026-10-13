import type { Card } from '../catalog/catalog.js';
import { isLanguage, type Language } from '../i18n/strings.js';
import { createLocalStore, type LocalStore } from '../storage/local-store.js';

/** A quote the reader added themselves. It stays on this device. */
export interface PersonalQuote {
  /** Always starts with `mine-`, so it never collides with the public dataset. */
  id: string;
  text: string;
  /** Who said or wrote it; empty when unknown. */
  author: string;
  /** Book, page or other place it came from; empty when unknown. */
  source: string;
  /** Language the text is written in. */
  language: Language;
  tags: string[];
  /** When it was added, as an ISO 8601 timestamp. */
  added: string;
}

/** What the add and edit form collects. */
export type PersonalQuoteDraft = Pick<
  PersonalQuote,
  'text' | 'author' | 'source' | 'language' | 'tags'
>;

export const PERSONAL_STORAGE_KEY = 'verbeapp:personal-quotes:v1';
export const ID_PREFIX = 'mine-';
export const MAX_TEXT_LENGTH = 1000;
export const MAX_FIELD_LENGTH = 200;

const BACKUP_FORMAT = 'verbeapp-personal-quotes';
const BACKUP_VERSION = 1;

function stringOf(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

/** One stored or imported quote, or undefined when it is not usable. */
export function parsePersonalQuote(value: unknown): PersonalQuote | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const data = value as Record<string, unknown>;
  const text = stringOf(data.text, MAX_TEXT_LENGTH);
  if (typeof data.id !== 'string' || !data.id.startsWith(ID_PREFIX) || text === '') {
    return undefined;
  }
  const added = typeof data.added === 'string' && !Number.isNaN(Date.parse(data.added));
  return {
    id: data.id,
    text,
    author: stringOf(data.author, MAX_FIELD_LENGTH),
    source: stringOf(data.source, MAX_FIELD_LENGTH),
    language: isLanguage(data.language) ? data.language : 'en',
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    added: added ? (data.added as string) : new Date(0).toISOString(),
  };
}

function parseList(value: unknown): PersonalQuote[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const quotes: PersonalQuote[] = [];
  for (const item of value) {
    const quote = parsePersonalQuote(item);
    if (quote && !seen.has(quote.id)) {
      seen.add(quote.id);
      quotes.push(quote);
    }
  }
  return quotes;
}

/** Reads stored quotes, dropping anything malformed rather than failing. */
export function parsePersonalQuotes(raw: string | null): PersonalQuote[] {
  if (raw === null) return [];
  try {
    return parseList(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function createPersonalStore(storage: Storage | undefined) {
  return createLocalStore(storage, PERSONAL_STORAGE_KEY, parsePersonalQuotes);
}

export type PersonalStore = LocalStore<PersonalQuote[]>;

export function newPersonalId(randomUUID: () => string = () => crypto.randomUUID()): string {
  return `${ID_PREFIX}${randomUUID()}`;
}

export type DraftError = 'textRequired' | 'textTooLong';

/** Why a draft cannot be saved yet, or undefined when it can. */
export function draftError(draft: PersonalQuoteDraft): DraftError | undefined {
  const text = draft.text.trim();
  if (text === '') return 'textRequired';
  if (text.length > MAX_TEXT_LENGTH) return 'textTooLong';
  return undefined;
}

/** Trims a draft and keeps only categories the app knows. */
export function cleanDraft(
  draft: PersonalQuoteDraft,
  knownTags: readonly string[],
): PersonalQuoteDraft {
  return {
    text: draft.text.trim().replace(/[ \t]+/g, ' '),
    author: draft.author.trim().slice(0, MAX_FIELD_LENGTH),
    source: draft.source.trim().slice(0, MAX_FIELD_LENGTH),
    language: draft.language,
    tags: draft.tags.filter((tag) => knownTags.includes(tag)),
  };
}

/** How a personal quote appears in the feed and the profile. */
export function personalCard(quote: PersonalQuote): Card {
  return {
    id: quote.id,
    kind: 'personal',
    text: quote.text,
    language: quote.language,
    translations: {},
    draftTranslations: [],
    tags: quote.tags,
    author: { en: quote.author },
    work: quote.source,
    locator: '',
  };
}

/** A backup file the reader can keep and import later, on this or another device. */
export function exportPersonalQuotes(quotes: readonly PersonalQuote[]): string {
  return `${JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, quotes }, null, 2)}\n`;
}

export class InvalidBackupError extends Error {
  constructor() {
    super('Not a VerbeApp personal quotes backup');
    this.name = 'InvalidBackupError';
  }
}

/**
 * Adds the quotes from a backup to the existing ones. Quotes already present,
 * by id or by identical text, are skipped, so importing twice changes nothing.
 */
export function importPersonalQuotes(
  json: string,
  existing: readonly PersonalQuote[],
): { quotes: PersonalQuote[]; added: number } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new InvalidBackupError();
  }
  const backup = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  if (backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    throw new InvalidBackupError();
  }
  const ids = new Set(existing.map((quote) => quote.id));
  const texts = new Set(existing.map((quote) => quote.text));
  const fresh = parseList(backup.quotes).filter((quote) => {
    if (ids.has(quote.id) || texts.has(quote.text)) return false;
    ids.add(quote.id);
    texts.add(quote.text);
    return true;
  });
  return { quotes: [...existing, ...fresh], added: fresh.length };
}
