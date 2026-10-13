import { describe, expect, it } from 'vitest';
import {
  cleanDraft,
  createPersonalStore,
  draftError,
  exportPersonalQuotes,
  importPersonalQuotes,
  InvalidBackupError,
  MAX_TEXT_LENGTH,
  newPersonalId,
  parsePersonalQuotes,
  personalCard,
  PERSONAL_STORAGE_KEY,
  type PersonalQuote,
} from '../../src/app/personal/personal.js';

function quote(id: string, overrides: Partial<PersonalQuote> = {}): PersonalQuote {
  return {
    id: `mine-${id}`,
    text: `Own words ${id}.`,
    author: 'Seneca',
    source: 'Letters, p. 12',
    language: 'en',
    tags: ['philosophy'],
    added: '2026-10-13T10:00:00.000Z',
    ...overrides,
  };
}

describe('parsePersonalQuotes', () => {
  it('returns no quotes for missing or broken data', () => {
    expect(parsePersonalQuotes(null)).toEqual([]);
    expect(parsePersonalQuotes('{not json')).toEqual([]);
    expect(parsePersonalQuotes('{"a":1}')).toEqual([]);
  });

  it('keeps valid quotes and drops malformed ones and duplicates', () => {
    const raw = JSON.stringify([
      quote('a'),
      { ...quote('b'), id: 'alpha' },
      { ...quote('c'), text: '   ' },
      'nonsense',
      quote('a', { text: 'Duplicate id.' }),
      { id: 'mine-d', text: ' Only text. ', language: 'de', tags: [1, 'x'], added: 'never' },
    ]);
    expect(parsePersonalQuotes(raw)).toEqual([
      quote('a'),
      {
        id: 'mine-d',
        text: 'Only text.',
        author: '',
        source: '',
        language: 'en',
        tags: ['x'],
        added: new Date(0).toISOString(),
      },
    ]);
  });

  it('persists through the store', () => {
    const store = createPersonalStore(localStorage);
    store.update(() => [quote('a')]);
    expect(JSON.parse(localStorage.getItem(PERSONAL_STORAGE_KEY)!)).toEqual([quote('a')]);
    expect(createPersonalStore(localStorage).get()).toEqual([quote('a')]);
  });

  it('works without storage', () => {
    const store = createPersonalStore(undefined);
    store.update(() => [quote('a')]);
    expect(store.get()).toEqual([quote('a')]);
  });
});

describe('drafts', () => {
  const draft = { text: 'x', author: '', source: '', language: 'en' as const, tags: [] };

  it('requires text and limits its length', () => {
    expect(draftError({ ...draft, text: '  \n ' })).toBe('textRequired');
    expect(draftError({ ...draft, text: 'a'.repeat(MAX_TEXT_LENGTH + 1) })).toBe('textTooLong');
    expect(draftError({ ...draft, text: 'a'.repeat(MAX_TEXT_LENGTH) })).toBeUndefined();
  });

  it('trims fields, collapses spaces and drops unknown categories', () => {
    expect(
      cleanDraft(
        {
          text: '  Know  thyself.\nAnd act. ',
          author: ' Socrates ',
          source: '',
          language: 'pl',
          tags: ['philosophy', 'gone'],
        },
        ['philosophy'],
      ),
    ).toEqual({
      text: 'Know thyself.\nAnd act.',
      author: 'Socrates',
      source: '',
      language: 'pl',
      tags: ['philosophy'],
    });
  });

  it('gives ids that cannot collide with the public dataset', () => {
    expect(newPersonalId(() => 'abc')).toBe('mine-abc');
    expect(newPersonalId()).toMatch(/^mine-[0-9a-f-]{36}$/);
  });
});

describe('personalCard', () => {
  it('shows the quote in its own language without a link', () => {
    expect(personalCard(quote('a', { language: 'pl' }))).toEqual({
      id: 'mine-a',
      kind: 'personal',
      text: 'Own words a.',
      language: 'pl',
      translations: {},
      draftTranslations: [],
      tags: ['philosophy'],
      author: { en: 'Seneca' },
      work: 'Letters, p. 12',
      locator: '',
    });
  });
});

describe('backup', () => {
  it('round-trips through export and import', () => {
    const quotes = [quote('a'), quote('b')];
    expect(importPersonalQuotes(exportPersonalQuotes(quotes), [])).toEqual({ quotes, added: 2 });
  });

  it('skips quotes that are already here, by id or by text', () => {
    const backup = exportPersonalQuotes([
      quote('a'),
      quote('b', { text: 'Own words c.' }),
      quote('d'),
    ]);
    const existing = [quote('a'), quote('c')];
    expect(importPersonalQuotes(backup, existing)).toEqual({
      quotes: [...existing, quote('d')],
      added: 1,
    });
  });

  it('rejects files that are not a backup', () => {
    for (const json of ['not json', '[]', '{"format":"other","version":1,"quotes":[]}']) {
      expect(() => importPersonalQuotes(json, [])).toThrow(InvalidBackupError);
    }
    expect(() =>
      importPersonalQuotes('{"format":"verbeapp-personal-quotes","version":2,"quotes":[]}', []),
    ).toThrow(InvalidBackupError);
  });
});
