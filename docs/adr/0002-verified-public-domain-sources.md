# 2. Only public-domain sources, verified word for word

Date: 2026-10-13 · Status: Accepted

## Context

Popular quote collections are full of misattributed or invented quotes, and modern books are under
copyright. An open-source project cannot redistribute copyrighted text, and its credibility depends
on the quotes being real.

## Decision

- Quotes come only from works whose author and translator died more than 70 years ago, the longest
  common copyright term (EU, including Poland). The validator rejects any other source.
- Each source points to a [Standard Ebooks](https://standardebooks.org) edition: carefully
  proofread, CC0-licensed, and published as a public Git repository with stable chapter files.
- `npm run data:verify` clones each edition and checks that every quote appears in its cited chapter
  word for word, ignoring only typographic differences. CI runs it on data changes and weekly, to
  catch upstream changes to the editions.
- Website-style "inspirational quotes" and social-media posts are not copied into the dataset.

## Consequences

- Every quote can be traced to a chapter a reader can open.
- Modern authors are out of scope. Original sayings written for the project, if added later, will
  need their own clearly labelled source type.
- Verification depends on GitHub availability; it is a separate CI job so it cannot block
  unrelated work.
