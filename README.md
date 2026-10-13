# VerbeApp

Short, wise quotes on philosophy, self-development, productivity and assertiveness, delivered to
your phone.

> **Status:** early development. The verified quote dataset is in place; the installable web app
> (PWA) and daily notifications come next. See the [roadmap](#roadmap).

## What makes it different

Quote apps are full of misattributed and invented lines. Every quote in VerbeApp is:

- **verifiable**: it links to the exact chapter of a public-domain edition (Standard Ebooks or
  Project Gutenberg), and CI checks it appears there word for word;
- **free to use**: only works whose author and translator died more than 70 years ago;
- **open**: plain JSON files with JSON Schemas, so anyone can add quotes through a pull request.

## The dataset

| File                        | Contents                                                      |
| --------------------------- | ------------------------------------------------------------- |
| `data/tags.json`            | Categories, with English and Polish labels                    |
| `data/authors.json`         | Authors and their life dates                                  |
| `data/sources.json`         | Works, translators and the digital edition each quote is from |
| `data/quotes/<source>.json` | Quotes from one source, with chapter, locator and tags        |
| `data/schema/*.schema.json` | JSON Schemas for all of the above                             |

English is the primary language. Translations (for now Polish) are optional per quote and always
carry their translator and licence.

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run check          # lint, type-check, unit tests and data validation
npm run data:verify    # check every quote against its source text (needs network)
npm run data:text -- meditations book-4   # print a chapter to copy quotes from
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to add quotes, and [docs/adr](docs/adr) for the decisions
behind the design.

## Roadmap

1. **Quote dataset**: schema, validation and source verification. ✅
2. **App**: installable PWA with a full-screen card feed, favourites and hidden quotes,
   category filter and English/Polish switch, built to WCAG 2.2 AA on a token-based design system.
3. **Daily quote**: a push notification at a time you choose.

## Licence

Code: [MIT](LICENSE). Data: public domain and [CC0](data/LICENSE.md).
