# 3. Project Gutenberg editions and community sayings

Date: 2026-10-13 · Status: Accepted

## Context

Users asked for Buddhist texts and for practical "inspired quotes" and life tips that do not come
from literature, including ideas popular on Reddit. Standard Ebooks does not publish the
Dhammapada, and social-media posts are owned by their authors; Reddit's API terms also forbid
redistributing them.

## Decision

- A source's edition may also be a **Project Gutenberg** plain-text file, used only when Standard
  Ebooks has no edition. Quotes are verified against the whole text (there are no chapter files),
  so they carry a `locator` but no `section`. The first such source is the Dhammapada in
  F. Max Müller's translation (1881).
- **Community sayings** live in `data/community/<contributor>.json`, with their own schema. They are
  written by contributors in their own words, released under CC0, may link to what inspired them,
  and are always presented as community content, never as quotes.
- Posts and comments from Reddit or other sites are never copied. An idea found there may be
  rewritten as a community saying with an `inspiredBy` link.

## Consequences

- The dataset can cover traditions and practical advice beyond Standard Ebooks while keeping the
  "every quote is verifiable" promise for literature.
- Ids stay unique across quotes and community sayings, so favourites work the same for both.
- The app must show the difference between a sourced quote and a community saying.
