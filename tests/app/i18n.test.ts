import { describe, expect, it } from 'vitest';
import { isLanguage, STRINGS } from '../../src/app/i18n/strings.js';

describe('strings', () => {
  it('translate every key into Polish', () => {
    expect(Object.keys(STRINGS.pl).sort()).toEqual(Object.keys(STRINGS.en).sort());
    for (const value of Object.values(STRINGS.pl)) {
      expect(typeof value === 'function' ? value(3) : value).not.toBe('');
    }
    expect(STRINGS.pl.quoteOf(3)).toBe('Cytat 3');
    expect(STRINGS.en.quoteOf(3)).toBe('Quote 3');
  });

  it('use the right Polish plural for imported quotes', () => {
    const counts = [1, 2, 4, 5, 12, 14, 22, 25, 112];
    expect(counts.map((count) => STRINGS.pl.imported(count))).toEqual([
      'Dodano z kopii: 1 cytat.',
      'Dodano z kopii: 2 cytaty.',
      'Dodano z kopii: 4 cytaty.',
      'Dodano z kopii: 5 cytatów.',
      'Dodano z kopii: 12 cytatów.',
      'Dodano z kopii: 14 cytatów.',
      'Dodano z kopii: 22 cytaty.',
      'Dodano z kopii: 25 cytatów.',
      'Dodano z kopii: 112 cytatów.',
    ]);
    expect(STRINGS.en.imported(1)).toBe('Added 1 quote from the backup.');
  });

  it('recognise supported languages only', () => {
    expect(isLanguage('pl')).toBe(true);
    expect(isLanguage('de')).toBe(false);
    expect(isLanguage(1)).toBe(false);
  });
});
