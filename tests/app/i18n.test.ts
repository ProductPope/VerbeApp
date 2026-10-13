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

  it('recognise supported languages only', () => {
    expect(isLanguage('pl')).toBe(true);
    expect(isLanguage('de')).toBe(false);
    expect(isLanguage(1)).toBe(false);
  });
});
