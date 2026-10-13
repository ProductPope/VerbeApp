import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Source } from '../../src/data/model.js';
import { xhtmlToText } from '../../src/sources/text.js';
import { ROOT } from './dataset.js';

const run = promisify(execFile);
const CACHE_DIR = join(ROOT, '.cache', 'editions');

/** Shallow-clones a source's edition into .cache/editions, once. */
export async function fetchEdition(source: Source): Promise<string> {
  const dir = join(CACHE_DIR, source.id);
  if (!existsSync(dir)) {
    await run('git', ['clone', '--quiet', '--depth', '1', source.edition.repository, dir]);
  }
  return dir;
}

/** Plain text of one chapter file, or undefined when the edition has no such section. */
export async function readSection(
  editionDir: string,
  section: string,
): Promise<string | undefined> {
  const path = join(editionDir, 'src', 'epub', 'text', `${section}.xhtml`);
  if (!existsSync(path)) return undefined;
  return xhtmlToText(await readFile(path, 'utf8'));
}
