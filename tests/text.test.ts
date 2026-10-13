import { describe, expect, it } from 'vitest';
import {
  containsQuote,
  findQuote,
  hidesAttribution,
  gutenbergBody,
  normalizeForMatch,
  quoteFragments,
  xhtmlToText,
} from '../src/sources/text.js';

describe('xhtmlToText', () => {
  it('keeps paragraph text and drops markup and endnote markers', () => {
    const xhtml = `<html><head><title>Book IV</title></head><body>
      <h2>Book <span>IV</span></h2>
      <p>Men seek <i>retreats</i> for themselves,<a href="endnotes.xhtml#note-1" id="noteref-1" epub:type="noteref">1</a> houses in the country.</p>
      <p>Second&#160;paragraph &amp; more.</p>
    </body></html>`;
    expect(xhtmlToText(xhtml)).toBe(
      'Book IV\nMen seek retreats for themselves, houses in the country.\nSecond paragraph & more.',
    );
  });

  it('decodes numeric and named entities', () => {
    expect(xhtmlToText('<p>&#x2014;&#8212;&lt;&quot;&apos;&unknown;</p>')).toBe('——<"\'&unknown;');
  });

  it('accepts a fragment without a body element', () => {
    expect(xhtmlToText('<p>One</p><p>Two</p>')).toBe('One\nTwo');
  });
});

describe('normalizeForMatch', () => {
  it('folds typographic variants, invisible characters, case and whitespace', () => {
    expect(normalizeForMatch('“Don’t”\u2060—  WAIT...')).toBe(`"don't"- wait…`);
  });
});

describe('quoteFragments', () => {
  it('splits on ellipses and trims punctuation at the cut points', () => {
    expect(quoteFragments('Set thyself in motion, … but be content.')).toEqual([
      'set thyself in motion',
      'but be content',
    ]);
  });

  it('returns nothing for a quote made only of punctuation', () => {
    expect(quoteFragments('… , …')).toEqual([]);
  });
});

describe('containsQuote', () => {
  const source =
    'Men seek retreats for themselves, houses in the country, seashores, and mountains; and thou too art wont to desire such things very much.';

  it('finds an exact quote despite case and quote-mark differences', () => {
    expect(containsQuote(source, 'Men seek retreats for themselves, houses in the country.')).toBe(
      true,
    );
  });

  it('finds fragments around an ellipsis when they appear in order', () => {
    expect(containsQuote(source, 'Men seek retreats … desire such things very much.')).toBe(true);
  });

  it('rejects fragments that appear out of order', () => {
    expect(containsQuote(source, 'desire such things … Men seek retreats')).toBe(false);
  });

  it('rejects a changed word', () => {
    expect(containsQuote(source, 'Men seek refuges for themselves')).toBe(false);
  });

  it('rejects an empty quote', () => {
    expect(containsQuote(source, '…')).toBe(false);
  });

  it('rejects an ellipsis that leaves out more than the allowed omission', () => {
    const quote = 'Men seek retreats … desire such things very much.';
    expect(containsQuote(source, quote, 120)).toBe(true);
    expect(containsQuote(source, quote, 10)).toBe(false);
  });

  it('rejects an ellipsis that hides who is speaking far away in the text', () => {
    const essay = `Men (says an ancient Greek sentence)${' and so on'.repeat(30)} are tormented by opinions.`;
    expect(containsQuote(essay, 'Men … are tormented by opinions.')).toBe(false);
  });

  it('finds a later occurrence of the first fragment when an earlier one is too far away', () => {
    const text = `Men seek.${' x'.repeat(200)} Men seek retreats and houses.`;
    expect(containsQuote(text, 'Men seek … houses.', 20)).toBe(true);
  });
});

describe('gutenbergBody', () => {
  it('keeps only the book between the licence markers and drops italics underscores', () => {
    const file = [
      'The Project Gutenberg eBook of Something',
      '*** START OF THE PROJECT GUTENBERG EBOOK SOMETHING ***',
      'All that we are is the _result_ of',
      'what we have thought.',
      '*** END OF THE PROJECT GUTENBERG EBOOK SOMETHING ***',
      'Licence text',
    ].join('\n');
    expect(gutenbergBody(file)).toBe('All that we are is the result of\nwhat we have thought.');
  });

  it('returns the whole text when the markers are missing', () => {
    expect(gutenbergBody('  Plain text.  ')).toBe('Plain text.');
  });
});

describe('findQuote', () => {
  it('returns the omitted passages', () => {
    expect(findQuote('Men, says one, are tormented by opinions.', 'Men … are tormented')).toEqual([
      ', says one, ',
    ]);
  });

  it('returns no omissions for a quote without an ellipsis', () => {
    expect(findQuote('Know thyself.', 'Know thyself')).toEqual([]);
  });
});

describe('hidesAttribution', () => {
  it('flags omitted words that name another speaker', () => {
    expect(hidesAttribution(' (says an ancient greek sentence) ')).toBe(true);
    expect(hidesAttribution(' as plato saith, ')).toBe(true);
    expect(hidesAttribution(' "the wise" ')).toBe(true);
  });

  it('accepts ordinary omissions', () => {
    expect(hidesAttribution(', and of all things, ')).toBe(false);
    expect(hidesAttribution(' essays and sayings ')).toBe(false);
  });
});
