import { useEffect, useRef, useState } from 'react';
import type { Catalog } from './catalog/catalog.js';
import { Feed } from './components/Feed.js';
import { Icon } from './components/Icon.js';
import { SavedView } from './components/SavedView.js';
import { NotificationSetting } from './components/NotificationSetting.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import { eligibleCards } from './feed/queue.js';
import { STRINGS, TRANSLATION_LANGUAGE } from './i18n/strings.js';
import type { PushService } from './notifications/push.js';
import { writeSharedPrefs } from './notifications/shared-prefs.js';
import { toggle, usePreferences, type PreferencesStore } from './prefs/store.js';

interface AppProps {
  catalog: Catalog;
  store: PreferencesStore;
  random: () => number;
  reducedMotion: boolean;
  /** Daily notifications; undefined when unsupported or not configured. */
  push?: PushService | undefined;
  /** Card to show first, e.g. the one a notification was about. */
  initialCardId?: string | undefined;
}

type View = 'feed' | 'saved';

export function App({ catalog, store, random, reducedMotion, push, initialCardId }: AppProps) {
  const prefs = usePreferences(store);
  const strings = STRINGS[prefs.language];
  const [view, setView] = useState<View>('feed');
  const [lastHidden, setLastHidden] = useState<string | null>(null);
  const settings = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.documentElement.lang = prefs.language;
    document.title = `${strings.appName}: ${strings.tagline}`;
  }, [prefs.language, strings]);

  // Let the service worker pick a notification quote that respects these choices.
  const { language, translation, hidden, tags, notifyHour } = prefs;
  useEffect(() => {
    void writeSharedPrefs({ language, translation, hidden, tags, hour: notifyHour }).catch(
      () => undefined,
    );
  }, [language, translation, hidden, tags, notifyHour]);

  const eligible = eligibleCards(catalog.cards, prefs.hidden, prefs.tags);
  const translationLanguage = prefs.translation ? TRANSLATION_LANGUAGE : undefined;

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
        {view === 'feed' && (
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
        )}
        <button
          type="button"
          className="icon-button"
          aria-pressed={view === 'saved'}
          onClick={() => {
            setView(view === 'saved' ? 'feed' : 'saved');
          }}
        >
          <Icon name="bookmark" filled={view === 'saved'} />
          <span className="visually-hidden">{strings.saved}</span>
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
        translation={prefs.translation}
        strings={strings}
        onTagsChange={(tags) => {
          store.update((current) => ({ ...current, tags }));
        }}
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
        {view === 'feed' ? (
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
            onToggleFavorite={toggleFavorite}
            onHide={hide}
          />
        ) : (
          <SavedView
            cards={catalog.cards}
            favorites={prefs.favorites}
            hidden={prefs.hidden}
            language={prefs.language}
            translationLanguage={translationLanguage}
            strings={strings}
            onToggleFavorite={toggleFavorite}
            onRestore={restore}
          />
        )}
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
              }}
            >
              {strings.undo}
            </button>
          </p>
        )}
      </div>
    </>
  );
}
