# 1. Store quotes as schema-validated JSON in the repo

Date: 2026-10-13 · Status: Accepted

## Context

The app needs a quote collection that is easy to extend by contributors, reviewable in pull
requests, and usable offline on a phone. The collection will grow to thousands of entries, not
millions.

## Decision

- Quotes live in `data/quotes/<source-id>.json`, one file per source; authors, sources and tags live
  in their own files and are referenced by id.
- Every file declares a JSON Schema (`data/schema`), so editors validate it while typing and the
  format is documented independently of the code.
- Rules a schema cannot express (unique ids across files, references that resolve, copyright term)
  are checked in TypeScript (`src/data/integrity.ts`) and run in CI.
- Ids are stable kebab-case slugs; user data such as favourites refers to them.
- English text is required; other languages are optional `translations` with attribution.

## Consequences

- No database or server is needed; the app can bundle the data at build time and work offline.
- Changes to the data go through the same review and CI as code.
- Splitting by source keeps files small and merge conflicts rare. If the dataset outgrows a single
  bundle, the build can split it by tag or language without changing the source format.
