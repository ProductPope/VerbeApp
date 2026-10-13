import { describe, expect, it } from 'vitest';
import {
  csvTemplate,
  detectSeparator,
  MAX_CSV_ROWS,
  parseCsv,
  readQuotesCsv,
} from '../../src/app/personal/csv.js';
import { MAX_TEXT_LENGTH, type PersonalQuote } from '../../src/app/personal/personal.js';
import { testCatalog } from './fixtures.js';

const tags = testCatalog().tags;

function read(csv: string, existing: PersonalQuote[] = []) {
  return readQuotesCsv(csv, existing, tags);
}

describe('parseCsv', () => {
  it('reads quoted cells with separators, line breaks and doubled quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi""\nthere"\r\nd,,e\n', ',')).toEqual([
      ['a', 'b, c', 'say "hi"\nthere'],
      ['d', '', 'e'],
    ]);
  });

  it('keeps a last row without a line break and reports an unclosed quote', () => {
    expect(parseCsv('a;b\nc;d', ';')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCsv('a,"b\nc', ',')).toBeUndefined();
  });

  it('detects commas, semicolons and tabs from the header', () => {
    expect(detectSeparator('text,author,source')).toBe(',');
    expect(detectSeparator('tekst;autor;źródło')).toBe(';');
    expect(detectSeparator('text\tauthor')).toBe('\t');
    expect(detectSeparator('text')).toBe(',');
  });
});

describe('readQuotesCsv', () => {
  it('reads quotes with optional columns in any order', () => {
    const result = read(
      'categories,text,language\n' +
        'Philosophy|productivity,  Know thyself. ,en\n' +
        ',Nie wszystko złoto.,PL\n',
    );
    expect(result).toEqual({
      ok: true,
      drafts: [
        {
          text: 'Know thyself.',
          author: '',
          source: '',
          language: 'en',
          tags: ['philosophy', 'productivity'],
        },
        { text: 'Nie wszystko złoto.', author: '', source: '', language: 'pl', tags: [] },
      ],
      problems: [],
      duplicates: 0,
    });
  });

  it('accepts Polish headers and category names, semicolons and a byte order mark', () => {
    const result = read(
      '﻿Cytat;Autor;Źródło;Język;Kategorie\nCarpe diem.;Horacy;Ody;polski;Filozofia | Produktywność\n',
    );
    expect(result).toMatchObject({
      ok: true,
      drafts: [
        {
          text: 'Carpe diem.',
          author: 'Horacy',
          source: 'Ody',
          language: 'pl',
          tags: ['philosophy', 'productivity'],
        },
      ],
    });
  });

  it('reports each bad row with its spreadsheet row number and keeps the good ones', () => {
    const result = read(
      [
        'text,language,categories',
        'Good one.,,',
        ',en,',
        `${'a'.repeat(MAX_TEXT_LENGTH + 1)},,`,
        'Wrong language.,de,',
        'Wrong category.,,Cooking',
        '',
        'Also good.,english,',
      ].join('\n'),
    );
    expect(result).toEqual({
      ok: true,
      drafts: [
        { text: 'Good one.', author: '', source: '', language: 'en', tags: [] },
        { text: 'Also good.', author: '', source: '', language: 'en', tags: [] },
      ],
      problems: [
        { row: 3, error: { kind: 'noText' } },
        { row: 4, error: { kind: 'textTooLong' } },
        { row: 5, error: { kind: 'unknownLanguage', value: 'de' } },
        { row: 6, error: { kind: 'unknownCategory', value: 'Cooking' } },
      ],
      duplicates: 0,
    });
  });

  it('skips quotes already saved or repeated in the file', () => {
    const existing: PersonalQuote[] = [
      {
        id: 'mine-1',
        text: 'Saved before.',
        author: '',
        source: '',
        language: 'en',
        tags: [],
        added: '2026-10-13T10:00:00.000Z',
      },
    ];
    const result = read('text\nSaved before.\nNew.\nNew.\n', existing);
    expect(result).toMatchObject({ ok: true, duplicates: 2 });
    expect(result.ok && result.drafts.map((draft) => draft.text)).toEqual(['New.']);
  });

  it('rejects files it cannot read as a whole', () => {
    expect(read('')).toEqual({ ok: false, error: 'empty' });
    expect(read('\n\nquote')).toEqual({ ok: false, error: 'empty' });
    expect(read('author,source\nMe,Here\n')).toEqual({ ok: false, error: 'noTextColumn' });
    expect(read('text\n"never closed\n')).toEqual({ ok: false, error: 'unclosedQuote' });
    expect(read('x'.repeat(1_000_001))).toEqual({ ok: false, error: 'tooLarge' });
    const many = ['text', ...Array.from({ length: MAX_CSV_ROWS + 1 }, (_, i) => `Q${String(i)}`)];
    expect(read(many.join('\n'))).toEqual({ ok: false, error: 'tooManyRows' });
  });
});

describe('csvTemplate', () => {
  it('opens as UTF-8 in Excel and imports cleanly', () => {
    const template = csvTemplate(tags);
    expect(template.startsWith('﻿text,author,source,language,categories\r\n')).toBe(true);
    const result = read(template);
    expect(result).toMatchObject({ ok: true, problems: [], duplicates: 0 });
    expect(result.ok && result.drafts).toHaveLength(2);
  });
});
