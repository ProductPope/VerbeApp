export const LANGUAGES = ['en', 'pl'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Quotes stay in English; this is the language of the optional translation under them. */
export const TRANSLATION_LANGUAGE: Language = 'pl';

const en = {
  appName: 'VerbeApp',
  tagline: 'Wise words, one at a time',
  skipToContent: 'Skip to quotes',
  profile: 'Your profile',
  settings: 'Settings',
  close: 'Close',
  languageLabel: 'App language',
  translationLabel: 'Polish translation',
  translationHint: 'Draft translations prepared with AI help. Corrections are welcome on GitHub.',
  notificationLabel: 'Daily quote notification',
  notificationTime: 'Time',
  notificationHint: 'One quote a day at the time you choose. Only this device is notified.',
  notificationBlocked:
    'Notifications are blocked. Allow them for this site in your browser settings.',
  notificationFailed: 'Could not change the notification. Check your connection and try again.',
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
  preferencesHeading: 'Preferences',
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
  streakTitle: 'Your reading streak',
  streakDays: (days: number) => `${String(days)} ${days === 1 ? 'day' : 'days'} in a row`,
  streakHabit:
    'Habits shape who we become. A few quiet minutes with a good thought every day do more than a long read once in a while.',
  streakHow:
    'A day counts after 30 seconds in the app. Come back tomorrow to keep the flame alight.',
};

export type Strings = typeof en;

const pl: Strings = {
  appName: 'VerbeApp',
  tagline: 'Mądre słowa, jedno po drugim',
  skipToContent: 'Przejdź do cytatów',
  profile: 'Twój profil',
  settings: 'Ustawienia',
  close: 'Zamknij',
  languageLabel: 'Język aplikacji',
  translationLabel: 'Tłumaczenie na polski',
  translationHint:
    'Robocze tłumaczenia przygotowane z pomocą AI. Poprawki mile widziane na GitHubie.',
  notificationLabel: 'Codzienne powiadomienie z cytatem',
  notificationTime: 'Godzina',
  notificationHint:
    'Jeden cytat dziennie o wybranej godzinie. Powiadomienie dostaje tylko to urządzenie.',
  notificationBlocked:
    'Powiadomienia są zablokowane. Zezwól na nie dla tej strony w ustawieniach przeglądarki.',
  notificationFailed: 'Nie udało się zmienić powiadomienia. Sprawdź połączenie i spróbuj ponownie.',
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
  preferencesHeading: 'Preferencje',
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
  streakTitle: 'Twoja seria czytania',
  streakDays: (days: number) => `${String(days)} ${days === 1 ? 'dzień' : 'dni'} z rzędu`,
  streakHabit:
    'To nawyki nas kształtują. Kilka spokojnych minut z dobrą myślą każdego dnia daje więcej niż długa lektura od święta.',
  streakHow: 'Dzień liczy się po 30 sekundach w aplikacji. Wróć jutro, żeby płomień nie zgasł.',
};

export const STRINGS: Record<Language, Strings> = { en, pl };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
