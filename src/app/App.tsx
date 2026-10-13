import { useCallback, useEffect, useRef, useState } from 'react';
import type { Catalog } from './catalog/catalog.js';
import { Feed } from './components/Feed.js';
import { Icon } from './components/Icon.js';
import { HABIT_QUOTE_ID, StreakButton, StreakCelebration } from './components/ReadingStreak.js';
import { NotificationSetting } from './components/NotificationSetting.js';
import { PersonalQuoteDialog } from './components/PersonalQuoteDialog.js';
import { PersonalQuotes } from './components/PersonalQuotes.js';
import { ProfileDialog } from './components/ProfileDialog.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import { eligibleCards } from './feed/queue.js';
import { STRINGS, TRANSLATION_LANGUAGE } from './i18n/strings.js';
import type { PushService } from './notifications/push.js';
import { writeSharedPrefs } from './notifications/shared-prefs.js';
import { downloadFile, requestPersistentStorage } from './personal/download.js';
import {
  cleanDraft,
  exportPersonalQuotes,
  importPersonalQuotes,
  newPersonalId,
  personalCard,
  type PersonalQuote,
  type PersonalQuoteDraft,
  type PersonalStore,
} from './personal/personal.js';
import { toggle, usePreferences, type PreferencesStore } from './prefs/store.js';
import { useLocalStore } from './storage/local-store.js';
import type { StreakStore } from './streak/streak.js';
import { trackActiveTime } from './streak/tracker.js';

/** How long an offer to undo stays on screen. */
const UNDO_MS = 8_000;

/** How long a plain confirmation stays on screen. */
const NOTICE_MS = 5_000;

/** A short message in the status region, optionally with an Undo button. */
interface Notice {
  message: string;
  undo?: () => void;
  /** The quote the notice is about, so restoring it elsewhere dismisses it. */
  cardId?: string;
}

/** Which personal quote the form is open for: a new one or an existing one. */
type Editing = { quote: PersonalQuote | undefined } | null;

interface AppProps {
  catalog: Catalog;
  store: PreferencesStore;
  streakStore: StreakStore;
  personalStore: PersonalStore;
  random: () => number;
  reducedMotion: boolean;
  /** Daily notifications; undefined when unsupported or not configured. */
  push?: PushService | undefined;
  /** Card to show first, e.g. the one a notification was about. */
  initialCardId?: string | undefined;
  /** Offers a file to save; replaceable in tests. */
  saveFile?: (name: string, contents: string) => void;
  /** Asks the browser to keep this site's data; replaceable in tests. */
  persistStorage?: () => void;
}

export function App({
  catalog,
  store,
  streakStore,
  personalStore,
  random,
  reducedMotion,
  push,
  initialCardId,
  saveFile = downloadFile,
  persistStorage = requestPersistentStorage,
}: AppProps) {
  const prefs = usePreferences(store);
  const personal = useLocalStore(personalStore);
  const strings = STRINGS[prefs.language];
  const [notice, setNotice] = useState<Notice | null>(null);
  const [undoFocused, setUndoFocused] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  // Notices leave after a while, but never while their Undo button has focus.
  // Hidden quotes can still be restored from the profile at any time.
  useEffect(() => {
    if (notice === null || undoFocused) return;
    const timer = setTimeout(
      () => {
        setNotice((current) => (current === notice ? null : current));
      },
      notice.undo ? UNDO_MS : NOTICE_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [notice, undoFocused]);
  const settings = useRef<HTMLDialogElement>(null);
  const profile = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.documentElement.lang = prefs.language;
    document.title = `${strings.appName}: ${strings.tagline}`;
  }, [prefs.language, strings]);

  useEffect(() => trackActiveTime(streakStore), [streakStore]);

  // Let the service worker pick a notification quote that respects these choices.
  const { language, translation, hidden, tags, notifyHour } = prefs;
  useEffect(() => {
    void writeSharedPrefs({ language, translation, hidden, tags, hour: notifyHour }).catch(
      () => undefined,
    );
  }, [language, translation, hidden, tags, notifyHour]);

  const cards = [...catalog.cards, ...personal.map(personalCard)];
  const eligible = eligibleCards(cards, prefs.hidden, prefs.tags);
  const translationLanguage = prefs.translation ? TRANSLATION_LANGUAGE : undefined;
  const habitQuote = catalog.cards.find((card) => card.id === HABIT_QUOTE_ID);

  const markSwipeHintSeen = useCallback(() => {
    store.update((current) =>
      current.swipeHintSeen ? current : { ...current, swipeHintSeen: true },
    );
  }, [store]);

  function toggleFavorite(id: string) {
    store.update((current) => ({ ...current, favorites: toggle(current.favorites, id) }));
  }

  function hide(id: string) {
    store.update((current) => ({
      ...current,
      hidden: current.hidden.includes(id) ? current.hidden : [...current.hidden, id],
    }));
    setNotice({
      message: strings.hidden,
      cardId: id,
      undo: () => {
        restore(id);
      },
    });
  }

  function restore(id: string) {
    store.update((current) => ({ ...current, hidden: current.hidden.filter((h) => h !== id) }));
    setNotice((current) => (current?.cardId === id ? null : current));
  }

  function savePersonal(draft: PersonalQuoteDraft, existing: PersonalQuote | undefined) {
    const clean = cleanDraft(
      draft,
      catalog.tags.map((tag) => tag.id),
    );
    personalStore.update((quotes) =>
      existing
        ? quotes.map((quote) => (quote.id === existing.id ? { ...quote, ...clean } : quote))
        : [...quotes, { ...clean, id: newPersonalId(), added: new Date().toISOString() }],
    );
    if (!existing) persistStorage();
    setNotice({ message: strings.quoteSaved });
  }

  function deletePersonal(quote: PersonalQuote) {
    const index = personalStore.get().findIndex((item) => item.id === quote.id);
    personalStore.update((quotes) => quotes.filter((item) => item.id !== quote.id));
    setNotice({
      message: strings.quoteDeleted,
      cardId: quote.id,
      undo: () => {
        personalStore.update((quotes) =>
          quotes.some((item) => item.id === quote.id)
            ? quotes
            : [...quotes.slice(0, index), quote, ...quotes.slice(index)],
        );
        setNotice(null);
      },
    });
  }

  function exportPersonal() {
    const date = new Date().toISOString().slice(0, 10);
    saveFile(`verbeapp-my-quotes-${date}.json`, exportPersonalQuotes(personalStore.get()));
  }

  function importPersonal(json: string) {
    try {
      const { quotes, added } = importPersonalQuotes(json, personalStore.get());
      personalStore.update((current) => (added === 0 ? current : quotes));
      setNotice({ message: strings.imported(added) });
    } catch {
      setNotice({ message: strings.importFailed });
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        {strings.skipToContent}
      </a>
      <header className="app-header">
        <h1 className="app-title">{strings.appName}</h1>
        <StreakButton
          store={streakStore}
          strings={strings}
          language={prefs.language}
          quote={habitQuote}
          translationLanguage={translationLanguage}
        />
        <button
          type="button"
          className="icon-button"
          aria-pressed={prefs.autoplay}
          onClick={() => {
            store.update((current) => ({ ...current, autoplay: !current.autoplay }));
          }}
        >
          <Icon name={prefs.autoplay ? 'pause' : 'play'} />
          <span className="visually-hidden">{strings.autoplay}</span>
        </button>
        <button
          type="button"
          className="icon-button"
          aria-haspopup="dialog"
          onClick={() => {
            profile.current?.showModal();
          }}
        >
          <Icon name="user" />
          <span className="visually-hidden">{strings.profile}</span>
        </button>
        <button
          type="button"
          className="icon-button"
          aria-haspopup="dialog"
          onClick={() => {
            settings.current?.showModal();
          }}
        >
          <Icon name="settings" />
          <span className="visually-hidden">{strings.settings}</span>
        </button>
      </header>
      <SettingsDialog
        ref={settings}
        tags={catalog.tags}
        selectedTags={prefs.tags}
        language={prefs.language}
        strings={strings}
        onTagsChange={(tags) => {
          store.update((current) => ({ ...current, tags }));
        }}
      />
      <ProfileDialog
        ref={profile}
        cards={cards}
        favorites={prefs.favorites}
        hidden={prefs.hidden}
        language={prefs.language}
        translation={prefs.translation}
        translationLanguage={translationLanguage}
        strings={strings}
        onToggleFavorite={toggleFavorite}
        onRestore={restore}
        onLanguageChange={(language) => {
          store.update((current) => ({ ...current, language }));
        }}
        onTranslationChange={(translation) => {
          store.update((current) => ({ ...current, translation }));
        }}
        personal={
          <PersonalQuotes
            quotes={personal}
            strings={strings}
            onAdd={() => {
              setEditing({ quote: undefined });
            }}
            onEdit={(quote) => {
              setEditing({ quote });
            }}
            onDelete={deletePersonal}
            onExport={exportPersonal}
            onImport={importPersonal}
          />
        }
        notification={
          push && (
            <NotificationSetting
              push={push}
              enabled={prefs.notify}
              hour={prefs.notifyHour}
              strings={strings}
              onChange={(change) => {
                store.update((current) => ({ ...current, ...change }));
              }}
            />
          )
        }
      />
      <main id="main" tabIndex={-1}>
        <Feed
          cards={eligible}
          strings={strings}
          language={prefs.language}
          translationLanguage={translationLanguage}
          favorites={prefs.favorites}
          autoplay={prefs.autoplay}
          reducedMotion={reducedMotion}
          random={random}
          initialCardId={initialCardId}
          swipeHint={!prefs.swipeHintSeen}
          onSwipeHintDone={markSwipeHintSeen}
          onToggleFavorite={toggleFavorite}
          onHide={hide}
        />
      </main>
      {editing && (
        <PersonalQuoteDialog
          quote={editing.quote}
          tags={catalog.tags}
          language={prefs.language}
          strings={strings}
          onSave={(draft) => {
            savePersonal(draft, editing.quote);
          }}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
      <div className="status" role="status">
        {notice !== null &&
          (notice.undo ? (
            <p className="toast">
              {notice.message}{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  notice.undo?.();
                  setUndoFocused(false);
                }}
                onFocus={() => {
                  setUndoFocused(true);
                }}
                onBlur={() => {
                  setUndoFocused(false);
                }}
              >
                {strings.undo}
              </button>
            </p>
          ) : (
            <p className="toast toast-plain">{notice.message}</p>
          ))}
        <StreakCelebration store={streakStore} strings={strings} suppressed={notice !== null} />
      </div>
    </>
  );
}
