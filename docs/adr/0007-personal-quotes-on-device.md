# 7. The reader's own quotes, kept on the device

Date: 2026-10-13 · Status: Accepted

## Context

Readers want to keep lines from the books they are reading next to the verified quotes, ideally by
taking a photo of the page. The app has no accounts and no backend for personal data (see
[0004](0004-react-pwa-with-local-preferences.md)), and the public dataset only accepts quotes
verified word for word against a public-domain edition (see
[0002](0002-verified-public-domain-sources.md)). A reader's own quotes meet neither bar: they may
come from books still under copyright, and nobody checks them.

## Decision

- **Kept on the device only**, under their own `localStorage` key (`verbeapp:personal-quotes:v1`),
  separate from preferences so either can change format on its own. Nothing is uploaded, and they
  never enter `data/` or `npm run data:verify`. Malformed entries are dropped one by one instead of
  resetting the whole list.
- **Ids start with `mine-`** followed by a random UUID, so they can never collide with the public
  dataset. Favourites and hidden quotes work on them unchanged.
- **Mixed into the feed as equals**: a reader's quote appears as often as any other, follows the
  same category filter, and is labelled "Your quote". It has no "Read in context" link, and its
  author and source are shown as typed, without any claim of verification.
- **The text carries its own language** (English or Polish), set on the quote so screen readers
  pronounce it correctly.
- **Backup by file**: since clearing site data deletes the quotes, the profile offers a JSON
  download and a restore that adds only quotes not already present, by id or identical text.
  Saving the first quote also asks the browser for persistent storage.
- **Manual entry first.** Reading text from a photo comes next, on the device with Tesseract.js
  loaded only when needed, so photos never leave the phone; typing stays available as the
  accessible alternative to the camera.

## Consequences

- Quotes are per device and per browser; moving them means downloading a backup and restoring it.
- `localStorage` holds a few megabytes, enough for thousands of short quotes but not for images,
  which are therefore never stored.
- The daily notification still picks only from the public dataset, because the service worker
  cannot read `localStorage`. Including the reader's quotes means copying them to Cache Storage,
  as preferences already are; that is left for a later change.
