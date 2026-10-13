# Contributing

Thank you for helping. The most valuable contribution is a good quote, correctly sourced.

## Adding a quote

1. Pick a source from `data/sources.json` and list its chapters:

   ```sh
   npm run data:text -- walden
   ```

2. Print the chapter and copy the passage **exactly** as it appears:

   ```sh
   npm run data:text -- walden economy
   ```

   You may shorten a passage: start or end mid-sentence, or mark omitted words with `…`. Do not
   change, modernise or reorder words. Typographic differences (straight or curly quotes, dash
   styles, letter case) are fine. An ellipsis may leave out at most 200 characters, and never the
   words that say someone else is speaking (`says`, `said`, a quotation mark): if the author is
   quoting another writer, the quote belongs to that writer. `npm run data:verify` checks both.

3. Add an entry to `data/quotes/<source>.json`:

   ```json
   {
     "id": "mass-men-lead-lives",
     "text": "The mass of men lead lives of quiet desperation.",
     "section": "economy",
     "locator": "Economy",
     "tags": ["philosophy"]
   }
   ```

   - `id`: lowercase kebab-case, unique across the dataset, never changed once merged (users'
     favourites refer to it).
   - `section`: the chapter name you passed to `data:text`.
   - `locator`: where a reader finds it in a printed copy, e.g. `Book IV` or `Chapter XXXIII`.
   - `tags`: one or more ids from `data/tags.json`.

4. Run the checks:

   ```sh
   npm run check
   npm run data:verify -- walden
   ```

Quotes should be under 400 characters and make sense on their own, without the surrounding text.

## Adding a source

A source must be in the public domain worldwide in practice: its author and, for translations, its
translator must have died more than 70 years ago. Add the author to `data/authors.json` and the
work to `data/sources.json`, pointing at its [Standard Ebooks](https://standardebooks.org) edition,
or at a [Project Gutenberg](https://www.gutenberg.org) plain-text file when Standard Ebooks has none
(quotes from a plain-text edition have a `locator` but no `section`).
The validation script rejects sources that are still under copyright.

## Adding a community saying

Original sayings and practical tips go in `data/community/`, one file per contributor. They must be
in your own words and are released under CC0; see [data/community/README.md](data/community/README.md).
Do not paste posts or quotes from websites (including Reddit): rewrite the idea and link to it with
`inspiredBy`.

## Adding a translation

Add a `translations` entry to the quote. Translations must name who translated them and be either
public domain or your own work released under CC0:

```json
"translations": {
  "pl": {
    "text": "Większość ludzi wiedzie życie w cichej rozpaczy.",
    "translator": "VerbeApp contributors",
    "license": "CC0-1.0",
    "status": "reviewed"
  }
}
```

`status` is `ai-draft` for a machine-assisted translation nobody has checked yet (the app labels
it as such) and `reviewed` once a person fluent in both languages has compared it with the English.
Reviewing a draft means correcting it where needed and changing its status to `reviewed`.

## Code changes

- Run `npm run check` before opening a pull request; CI runs the same commands.
- Keep pull requests focused, and add or update tests with every behaviour change.
- Record significant design decisions as an ADR in `docs/adr`.

By contributing you agree that your contributions are licensed under the project's licences (MIT
for code, CC0 for data), and to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
