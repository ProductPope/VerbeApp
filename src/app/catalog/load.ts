import type { Catalog } from './catalog.js';

/** Built from data/ at build time; see scripts/lib/catalog-file.ts. */
export const CATALOG_URL = `${import.meta.env.BASE_URL}catalog.json`;

function isCatalog(value: unknown): value is Catalog {
  if (typeof value !== 'object' || value === null) return false;
  const { cards, tags } = value as Record<string, unknown>;
  return Array.isArray(cards) && Array.isArray(tags);
}

/**
 * Loads the quote catalogue. It is a separate file rather than part of the
 * JavaScript, so the app starts as quickly with thousands of quotes as with
 * a few hundred; the service worker precaches it for offline use.
 */
export async function loadCatalog(
  fetchCatalog: (url: string) => Promise<Response> = (url) => fetch(url),
): Promise<Catalog> {
  const response = await fetchCatalog(CATALOG_URL);
  if (!response.ok) throw new Error(`Catalogue: HTTP ${String(response.status)}`);
  const data: unknown = await response.json();
  if (!isCatalog(data)) throw new Error('Catalogue: unexpected format');
  return data;
}
