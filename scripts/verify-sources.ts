/**
 * Checks that every quote appears word for word in the section of the
 * edition it cites. Needs network access to clone the editions; they are
 * cached in .cache/editions.
 *
 * Usage: npm run data:verify [-- <source-id> ...]
 */
import { loadDataset, printProblems } from './lib/dataset.js';
import { fetchEdition, readSection } from './lib/editions.js';
import { containsQuote } from '../src/sources/text.js';
import type { Problem } from '../src/data/integrity.js';

const only = new Set(process.argv.slice(2));
const { dataset, problems } = await loadDataset();
const sources = new Map(dataset.sources.map((source) => [source.id, source]));
let checked = 0;

for (const { path, collection } of dataset.collections) {
  if (only.size > 0 && !only.has(collection.source)) continue;
  const source = sources.get(collection.source);
  if (!source) continue;
  const editionDir = await fetchEdition(source);
  const sectionCache = new Map<string, string | undefined>();

  for (const quote of collection.quotes) {
    if (!sectionCache.has(quote.section)) {
      sectionCache.set(quote.section, await readSection(editionDir, quote.section));
    }
    const text = sectionCache.get(quote.section);
    const problem: Problem | undefined =
      text === undefined
        ? { file: path, message: `quote "${quote.id}": section "${quote.section}" not found` }
        : containsQuote(text, quote.text)
          ? undefined
          : { file: path, message: `quote "${quote.id}" not found in "${quote.section}"` };
    if (problem) problems.push(problem);
    checked++;
  }
}

if (problems.length > 0) {
  printProblems(problems);
  console.error(`\n${String(problems.length)} of ${String(checked)} quote(s) failed verification.`);
  process.exit(1);
}
console.log(`✓ ${String(checked)} quotes match their source texts word for word.`);
