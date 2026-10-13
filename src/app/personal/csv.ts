import type { Tag } from '../../data/model.js';
import type { Language } from '../i18n/strings.js';
import {
  cleanDraft,
  MAX_TEXT_LENGTH,
  type PersonalQuote,
  type PersonalQuoteDraft,
} from './personal.js';

/** Largest CSV file the app reads; far more than thousands of quotes need. */
export const MAX_CSV_BYTES = 1_000_000;
/** Most quotes one CSV file may add. */
export const MAX_CSV_ROWS = 2_000;
/** Separates several categories inside one cell. */
export const CATEGORY_SEPARATOR = '|';

type Column = 'text' | 'author' | 'source' | 'language' | 'categories';

/** Accepted header names, in English and Polish, compared without case or accents. */
const HEADERS: Record<string, Column> = {
  text: 'text',
  quote: 'text',
  tekst: 'text',
  cytat: 'text',
  author: 'author',
  autor: 'author',
  source: 'source',
  book: 'source',
  zrodlo: 'source',
  ksiazka: 'source',
  language: 'language',
  jezyk: 'language',
  categories: 'categories',
  category: 'categories',
  kategorie: 'categories',
  kategoria: 'categories',
};

const LANGUAGES: Record<string, Language> = {
  en: 'en',
  english: 'en',
  angielski: 'en',
  pl: 'pl',
  polish: 'pl',
  polski: 'pl',
};

/** Lower case without diacritics, so "Źródło" matches "zrodlo" and "Uważność" "uwaznosc". */
function key(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l');
}

/** Problems that stop the whole file from being read. */
export type CsvFileError = 'empty' | 'noTextColumn' | 'unclosedQuote' | 'tooLarge' | 'tooManyRows';

/** Problems with one row; the other rows can still be imported. */
export type CsvRowError =
  | { kind: 'noText' }
  | { kind: 'textTooLong' }
  | { kind: 'unknownLanguage'; value: string }
  | { kind: 'unknownCategory'; value: string };

export interface CsvRowProblem {
  /** Line number as a spreadsheet shows it: the header is row 1. */
  row: number;
  error: CsvRowError;
}

export type CsvImport =
  | { ok: false; error: CsvFileError }
  | {
      ok: true;
      /** Quotes ready to add, in file order. */
      drafts: PersonalQuoteDraft[];
      problems: CsvRowProblem[];
      /** Rows skipped because the same text is already saved or appears earlier in the file. */
      duplicates: number;
    };

/**
 * Splits CSV text into rows of cells (RFC 4180): quoted cells may hold the
 * separator, line breaks and doubled quotes. Returns undefined when a quoted
 * cell never closes.
 */
export function parseCsv(input: string, separator: string): string[][] | undefined {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;
  for (; i < input.length;) {
    const char = input.charAt(i);
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        cell += char;
      }
      i += 1;
      continue;
    }
    if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && input[i + 1] === '\n') i += 1;
    } else {
      cell += char;
    }
    i += 1;
  }
  if (quoted) return undefined;
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Spreadsheets in Polish save CSV with semicolons, in English with commas. */
export function detectSeparator(headerLine: string): ',' | ';' | '\t' {
  const counts = ([',', ';', '\t'] as const).map(
    (sep) => [sep, headerLine.split(sep).length] as const,
  );
  return counts.reduce((best, next) => (next[1] > best[1] ? next : best))[0];
}

function categoryIds(tags: readonly Tag[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const tag of tags) {
    ids.set(key(tag.id), tag.id);
    for (const label of Object.values(tag.label)) ids.set(key(label), tag.id);
  }
  return ids;
}

/**
 * Reads a CSV file of the reader's own quotes. A header row names the
 * columns; only the quote text is required. Each row is checked on its own,
 * so one mistake never blocks the rest of the file.
 */
export function readQuotesCsv(
  input: string,
  existing: readonly PersonalQuote[],
  tags: readonly Tag[],
): CsvImport {
  if (input.length > MAX_CSV_BYTES) return { ok: false, error: 'tooLarge' };
  const text = input.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  if (firstLine.trim() === '') return { ok: false, error: 'empty' };

  const rows = parseCsv(text, detectSeparator(firstLine));
  if (!rows) return { ok: false, error: 'unclosedQuote' };
  const [header = [], ...body] = rows;
  const columns = header.map((name) => HEADERS[key(name)]);
  if (!columns.includes('text')) return { ok: false, error: 'noTextColumn' };

  const filled = body
    .map((cells, index) => ({ cells, row: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ''));
  if (filled.length > MAX_CSV_ROWS) return { ok: false, error: 'tooManyRows' };

  const knownTags = tags.map((tag) => tag.id);
  const tagIds = categoryIds(tags);
  const seen = new Set(existing.map((quote) => quote.text));
  const drafts: PersonalQuoteDraft[] = [];
  const problems: CsvRowProblem[] = [];
  let duplicates = 0;

  for (const { cells, row } of filled) {
    const value = (column: Column) => {
      const index = columns.indexOf(column);
      return index < 0 ? '' : (cells[index] ?? '').trim();
    };
    const error = rowError(value, tagIds);
    if (error) {
      problems.push({ row, error });
      continue;
    }
    const language = LANGUAGES[key(value('language'))] ?? 'en';
    const categories = value('categories')
      .split(CATEGORY_SEPARATOR)
      .map((name) => name.trim())
      .filter((name) => name !== '')
      .flatMap((name) => tagIds.get(key(name)) ?? []);
    const draft = cleanDraft(
      {
        text: value('text'),
        author: value('author'),
        source: value('source'),
        language,
        tags: [...new Set(categories)],
      },
      knownTags,
    );
    if (seen.has(draft.text)) {
      duplicates += 1;
      continue;
    }
    seen.add(draft.text);
    drafts.push(draft);
  }
  return { ok: true, drafts, problems, duplicates };
}

function rowError(
  value: (column: Column) => string,
  tagIds: Map<string, string>,
): CsvRowError | undefined {
  const text = value('text');
  if (text === '') return { kind: 'noText' };
  if (text.length > MAX_TEXT_LENGTH) return { kind: 'textTooLong' };
  const language = value('language');
  if (language !== '' && LANGUAGES[key(language)] === undefined) {
    return { kind: 'unknownLanguage', value: language };
  }
  for (const name of value('categories').split(CATEGORY_SEPARATOR)) {
    if (name.trim() !== '' && !tagIds.has(key(name))) {
      return { kind: 'unknownCategory', value: name.trim() };
    }
  }
  return undefined;
}

function csvCell(value: string): string {
  return /[",;\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * A ready-to-fill CSV with the header and two example rows. It starts with a
 * byte order mark so that Excel opens it as UTF-8 and keeps Polish letters.
 */
export function csvTemplate(tags: readonly Tag[]): string {
  const rows = [
    ['text', 'author', 'source', 'language', 'categories'],
    [
      'We suffer more often in imagination than in reality.',
      'Seneca',
      'Letters to Lucilius, 13',
      'en',
      ['philosophy', 'resilience']
        .filter((id) => tags.some((tag) => tag.id === id))
        .join(CATEGORY_SEPARATOR),
    ],
    ['Nie wszystko złoto, co się świeci.', '', '', 'pl', ''],
  ];
  return `\uFEFF${rows.map((cells) => cells.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
