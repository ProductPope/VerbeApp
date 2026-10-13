/**
 * Validates every file in data/ against its JSON Schema and checks
 * cross-file integrity. Runs offline; see verify-sources.ts for the check
 * against the original texts.
 */
import { checkIntegrity } from '../src/data/integrity.js';
import { loadDataset, printProblems } from './lib/dataset.js';

const { dataset, problems } = await loadDataset();
problems.push(...checkIntegrity(dataset));

if (problems.length > 0) {
  printProblems(problems);
  console.error(`\n${String(problems.length)} problem(s) found.`);
  process.exit(1);
}

const quoteCount = dataset.collections.reduce(
  (sum, file) => sum + file.collection.quotes.length,
  0,
);
console.log(
  `✓ ${String(quoteCount)} quotes from ${String(dataset.sources.length)} sources, ${String(dataset.tags.length)} tags: all valid.`,
);
