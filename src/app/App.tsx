import { useCallback, useEffect, useRef, useState } from 'react';
import type { Catalog } from './catalog/catalog.js';
import { Feed } from './components/Feed.js';
import { Icon } from './components/Icon.js';
import { HABIT_QUOTE_ID, StreakButton, StreakCelebration } from './components/ReadingStreak.js';
import { NotificationSetting } from './components/NotificationSetting.js';
import { ProfileDialog } from './components/ProfileDialog.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import { eligibleCards } from './feed/queue.js';
import { STRINGS, TRANSLATION_LANGUAGE } from './i18n/strings.js';
import type { PushService } from './notifications/push.js';
import { writeSharedPrefs } from './notifications/shared-prefs.js';
import { toggle, usePreferences, type PreferencesStore } from './prefs/store.js';
import type { StreakStore } from './streak/streak.js';
import { trackActiveTime } from './streak/tracker.js';

/** How long the offer to undo hiding a quote stays on screen. */
const UNDO_MS = 8_000;

interface AppProps {
  catalog: Catalog;
  store: PreferencesStore;
  streakStore: StreakStore;
  random: () => number;
  reducedMotion: boolean;
  /** Daily notifications; undefined when unsupported or not configured. */
  push?: PushService | undefined;
  /** Card to show first, e.g. the one a notification was about. */
  initialCardId?: string | undefined;
}

export function App({
  catalog,
  store,
  streakStore,
  random,
  reducedMotion,
  push,
  initialCardId,
}: AppProps) {
  const prefs = usePreferences(store);
  const strings = STRINGS[prefs.language];
  const [lastHidden, setLastHidden] = useState<string | null>(null);
  const [undoFocused, setUndoFocused] = useState(false);

  // The undo offer leaves after a while, but never while it has focus. Hidden
  // quotes can still be restored from the profile at any time.
  useEffect(() => {
    if (lastHidden === null || undoFocused) return;
    const timer = setTimeout(() => {
      setLastHidden(null);
    }, UNDO_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [lastHidden, undoFocused]);
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

  const eligible = eligibleCards(catalog.cards, prefs.hidden, prefs.tags);
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
    setLastHidden(id);
  }

  function restore(id: string) {
    store.update((current) => ({ ...current, hidden: current.hidden.filter((h) => h !== id) }));
    if (lastHidden === id) setLastHidden(null);
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
        cards={catalog.cards}
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
      <div className="status" role="status">
        {lastHidden !== null && (
          <p className="toast">
            {strings.hidden}{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                restore(lastHidden);
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
        )}
        <StreakCelebration store={streakStore} strings={strings} suppressed={lastHidden !== null} />
      </div>
    </>
  );
}
