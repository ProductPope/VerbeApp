import { buildCatalog } from '../../src/app/catalog/catalog.js';
import { checkIntegrity } from '../../src/data/integrity.js';
import { loadDataset } from './dataset.js';

/** File name of the catalogue the app and its service worker load at runtime. */
export const CATALOG_FILE = 'catalog.json';

/**
 * Builds the catalogue the app shows from data/, as JSON. Fails on any data
 * problem, so a broken dataset can never be deployed.
 */
export async function catalogJson(dataDir?: string): Promise<string> {
  const { dataset, problems } = await loadDataset(dataDir);
  problems.push(...checkIntegrity(dataset));
  if (problems.length > 0) {
    const list = problems.map(({ file, message }) => `${file}: ${message}`).join('\n');
    throw new Error(`The dataset has problems; run npm run data:validate.\n${list}`);
  }
  return JSON.stringify(buildCatalog(dataset));
}
