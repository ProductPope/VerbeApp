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
  aiDraftTranslation: 'AI Translated',
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
  swipeHint: 'Swipe left for the next quote',
  keyboardHint: 'Press → for the next quote',
  dismissHint: 'Got it',
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
  aboutHeading: 'About VerbeApp',
  aboutText:
    'A free, open-source app for self-development: one wise thought at a time, to reflect on and put into practice.',
  aboutSources:
    'Quotes come from public-domain books, each checked word for word against its source edition. Community sayings are original and free to reuse.',
  aboutLink: 'Source code on GitHub',
  emptyFeed: 'No quotes match. Choose more categories or restore hidden quotes.',
  newTab: '(opens in a new tab)',
  by: 'by',
  personalQuote: 'Your quote',
  personalHeading: 'Your quotes',
  personalHint:
    'Quotes you add are kept only on this device and appear in the feed with the others.',
  noPersonal: 'Nothing added yet. Copy a line from a book you are reading.',
  addQuote: 'Add a quote',
  editQuote: 'Edit quote',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  cancel: 'Cancel',
  quoteSaved: 'Quote saved.',
  quoteDeleted: 'Quote deleted.',
  quoteTextLabel: 'Quote',
  quoteTextHint: (max: number) => `Up to ${String(max)} characters.`,
  quoteAuthorLabel: 'Author (optional)',
  quoteSourceLabel: 'Book or source (optional)',
  quoteSourceHint: 'For example the title and page.',
  quoteLanguageLabel: 'Language of the quote',
  quoteTagsLabel: 'Categories (optional)',
  quoteTagsHint: 'A quote without a category shows only while all categories are selected.',
  textRequired: 'Enter the quote.',
  textTooLong: (max: number) => `Shorten the quote to ${String(max)} characters or fewer.`,
  backupHint:
    'Clearing browser data deletes them. Download a backup to keep them safe or move them to another device.',
  exportQuotes: 'Download backup',
  importQuotes: 'Restore from backup',
  imported: (count: number) =>
    count === 0
      ? 'No new quotes in this backup.'
      : `Added ${String(count)} ${count === 1 ? 'quote' : 'quotes'} from the backup.`,
  importFailed: 'This file is not a VerbeApp backup.',
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

/** "1 cytat", "3 cytaty", "5 cytatów", "22 cytaty", "12 cytatów". */
function polishQuotes(count: number): string {
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const form =
    count === 1
      ? 'cytat'
      : lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)
        ? 'cytaty'
        : 'cytatów';
  return `${String(count)} ${form}`;
}

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
  aiDraftTranslation: 'Przetłumaczone przez AI',
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
  swipeHint: 'Przesuń w lewo, aby zobaczyć kolejny cytat',
  keyboardHint: 'Naciśnij →, aby zobaczyć kolejny cytat',
  dismissHint: 'Rozumiem',
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
  aboutHeading: 'O VerbeApp',
  aboutText:
    'Darmowa aplikacja open source do samorozwoju: jedna mądra myśl naraz, do przemyślenia i zastosowania w praktyce.',
  aboutSources:
    'Cytaty pochodzą z książek w domenie publicznej i każdy jest sprawdzony słowo w słowo z wydaniem źródłowym. Sentencje społeczności są autorskie i wolne do ponownego użycia.',
  aboutLink: 'Kod źródłowy na GitHubie',
  emptyFeed: 'Brak pasujących cytatów. Wybierz więcej kategorii lub przywróć ukryte cytaty.',
  newTab: '(otwiera się w nowej karcie)',
  by: 'autor:',
  personalQuote: 'Twój cytat',
  personalHeading: 'Twoje cytaty',
  personalHint:
    'Dodane cytaty są zapisane tylko na tym urządzeniu i pojawiają się w feedzie razem z pozostałymi.',
  noPersonal: 'Nic jeszcze nie dodano. Przepisz zdanie z książki, którą czytasz.',
  addQuote: 'Dodaj cytat',
  editQuote: 'Edytuj cytat',
  edit: 'Edytuj',
  delete: 'Usuń',
  save: 'Zapisz',
  cancel: 'Anuluj',
  quoteSaved: 'Cytat zapisany.',
  quoteDeleted: 'Cytat usunięty.',
  quoteTextLabel: 'Cytat',
  quoteTextHint: (max: number) => `Do ${String(max)} znaków.`,
  quoteAuthorLabel: 'Autor (opcjonalnie)',
  quoteSourceLabel: 'Książka lub źródło (opcjonalnie)',
  quoteSourceHint: 'Na przykład tytuł i strona.',
  quoteLanguageLabel: 'Język cytatu',
  quoteTagsLabel: 'Kategorie (opcjonalnie)',
  quoteTagsHint: 'Cytat bez kategorii pojawia się tylko wtedy, gdy wybrane są wszystkie kategorie.',
  textRequired: 'Wpisz cytat.',
  textTooLong: (max: number) => `Skróć cytat do najwyżej ${String(max)} znaków.`,
  backupHint:
    'Wyczyszczenie danych przeglądarki je usuwa. Pobierz kopię zapasową, aby je zabezpieczyć lub przenieść na inne urządzenie.',
  exportQuotes: 'Pobierz kopię zapasową',
  importQuotes: 'Przywróć z kopii',
  imported: (count: number) =>
    count === 0 ? 'W tej kopii nie ma nowych cytatów.' : `Dodano z kopii: ${polishQuotes(count)}.`,
  importFailed: 'Ten plik nie jest kopią zapasową VerbeApp.',
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
