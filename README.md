# VerbeApp

Short, wise quotes on philosophy, self-development, resilience, relationships, mindfulness and more, delivered to
your phone.

**Open the app: <https://productpope.github.io/VerbeApp/>** and on Android choose _Install app_
(or _Add to Home screen_) in Chrome's menu.

> **Status:** early development. The verified dataset, the installable app and daily notifications
> are in place. See the [roadmap](#roadmap).

## What makes it different

Quote apps are full of misattributed and invented lines. Every quote in VerbeApp is:

- **verifiable**: it links to the chapter (Standard Ebooks) or book (Project Gutenberg) of a
  public-domain edition, and CI checks that its words appear there in order, with any `…`
  leaving out no more than a short phrase and never the name of another speaker;
- **free to use**: only works whose author and translator died more than 70 years ago;
- **open**: plain JSON files with JSON Schemas, so anyone can add quotes through a pull request.

## The app

A full-screen deck of quote cards: swipe left for the next one, save favourites and hide quotes you
don't want to see again. Each English quote shows its Polish translation underneath (switch it off
under Preferences in your profile, next to the app language; category filters are in Settings). Optional auto-advance turns the
feed into a slideshow with a progress bar, and pauses whenever you interact. A reading streak next
to the title counts the days in a row you spent at least 30 seconds with the app. You can also add
your own quotes in your profile; they join the feed labelled "Your quote" and can be backed up to a
file. Many quotes at once can come from a CSV file (columns `text`, `author`, `source`, `language`,
`categories`; the app explains the format and offers a template). Everything you choose or add stays on your device, and the app works offline.

It is built to WCAG 2.2 AA; see [docs/accessibility.md](docs/accessibility.md) for how that is
tested.

## The dataset

| File                        | Contents                                                      |
| --------------------------- | ------------------------------------------------------------- |
| `data/tags.json`            | Categories, with English and Polish labels                    |
| `data/authors.json`         | Authors and their life dates                                  |
| `data/sources.json`         | Works, translators and the digital edition each quote is from |
| `data/quotes/<source>.json` | Quotes from one source, with chapter, locator and tags        |
| `data/schema/*.schema.json` | JSON Schemas for all of the above                             |

English is the primary language. Translations (for now Polish) are optional per quote and always
carry their translator, licence and review status. The current Polish translations are AI-assisted
drafts (CC0, `"status": "ai-draft"`) that no person has reviewed yet; the app labels them as drafts
under each quote. Reviews and corrections are welcome.

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev            # start the app at http://localhost:5173
npm run check          # lint, type-check, unit and component tests, data validation
npm run test:e2e       # build, then run Playwright and axe tests on an Android viewport
npm run data:verify    # check every quote against its source text (needs network)
npm run data:text -- meditations book-4   # print a chapter to copy quotes from
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to add quotes, and [docs/adr](docs/adr) for the decisions
behind the design.

## Roadmap

1. **Quote dataset**: schema, validation and source verification. ✅
2. **App**: installable PWA with a full-screen card feed, favourites and hidden quotes,
   category filter and English/Polish switch, built to WCAG 2.2 AA on a token-based design system. ✅
3. **Daily quote**: a push notification at a time you choose, sent by a small Cloudflare Worker.
   See [docs/notifications.md](docs/notifications.md). ✅

## Licence

Code: [MIT](LICENSE). Data: public domain and [CC0](data/LICENSE.md).
