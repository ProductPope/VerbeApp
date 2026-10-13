import type { KVNamespace } from '../../worker/src/index.js';

/** In-memory KV with small pages so that tests exercise the cursor. */
export function fakeKv(pageSize = 2): KVNamespace & { entries: Map<string, unknown> } {
  const entries = new Map<string, unknown>();
  return {
    entries,
    put: (key, _value, options) => {
      entries.set(key, options?.metadata);
      return Promise.resolve();
    },
    delete: (key) => {
      entries.delete(key);
      return Promise.resolve();
    },
    list: (options) => {
      const names = [...entries.keys()].sort();
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
