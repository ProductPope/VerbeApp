export const LANGUAGES = ['en', 'pl'] as const;
export type Language = (typeof LANGUAGES)[number];

const en = {
  appName: 'VerbeApp',
  tagline: 'Wise words, one at a time',
  skipToContent: 'Skip to quotes',
  mainNavigation: 'Main',
  feedTab: 'Quotes',
  savedTab: 'Saved',
  languageLabel: 'Language',
  categoriesLabel: 'Categories',
  allCategories: 'All',
  feedLabel: 'Quotes feed',
  feedHint: 'Swipe up for the next quote. With a keyboard, use Page Down and Page Up.',
  autoplayOn: 'Auto-advance on',
  autoplayOff: 'Auto-advance off',
  autoplayPausedReducedMotion: 'Auto-advance moves without animation because reduced motion is on.',
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
  englishOnly: 'Not translated yet, shown in English.',
  newTab: '(opens in a new tab)',
  by: 'by',
};

export type Strings = typeof en;

const pl: Strings = {
  appName: 'VerbeApp',
  tagline: 'Mądre słowa, jedno po drugim',
  skipToContent: 'Przejdź do cytatów',
  mainNavigation: 'Główna',
  feedTab: 'Cytaty',
  savedTab: 'Zapisane',
  languageLabel: 'Język',
  categoriesLabel: 'Kategorie',
  allCategories: 'Wszystkie',
  feedLabel: 'Lista cytatów',
  feedHint: 'Przesuń w górę, aby zobaczyć następny cytat. Na klawiaturze użyj Page Down i Page Up.',
  autoplayOn: 'Autoprzewijanie włączone',
  autoplayOff: 'Autoprzewijanie wyłączone',
  autoplayPausedReducedMotion:
    'Autoprzewijanie działa bez animacji, bo włączone jest ograniczenie ruchu.',
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
  englishOnly: 'Jeszcze bez tłumaczenia, pokazano po angielsku.',
  newTab: '(otwiera się w nowej karcie)',
  by: 'autor:',
};

export const STRINGS: Record<Language, Strings> = { en, pl };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
