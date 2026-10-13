export const LANGUAGES = ['en', 'pl'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Quotes stay in English; this is the language of the optional translation under them. */
export const TRANSLATION_LANGUAGE: Language = 'pl';

const en = {
  appName: 'VerbeApp',
  tagline: 'Wise words, one at a time',
  skipToContent: 'Skip to quotes',
  saved: 'Saved quotes',
  settings: 'Settings',
  close: 'Close',
  languageLabel: 'App language',
  translationLabel: 'Polish translation',
  translationHint: 'Draft translations prepared with AI help. Corrections are welcome on GitHub.',
  categoriesLabel: 'Categories',
  allCategories: 'All',
  feedLabel: 'Quotes feed',
  feedHint:
    'Swipe left for the next quote. With a keyboard, use the arrow keys or Page Down and Page Up.',
  autoplay: 'Auto-advance',
  favorite: 'Favourite',
  removeFavorite: 'Remove from favourites',
  hide: 'Don’t show again',
  hidden: 'Quote hidden.',
  undo: 'Undo',
  readInContext: 'Read in context',
  inspiredBy: 'Inspired by',
  communitySaying: 'Community saying',
  quoteOf: (position: number) => `Quote ${String(position)}`,
  favoritesHeading: 'Favourites',
  hiddenHeading: 'Hidden quotes',
  noFavorites: 'No favourites yet. Tap the heart on a quote to keep it here.',
  noHidden: 'Nothing hidden.',
  restore: 'Show again',
  emptyFeed: 'No quotes match. Choose more categories or restore hidden quotes.',
  newTab: '(opens in a new tab)',
  by: 'by',
  streak: (days: number) =>
    `Reading streak: ${String(days)} ${days === 1 ? 'day' : 'days'} in a row`,
  streakReached: (days: number) =>
    days === 1
      ? 'Day one of your reading streak. See you tomorrow!'
      : `${String(days)} days in a row. Well done!`,
};

export type Strings = typeof en;

const pl: Strings = {
  appName: 'VerbeApp',
  tagline: 'Mądre słowa, jedno po drugim',
  skipToContent: 'Przejdź do cytatów',
  saved: 'Zapisane cytaty',
  settings: 'Ustawienia',
  close: 'Zamknij',
  languageLabel: 'Język aplikacji',
  translationLabel: 'Tłumaczenie na polski',
  translationHint:
    'Robocze tłumaczenia przygotowane z pomocą AI. Poprawki mile widziane na GitHubie.',
  categoriesLabel: 'Kategorie',
  allCategories: 'Wszystkie',
  feedLabel: 'Lista cytatów',
  feedHint:
    'Przesuń w lewo, aby zobaczyć następny cytat. Na klawiaturze użyj strzałek lub Page Down i Page Up.',
  autoplay: 'Autoprzewijanie',
  favorite: 'Ulubiony',
  removeFavorite: 'Usuń z ulubionych',
  hide: 'Nie pokazuj więcej',
  hidden: 'Cytat ukryty.',
  undo: 'Cofnij',
  readInContext: 'Czytaj w kontekście',
  inspiredBy: 'Inspiracja',
  communitySaying: 'Sentencja społeczności',
  quoteOf: (position: number) => `Cytat ${String(position)}`,
  favoritesHeading: 'Ulubione',
  hiddenHeading: 'Ukryte cytaty',
  noFavorites: 'Brak ulubionych. Stuknij serce przy cytacie, aby go tu zachować.',
  noHidden: 'Nic nie jest ukryte.',
  restore: 'Pokaż ponownie',
  emptyFeed: 'Brak pasujących cytatów. Wybierz więcej kategorii lub przywróć ukryte cytaty.',
  newTab: '(otwiera się w nowej karcie)',
  by: 'autor:',
  streak: (days: number) =>
    `Seria czytania: ${String(days)} ${days === 1 ? 'dzień' : 'dni'} z rzędu`,
  streakReached: (days: number) =>
    days === 1 ? 'Pierwszy dzień serii czytania. Do jutra!' : `${String(days)} dni z rzędu. Brawo!`,
};

export const STRINGS: Record<Language, Strings> = { en, pl };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
