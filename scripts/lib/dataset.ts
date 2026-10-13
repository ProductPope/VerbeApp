import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Author, CollectionFile, Dataset, Source, Tag } from '../../src/data/model.js';
import { validateAgainstSchema, type SchemaName } from '../../src/data/validate.js';
import type { Problem } from '../../src/data/integrity.js';

export const ROOT = join(import.meta.dirname, '..', '..');
export const DATA_DIR = join(ROOT, 'data');

interface LoadResult {
  dataset: Dataset;
  problems: Problem[];
}

async function readJson(path: string, problems: Problem[]): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch (error) {
    problems.push({ file: relative(ROOT, path), message: `cannot read JSON: ${String(error)}` });
    return undefined;
  }
}

async function readValidated<T>(path: string, schema: SchemaName, problems: Problem[]) {
  const data = await readJson(path, problems);
  if (data === undefined) return undefined;
  const errors = validateAgainstSchema(schema, data);
  for (const message of errors) problems.push({ file: relative(ROOT, path), message });
  return errors.length === 0 ? (data as T) : undefined;
}

/** Reads every data file, validating each one against its JSON Schema. */
export async function loadDataset(dataDir = DATA_DIR): Promise<LoadResult> {
  const problems: Problem[] = [];
  const tags = await readValidated<{ tags: Tag[] }>(join(dataDir, 'tags.json'), 'tags', problems);
  const authors = await readValidated<{ authors: Author[] }>(
    join(dataDir, 'authors.json'),
    'authors',
    problems,
  );
  const sources = await readValidated<{ sources: Source[] }>(
    join(dataDir, 'sources.json'),
    'sources',
    problems,
  );

  const quotesDir = join(dataDir, 'quotes');
  const files = (await readdir(quotesDir)).filter((name) => name.endsWith('.json')).sort();
  const collections: CollectionFile[] = [];
  for (const name of files) {
    const path = join(quotesDir, name);
    const collection = await readValidated<CollectionFile['collection']>(
      path,
      'quote-collection',
      problems,
    );
    if (collection) collections.push({ path: relative(ROOT, path), collection });
  }

  return {
    dataset: {
      tags: tags?.tags ?? [],
      authors: authors?.authors ?? [],
      sources: sources?.sources ?? [],
      collections,
    },
    problems,
  };
}

export function printProblems(problems: Problem[]): void {
  for (const { file, message } of problems) console.error(`✗ ${file}: ${message}`);
}
