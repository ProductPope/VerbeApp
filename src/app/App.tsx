import { useEffect, useState } from 'react';
import type { Catalog } from './catalog/catalog.js';
import { CategoryFilter } from './components/CategoryFilter.js';
import { Feed } from './components/Feed.js';
import { Icon } from './components/Icon.js';
import { SavedView } from './components/SavedView.js';
import { eligibleCards } from './feed/queue.js';
import { isLanguage, LANGUAGES, STRINGS } from './i18n/strings.js';
import { toggle, usePreferences, type PreferencesStore } from './prefs/store.js';

interface AppProps {
  catalog: Catalog;
  store: PreferencesStore;
  random: () => number;
  reducedMotion: boolean;
}

type View = 'feed' | 'saved';

const LANGUAGE_NAMES = { en: 'English', pl: 'Polski' } as const;

export function App({ catalog, store, random, reducedMotion }: AppProps) {
  const prefs = usePreferences(store);
  const strings = STRINGS[prefs.language];
  const [view, setView] = useState<View>('feed');
  const [lastHidden, setLastHidden] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = prefs.language;
    document.title = `${strings.appName}: ${strings.tagline}`;
  }, [prefs.language, strings]);

  const eligible = eligibleCards(catalog.cards, prefs.hidden, prefs.tags);

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
        <div className="app-bar">
          <h1 className="app-title">{strings.appName}</h1>
          <nav aria-label={strings.mainNavigation}>
            <ul className="tabs">
              {(['feed', 'saved'] as const).map((target) => (
                <li key={target}>
                  <button
                    type="button"
                    className="tab"
                    aria-current={view === target ? 'page' : undefined}
                    onClick={() => {
                      setView(target);
                    }}
                  >
                    {target === 'feed' ? strings.feedTab : strings.savedTab}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <label className="language">
            <span className="visually-hidden">{strings.languageLabel}</span>
            <select
              value={prefs.language}
              onChange={(event) => {
                const language = event.target.value;
                if (isLanguage(language)) store.update((current) => ({ ...current, language }));
              }}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language} lang={language}>
                  {LANGUAGE_NAMES[language]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {view === 'feed' && (
          <div className="toolbar">
            <CategoryFilter
              tags={catalog.tags}
              selected={prefs.tags}
              language={prefs.language}
              strings={strings}
              onChange={(tags) => {
                store.update((current) => ({ ...current, tags }));
              }}
            />
            <button
              type="button"
              className="icon-button autoplay"
              aria-pressed={prefs.autoplay}
              onClick={() => {
                store.update((current) => ({ ...current, autoplay: !current.autoplay }));
              }}
            >
              <Icon name={prefs.autoplay ? 'pause' : 'play'} />
              <span className="visually-hidden">
                {prefs.autoplay ? strings.autoplayOn : strings.autoplayOff}
              </span>
            </button>
          </div>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        {view === 'feed' ? (
          <Feed
            cards={eligible}
            strings={strings}
            language={prefs.language}
            favorites={prefs.favorites}
            autoplay={prefs.autoplay}
            reducedMotion={reducedMotion}
            random={random}
            onToggleFavorite={toggleFavorite}
            onHide={hide}
          />
        ) : (
          <SavedView
            cards={catalog.cards}
            favorites={prefs.favorites}
            hidden={prefs.hidden}
            language={prefs.language}
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
