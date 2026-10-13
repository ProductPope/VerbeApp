import type { Dataset } from './model.js';
import { normalizeForMatch } from '../sources/text.js';

/**
 * Copyright lasts 70 years after the author's death in the EU (including
 * Poland) and many other countries; a work enters the public domain on
 * 1 January of the following year.
 */
export const COPYRIGHT_TERM_YEARS = 70;

export function isPublicDomainBy(died: number, currentYear: number): boolean {
  return died + COPYRIGHT_TERM_YEARS < currentYear;
}

export interface Problem {
  file: string;
  message: string;
}

function duplicates<T>(items: T[], key: (item: T) => string): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function baseName(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.json$/, '');
}

/**
 * Checks the rules a JSON Schema cannot express: unique ids across files,
 * references that resolve, and one collection file per source.
 */
export function checkIntegrity(
  dataset: Dataset,
  currentYear = new Date().getFullYear(),
): Problem[] {
  const problems: Problem[] = [];
  const tagIds = new Set(dataset.tags.map((tag) => tag.id));
  const authorIds = new Set(dataset.authors.map((author) => author.id));
  const sourceIds = new Set(dataset.sources.map((source) => source.id));

  for (const id of duplicates(dataset.tags, (tag) => tag.id)) {
    problems.push({ file: 'data/tags.json', message: `duplicate tag id "${id}"` });
  }
  for (const id of duplicates(dataset.authors, (author) => author.id)) {
    problems.push({ file: 'data/authors.json', message: `duplicate author id "${id}"` });
  }
  for (const id of duplicates(dataset.sources, (source) => source.id)) {
    problems.push({ file: 'data/sources.json', message: `duplicate source id "${id}"` });
  }
  for (const author of dataset.authors) {
    if (author.born !== undefined && author.died !== undefined && author.born > author.died) {
      problems.push({
        file: 'data/authors.json',
        message: `author "${author.id}" is born after they died`,
      });
    }
  }
  const authorsById = new Map(dataset.authors.map((author) => [author.id, author]));
  for (const source of dataset.sources) {
    const died = authorsById.get(source.author)?.died;
    if (died !== undefined && !isPublicDomainBy(died, currentYear)) {
      problems.push({
        file: 'data/sources.json',
        message: `source "${source.id}": its author died in ${String(died)}, so the work is not yet in the public domain everywhere`,
      });
    }
    if (source.translator && !isPublicDomainBy(source.translator.died, currentYear)) {
      problems.push({
        file: 'data/sources.json',
        message: `source "${source.id}": its translator died in ${String(source.translator.died)}, so the translation is not yet in the public domain everywhere`,
      });
    }
    if (!authorIds.has(source.author)) {
      problems.push({
        file: 'data/sources.json',
        message: `source "${source.id}" refers to unknown author "${source.author}"`,
      });
    }
  }

  for (const id of duplicates(dataset.collections, (file) => file.collection.source)) {
    problems.push({ file: 'data/quotes', message: `more than one collection for source "${id}"` });
  }

  const allQuotes = dataset.collections.flatMap(({ path, collection }) =>
    collection.quotes.map((quote) => ({ path, quote })),
  );
  for (const id of duplicates(allQuotes, ({ quote }) => quote.id)) {
    problems.push({ file: 'data/quotes', message: `duplicate quote id "${id}"` });
  }
  for (const text of duplicates(allQuotes, ({ quote }) => normalizeForMatch(quote.text))) {
    problems.push({ file: 'data/quotes', message: `duplicate quote text "${text}"` });
  }

  for (const { path, collection } of dataset.collections) {
    if (baseName(path) !== collection.source) {
      problems.push({
        file: path,
        message: `file name must match its source id "${collection.source}"`,
      });
    }
    if (!sourceIds.has(collection.source)) {
      problems.push({ file: path, message: `unknown source "${collection.source}"` });
    }
    for (const quote of collection.quotes) {
      for (const tag of quote.tags) {
        if (!tagIds.has(tag)) {
          problems.push({ file: path, message: `quote "${quote.id}" has unknown tag "${tag}"` });
        }
      }
    }
  }

  return problems;
}
