import { describe, expect, it, vi } from 'vitest';
import {
  createPreferencesStore,
  defaultPreferences,
  parsePreferences,
  STORAGE_KEY,
  toggle,
} from '../../src/app/prefs/store.js';

describe('defaultPreferences', () => {
  it('starts in Polish for Polish browsers and English otherwise', () => {
    expect(defaultPreferences('pl-PL').language).toBe('pl');
    expect(defaultPreferences('en-GB').language).toBe('en');
    expect(defaultPreferences().language).toBe('en');
  });

  it('keeps auto-advance off', () => {
    expect(defaultPreferences().autoplay).toBe(false);
  });

  it('shows translations', () => {
    expect(defaultPreferences().translation).toBe(true);
  });
});

describe('parsePreferences', () => {
  const fallback = defaultPreferences('en');

  it('returns the fallback for missing or broken data', () => {
    expect(parsePreferences(null, fallback)).toBe(fallback);
    expect(parsePreferences('{not json', fallback)).toBe(fallback);
  });

  it('keeps valid fields and drops invalid ones', () => {
    const raw = JSON.stringify({
      language: 'de',
      favorites: ['a', 3, 'b'],
      hidden: 'nope',
      tags: ['philosophy'],
      autoplay: 'yes',
      translation: 'no',
    });
    expect(parsePreferences(raw, fallback)).toEqual({
      language: 'en',
      favorites: ['a', 'b'],
      hidden: [],
      tags: ['philosophy'],
      autoplay: false,
      translation: true,
    });
  });

  it('turns translations off only when explicitly stored', () => {
    expect(parsePreferences(JSON.stringify({ translation: false }), fallback).translation).toBe(
      false,
    );
    expect(parsePreferences('{}', fallback).translation).toBe(true);
  });
});

describe('createPreferencesStore', () => {
  it('persists updates and notifies subscribers', () => {
    const store = createPreferencesStore(localStorage, 'en');
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.update((current) => ({ ...current, favorites: ['a'] }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ favorites: ['a'] });
    expect(createPreferencesStore(localStorage, 'en').get().favorites).toEqual(['a']);
    unsubscribe();
    store.update((current) => ({ ...current, favorites: [] }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps working when storage is unavailable or throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    } as unknown as Storage;
    const store = createPreferencesStore(broken, 'pl');
    store.update((current) => ({ ...current, hidden: ['x'] }));
    expect(store.get()).toMatchObject({ language: 'pl', hidden: ['x'] });
    expect(createPreferencesStore(undefined, 'en').get().language).toBe('en');
  });
});

describe('toggle', () => {
  it('adds a missing id and removes a present one', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
  });
});
