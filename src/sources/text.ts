/**
 * Turns Standard Ebooks XHTML into plain text and checks that a quote appears
 * in it word for word. Matching ignores differences that are typographic
 * rather than textual: curly vs straight quotes, dash styles, invisible
 * joiners, letter case and whitespace.
 */

const ELLIPSIS = '…';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Extracts readable text from an XHTML chapter, dropping endnote markers. */
export function xhtmlToText(xhtml: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(xhtml)?.[1] ?? xhtml;
  const withoutNotes = body.replace(/<a\b[^>]*epub:type="noteref"[^>]*>[\s\S]*?<\/a>/gi, '');
  const withBreaks = withoutNotes.replace(
    /<\/(p|h[1-6]|li|blockquote|header|section|article|tr|td|th)>|<br\s*\/?>/gi,
    '\n',
  );
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '');
  return decodeEntities(withoutTags)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Extracts the book from a Project Gutenberg plain-text file: drops the
 * licence header and footer and the underscores that mark italics.
 */
export function gutenbergBody(text: string): string {
  const start = /^\*\*\* ?START OF.*$/m.exec(text);
  const end = /^\*\*\* ?END OF.*$/m.exec(text);
  const body = text.slice(start ? start.index + start[0].length : 0, end ? end.index : text.length);
  return body.replace(/_/g, '').trim();
}

/** Folds typographic variants so that equivalent wordings compare equal. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\.\.\./g, ELLIPSIS)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Splits a quote on ellipses into the fragments that must appear in the
 * source, in order. Leading and trailing punctuation of each fragment is
 * dropped because quoting a clause often changes it.
 */
export function quoteFragments(quote: string): string[] {
  return normalizeForMatch(quote)
    .split(ELLIPSIS)
    .map((fragment) => fragment.replace(/^[\s,;:.'"-]+|[\s,;:.'"-]+$/g, ''))
    .filter((fragment) => fragment.length > 0);
}

/** True when every fragment of the quote appears in the text, in order. */
export function containsQuote(sourceText: string, quote: string): boolean {
  const haystack = normalizeForMatch(sourceText);
  const fragments = quoteFragments(quote);
  if (fragments.length === 0) return false;
  let from = 0;
  for (const fragment of fragments) {
    const at = haystack.indexOf(fragment, from);
    if (at === -1) return false;
    from = at + fragment.length;
  }
  return true;
}
