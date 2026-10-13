import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { GutenbergEdition, Source, StandardEbooksEdition } from '../../src/data/model.js';
import { gutenbergBody, xhtmlToText } from '../../src/sources/text.js';
import { ROOT } from './dataset.js';

const run = promisify(execFile);
const CACHE_DIR = join(ROOT, '.cache', 'editions');

/** The plain text of an edition, looked up by section. */
export interface Edition {
  /** Section names a quote can cite; empty when the edition is one undivided text. */
  sections(): Promise<string[]>;
  /** Text of one section, or of the whole edition when no section is given. */
  text(section?: string): Promise<string | undefined>;
}

async function standardEbooks(id: string, edition: StandardEbooksEdition): Promise<Edition> {
  const dir = join(CACHE_DIR, id);
  if (!existsSync(dir)) {
    await run('git', ['clone', '--quiet', '--depth', '1', edition.repository, dir]);
  }
  const textDir = join(dir, 'src', 'epub', 'text');
  return {
    async sections() {
      const files = await readdir(textDir);
      return files.map((file) => file.replace(/\.xhtml$/, '')).sort();
    },
    async text(section) {
      const path = join(textDir, `${section ?? ''}.xhtml`);
      if (section === undefined || !existsSync(path)) return undefined;
      return xhtmlToText(await readFile(path, 'utf8'));
    },
  };
}

async function gutenberg(id: string, edition: GutenbergEdition): Promise<Edition> {
  const path = join(CACHE_DIR, `${id}.txt`);
  if (!existsSync(path)) {
    const response = await fetch(edition.text);
    if (!response.ok) throw new Error(`${edition.text}: HTTP ${String(response.status)}`);
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path, await response.text());
  }
  const body = gutenbergBody(await readFile(path, 'utf8'));
  return {
    sections: () => Promise.resolve([]),
    text: (section) => Promise.resolve(section === undefined ? body : undefined),
  };
}

/** Downloads a source's edition into .cache/editions, once, and opens it. */
export function openEdition(source: Source): Promise<Edition> {
  return source.edition.publisher === 'Standard Ebooks'
    ? standardEbooks(source.id, source.edition)
    : gutenberg(source.id, source.edition);
}
