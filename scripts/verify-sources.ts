/**
 * Checks that every quote appears word for word in the section of the
 * edition it cites, and that no ellipsis hides a long passage or the real
 * speaker. Needs network access to download the editions; they are
 * cached in .cache/editions. Community sayings are original and not checked.
 *
 * Usage: npm run data:verify [-- <source-id> ...]
 */
import { loadDataset, printProblems } from './lib/dataset.js';
import { openEdition } from './lib/editions.js';
import { findQuote, hidesAttribution, MAX_OMISSION } from '../src/sources/text.js';

const only = new Set(process.argv.slice(2));
const { dataset, problems } = await loadDataset();
const sources = new Map(dataset.sources.map((source) => [source.id, source]));
let checked = 0;

for (const { path, collection } of dataset.collections) {
  if (only.size > 0 && !only.has(collection.source)) continue;
  const source = sources.get(collection.source);
  if (!source) continue;
  const edition = await openEdition(source);

  for (const quote of collection.quotes) {
    checked++;
    const where = quote.section ?? 'the edition';
    const text = await edition.text(quote.section);
    if (text === undefined) {
      problems.push({ file: path, message: `quote "${quote.id}": section "${where}" not found` });
    } else {
      const omissions = findQuote(text, quote.text);
      if (omissions === undefined) {
        problems.push({
          file: path,
          message: `quote "${quote.id}" not found in ${where} (an ellipsis may leave out at most ${String(MAX_OMISSION)} characters)`,
        });
      } else if (omissions.some(hidesAttribution)) {
        problems.push({
          file: path,
          message: `quote "${quote.id}": the words left out name another speaker, so the quote is not the author's own`,
        });
      }
    }
  }
}

if (problems.length > 0) {
  printProblems(problems);
  console.error(`\n${String(problems.length)} of ${String(checked)} quote(s) failed verification.`);
  process.exit(1);
}
console.log(`✓ ${String(checked)} quotes match their source texts word for word.`);
