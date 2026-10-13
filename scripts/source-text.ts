/**
 * Prints the plain text of a source section, to help contributors find and
 * copy quotes exactly.
 *
 * Usage: npm run data:text -- <source-id> [section]
 *        (without a section, lists the available sections)
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadDataset } from './lib/dataset.js';
import { fetchEdition, readSection } from './lib/editions.js';

const [sourceId, section] = process.argv.slice(2);
const { dataset } = await loadDataset();
const source = dataset.sources.find((candidate) => candidate.id === sourceId);

if (!source) {
  console.error(`Usage: npm run data:text -- <source-id> [section]`);
  console.error(`Known sources: ${dataset.sources.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

const editionDir = await fetchEdition(source);
if (section === undefined) {
  const files = await readdir(join(editionDir, 'src', 'epub', 'text'));
  console.log(files.map((file) => file.replace(/\.xhtml$/, '')).join('\n'));
} else {
  const text = await readSection(editionDir, section);
  if (text === undefined) {
    console.error(`No section "${section}" in ${source.id}.`);
    process.exit(1);
  }
  console.log(text);
}
