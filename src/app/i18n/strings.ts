export const LANGUAGES = ['en', 'pl'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Quotes stay in English; this is the language of the optional translation under them. */
export const TRANSLATION_LANGUAGE: Language = 'pl';

const en = {
  appName: 'Verbe',
  tagline: 'Wise words, one at a time',
  skipToContent: 'Skip to quotes',
  profile: 'Your profile',
  settings: 'Settings',
  close: 'Close',
  languageLabel: 'App language',
  translationLabel: 'Polish translation',
  translationHint: 'Draft translations prepared with AI help. Corrections are welcome on GitHub.',
  aiDraftTranslation: 'AI Translated',
  notificationLabel: 'Daily reminder',
  notificationTime: 'Time',
  notificationHint:
    'A short nudge to open Verbe once a day, at the time you choose. Only this device is notified.',
  /** Daily notification copy; it invites the reader in and keeps the quote for the app. */
  notificationTitle: 'Your thought for today is waiting',
  notificationInvites: [
    'Take a minute for one wise thought.',
    'A new quote is ready. Open Verbe and read it.',
    'Pause for a moment and see what today brings.',
    'One good sentence can change the day. Come and read it.',
  ] as readonly string[],
  notificationBlocked:
    'Notifications are blocked. Allow them for this site in your browser settings.',
  notificationFailed: 'Could not change the notification. Check your connection and try again.',
  categoriesLabel: 'Categories',
  allCategories: 'All',
  sourceLabel: 'Source',
  ownQuotesLabel: 'Own',
  ownQuotesHint: 'Show only the quotes you added yourself.',
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
  profileLists: 'Your lists',
  backToProfile: 'Back to your profile',
  hiddenHeading: 'Hidden quotes',
  noFavorites: 'No favourites yet. Tap the heart on a quote to keep it here.',
  noHidden: 'Nothing hidden.',
  restore: 'Show again',
  aboutHeading: 'About Verbe',
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
  importFailed: 'This file is not a Verbe backup.',
  csvImport: 'Import from CSV',
  csvHelpSummary: 'How to prepare a CSV file',
  csvHelpIntro:
    'Save a spreadsheet as CSV in UTF-8. The first row names the columns and only text is required. Commas and semicolons both work as separators.',
  csvColumnHeader: 'Column',
  csvMeaningHeader: 'What goes in it',
  csvTextColumn: 'The quote. Required.',
  csvAuthorColumn: 'Who said or wrote it.',
  csvSourceColumn: 'Book, page or other source.',
  csvLanguageColumn: 'en or pl. English when empty.',
  csvCategoriesColumn: (names: string) =>
    `Separate several with a vertical bar (|). Available: ${names}.`,
  csvHelpQuotes:
    'Put a cell in double quotes when it contains a comma, a semicolon or a line break, and write a quote mark inside it as two ("").',
  csvExample: 'Example',
  csvTemplate: 'Download template',
  csvReady: (count: number) =>
    `${String(count)} ${count === 1 ? 'quote' : 'quotes'} ready to import.`,
  csvDuplicates: (count: number) =>
    `${String(count)} already saved or repeated in the file, skipped.`,
  csvProblemsHeading: 'Rows that will be skipped',
  csvMoreProblems: (count: number) => `And ${String(count)} more.`,
  csvRow: (row: number) => `Row ${String(row)}`,
  csvNoText: 'no quote text.',
  csvTextTooLong: (max: number) => `the quote is longer than ${String(max)} characters.`,
  csvUnknownLanguage: (value: string) => `unknown language “${value}”; use en or pl.`,
  csvUnknownCategory: (value: string) => `unknown category “${value}”.`,
  csvEmpty: 'The file is empty.',
  csvNoTextColumn:
    'The first row must name the columns, with at least one called text. Download the template to see how.',
  csvUnclosedQuote: 'A double quote in the file is never closed, so it cannot be read.',
  csvTooLarge: 'The file is larger than 1 MB. Split it into smaller files.',
  csvTooManyRows: (max: number) => `The file has more than ${String(max)} quotes. Split it.`,
  csvConfirm: (count: number) => `Import ${String(count)} ${count === 1 ? 'quote' : 'quotes'}`,
  csvNothing: 'There is nothing new to import.',
  csvImported: (count: number) =>
    `Added ${String(count)} ${count === 1 ? 'quote' : 'quotes'} from the CSV file.`,
  csvPreviewHeading: 'Preview',
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
    'A day counts after 10 seconds in the app. Come back tomorrow to keep the flame alight.',
  installHeading: 'Install Verbe',
  installOffer: 'Keep Verbe on your home screen: a wise thought in one tap, even offline.',
  installAccept: 'Install',
  installLater: 'Not now',
  installApp: 'Install the app',
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
  appName: 'Verbe',
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
  notificationLabel: 'Codzienne przypomnienie',
  notificationTime: 'Godzina',
  notificationHint:
    'Krótka zachęta, żeby raz dziennie zajrzeć do Verbe, o wybranej godzinie. Powiadomienie dostaje tylko to urządzenie.',
  notificationTitle: 'Twoja myśl na dziś czeka',
  notificationInvites: [
    'Znajdź minutę na jedną mądrą myśl.',
    'Nowy cytat jest gotowy. Otwórz Verbe i przeczytaj go.',
    'Zatrzymaj się na chwilę i zobacz, co przynosi dziś.',
    'Jedno dobre zdanie potrafi zmienić dzień. Wejdź i przeczytaj.',
  ],
  notificationBlocked:
    'Powiadomienia są zablokowane. Zezwól na nie dla tej strony w ustawieniach przeglądarki.',
  notificationFailed: 'Nie udało się zmienić powiadomienia. Sprawdź połączenie i spróbuj ponownie.',
  categoriesLabel: 'Kategorie',
  allCategories: 'Wszystkie',
  sourceLabel: 'Źródło',
  ownQuotesLabel: 'Własne',
  ownQuotesHint: 'Pokazuj tylko cytaty dodane przez Ciebie.',
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
  profileLists: 'Twoje listy',
  backToProfile: 'Wróć do profilu',
  hiddenHeading: 'Ukryte cytaty',
  noFavorites: 'Brak ulubionych. Stuknij serce przy cytacie, aby go tu zachować.',
  noHidden: 'Nic nie jest ukryte.',
  restore: 'Pokaż ponownie',
  aboutHeading: 'O Verbe',
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
  importFailed: 'Ten plik nie jest kopią zapasową Verbe.',
  csvImport: 'Importuj z CSV',
  csvHelpSummary: 'Jak przygotować plik CSV',
  csvHelpIntro:
    'Zapisz arkusz jako CSV w UTF-8. Pierwszy wiersz zawiera nazwy kolumn i wymagana jest tylko kolumna text. Separatorem może być przecinek albo średnik.',
  csvColumnHeader: 'Kolumna',
  csvMeaningHeader: 'Co wpisać',
  csvTextColumn: 'Cytat. Wymagane.',
  csvAuthorColumn: 'Kto to powiedział lub napisał.',
  csvSourceColumn: 'Książka, strona lub inne źródło.',
  csvLanguageColumn: 'en albo pl. Pusta komórka oznacza angielski.',
  csvCategoriesColumn: (names: string) =>
    `Kilka kategorii oddziel pionową kreską (|). Dostępne: ${names}.`,
  csvHelpQuotes:
    'Ujmij komórkę w cudzysłów, gdy zawiera przecinek, średnik lub nową linię, a cudzysłów w środku zapisz podwójnie ("").',
  csvExample: 'Przykład',
  csvTemplate: 'Pobierz szablon',
  csvReady: (count: number) => `Gotowe do importu: ${polishQuotes(count)}.`,
  csvDuplicates: (count: number) =>
    `Pominięte, bo już zapisane lub powtórzone w pliku: ${String(count)}.`,
  csvProblemsHeading: 'Wiersze, które zostaną pominięte',
  csvMoreProblems: (count: number) => `I jeszcze ${String(count)}.`,
  csvRow: (row: number) => `Wiersz ${String(row)}`,
  csvNoText: 'brak tekstu cytatu.',
  csvTextTooLong: (max: number) => `cytat jest dłuższy niż ${String(max)} znaków.`,
  csvUnknownLanguage: (value: string) => `nieznany język „${value}”; wpisz en albo pl.`,
  csvUnknownCategory: (value: string) => `nieznana kategoria „${value}”.`,
  csvEmpty: 'Plik jest pusty.',
  csvNoTextColumn:
    'Pierwszy wiersz musi zawierać nazwy kolumn, w tym kolumnę text. Pobierz szablon, aby zobaczyć przykład.',
  csvUnclosedQuote: 'W pliku jest niezamknięty cudzysłów, więc nie da się go odczytać.',
  csvTooLarge: 'Plik jest większy niż 1 MB. Podziel go na mniejsze.',
  csvTooManyRows: (max: number) => `Plik ma więcej niż ${String(max)} cytatów. Podziel go.`,
  csvConfirm: (count: number) => `Importuj ${polishQuotes(count)}`,
  csvNothing: 'Nie ma nic nowego do zaimportowania.',
  csvImported: (count: number) => `Dodano z pliku CSV: ${polishQuotes(count)}.`,
  csvPreviewHeading: 'Podgląd',
  streak: (days: number) =>
    `Seria czytania: ${String(days)} ${days === 1 ? 'dzień' : 'dni'} z rzędu`,
  streakReached: (days: number) =>
    days === 1 ? 'Pierwszy dzień serii czytania. Do jutra!' : `${String(days)} dni z rzędu. Brawo!`,
  streakTitle: 'Twoja seria czytania',
  streakDays: (days: number) => `${String(days)} ${days === 1 ? 'dzień' : 'dni'} z rzędu`,
  streakHabit:
    'To nawyki nas kształtują. Kilka spokojnych minut z dobrą myślą każdego dnia daje więcej niż długa lektura od święta.',
  streakHow: 'Dzień liczy się po 10 sekundach w aplikacji. Wróć jutro, żeby płomień nie zgasł.',
  installHeading: 'Zainstaluj Verbe',
  installOffer: 'Dodaj Verbe do ekranu głównego: mądra myśl jednym dotknięciem, także offline.',
  installAccept: 'Zainstaluj',
  installLater: 'Nie teraz',
  installApp: 'Zainstaluj aplikację',
};

export const STRINGS: Record<Language, Strings> = { en, pl };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
