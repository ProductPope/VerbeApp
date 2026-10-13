import type { KVNamespace } from '../../worker/src/index.js';

/** In-memory KV with small pages so that tests exercise the cursor. */
export function fakeKv(pageSize = 2): KVNamespace & {
  entries: Map<string, unknown>;
  values: Map<string, string>;
} {
  const entries = new Map<string, unknown>();
  const values = new Map<string, string>();
  return {
    entries,
    values,
    get: (key) => Promise.resolve(values.get(key) ?? null),
    put: (key, value, options) => {
      entries.set(key, options?.metadata);
      values.set(key, value);
      return Promise.resolve();
    },
    delete: (key) => {
      entries.delete(key);
      values.delete(key);
      return Promise.resolve();
    },
    list: (options) => {
      const names = [...entries.keys()]
        .filter((name) => name.startsWith(options?.prefix ?? ''))
        .sort();
      const start = options?.cursor === undefined ? 0 : Number(options.cursor);
      const keys = names
        .slice(start, start + pageSize)
        .map((name) => ({ name, metadata: entries.get(name) }));
      const end = start + pageSize;
      return Promise.resolve(
        end >= names.length
          ? { keys, list_complete: true }
          : { keys, list_complete: false, cursor: String(end) },
      );
    },
  };
}
