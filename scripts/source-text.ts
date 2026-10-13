/**
 * Prints the plain text of a source, to help contributors find and copy
 * quotes exactly.
 *
 * Usage: npm run data:text -- <source-id> [section]
 *        (for a chaptered edition without a section, lists the sections)
 */
import { loadDataset } from './lib/dataset.js';
import { openEdition } from './lib/editions.js';

const [sourceId, section] = process.argv.slice(2);
const { dataset } = await loadDataset();
const source = dataset.sources.find((candidate) => candidate.id === sourceId);

if (!source) {
  console.error(`Usage: npm run data:text -- <source-id> [section]`);
  console.error(`Known sources: ${dataset.sources.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

const edition = await openEdition(source);
const sections = await edition.sections();
if (section === undefined && sections.length > 0) {
  console.log(sections.join('\n'));
} else {
  const text = await edition.text(section);
  if (text === undefined) {
    console.error(`No section "${section ?? ''}" in ${source.id}.`);
    process.exit(1);
  }
  console.log(text);
}
