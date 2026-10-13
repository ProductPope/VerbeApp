import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { localized, type Card } from '../catalog/catalog.js';
import { isLanguage, LANGUAGES, type Language, type Strings } from '../i18n/strings.js';
import { Icon } from './Icon.js';

const REPOSITORY_URL = 'https://github.com/ProductPope/VerbeApp';

const LANGUAGE_NAMES = { en: 'English', pl: 'Polski' } as const;

interface ProfileDialogProps {
  cards: Card[];
  favorites: string[];
  hidden: string[];
  language: Language;
  translation: boolean;
  translationLanguage: Language | undefined;
  strings: Strings;
  onToggleFavorite: (id: string) => void;
  onRestore: (id: string) => void;
  onLanguageChange: (language: Language) => void;
  onTranslationChange: (translation: boolean) => void;
  /** The daily notification setting, when this build has a push server. */
  notification?: ReactNode;
  /** The reader's own quotes, shown in their own view. */
  personal?: ReactNode;
  /** How many quotes the reader added, shown next to the way in. */
  personalCount?: number;
  /** Opens the browser's install dialog; only while the app can be installed. */
  onInstall?: (() => void) | undefined;
  ref?: Ref<HTMLDialogElement>;
}

function SavedList({
  ids,
  cards,
  language,
  translationLanguage,
  actionLabel,
  onAction,
}: {
  ids: string[];
  cards: Map<string, Card>;
  language: Language;
  translationLanguage: Language | undefined;
  actionLabel: string;
  onAction: (id: string) => void;
}) {
  return (
    <ul className="saved-list">
      {ids.map((id) => {
        const card = cards.get(id);
        if (!card) return null;
        const translation =
          translationLanguage === undefined ? undefined : card.translations[translationLanguage];
        return (
          <li key={id} className="saved-item">
            <blockquote lang={card.language ?? 'en'}>
              <p>{card.text}</p>
            </blockquote>
            {translation !== undefined && (
              <p className="saved-translation" lang={translationLanguage}>
                {translation}
              </p>
            )}
            <p className="saved-author">
              <span className="saved-author-name">{localized(card.author, language)}</span>
            </p>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onAction(id);
              }}
            >
              {actionLabel}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Preferences({
  language,
  translation,
  strings,
  onLanguageChange,
  onTranslationChange,
  notification,
}: Pick<
  ProfileDialogProps,
  | 'language'
  | 'translation'
  | 'strings'
  | 'onLanguageChange'
  | 'onTranslationChange'
  | 'notification'
>) {
  return (
    // Collapsed by default: favourites and hidden quotes are what the profile is
    // mostly opened for. The native disclosure is keyboard and screen reader
    // friendly and announces its expanded state.
    <section aria-labelledby="preferences-heading">
      <details className="disclosure">
        <summary id="preferences-heading">{strings.preferencesHeading}</summary>
        <div className="preferences">
          <div className="setting setting-row">
            <label className="setting-label" htmlFor="setting-translation">
              {strings.translationLabel}
            </label>
            <input
              id="setting-translation"
              className="switch"
              type="checkbox"
              role="switch"
              checked={translation}
              aria-describedby="setting-translation-hint"
              onChange={(event) => {
                onTranslationChange(event.target.checked);
              }}
            />
            <p className="setting-hint" id="setting-translation-hint">
              {strings.translationHint}
            </p>
          </div>
          {notification}
          <div className="setting setting-row">
            <label className="setting-label" htmlFor="setting-language">
              {strings.languageLabel}
            </label>
            <select
              id="setting-language"
              value={language}
              onChange={(event) => {
                const value = event.target.value;
                if (isLanguage(value)) onLanguageChange(value);
              }}
            >
              {LANGUAGES.map((option) => (
                <option key={option} value={option} lang={option}>
                  {LANGUAGE_NAMES[option]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>
    </section>
  );
}

/** The lists the profile opens one at a time, each in its own view. */
type View = 'personal' | 'favorites' | 'hidden';

/** A row that leads into one of the views, with how many items it holds. */
function ViewLink({
  label,
  count,
  onOpen,
  ref,
}: {
  label: string;
  count: number;
  onOpen: () => void;
  ref: Ref<HTMLButtonElement>;
}) {
  return (
    <li>
      <button ref={ref} type="button" className="profile-link" onClick={onOpen}>
        <span className="profile-link-label">{label}</span>{' '}
        {/* The space keeps the accessible name "Favourites 2", not "Favourites2". */}
        <span className="profile-link-count">{count}</span>
      </button>
    </li>
  );
}

/**
 * Reading preferences, then the way into the reader's own quotes, favourites
 * and hidden quotes, each opening in its own view with a back button, in a
 * modal dialog that works like the settings one: it traps focus, closes with
 * the X button or Escape and returns focus to its opener.
 */
export function ProfileDialog({
  cards,
  favorites,
  hidden,
  language,
  translation,
  translationLanguage,
  strings,
  onToggleFavorite,
  onRestore,
  onLanguageChange,
  onTranslationChange,
  notification,
  personal,
  personalCount = 0,
  onInstall,
  ref,
}: ProfileDialogProps) {
  const [view, setView] = useState<View | null>(null);
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const links = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});
  const byId = new Map(cards.map((card) => [card.id, card]));
  const knownFavorites = favorites.filter((id) => byId.has(id));
  const knownHidden = hidden.filter((id) => byId.has(id));

  // The view the reader just left, so focus can go back to the row they used.
  const leaving = useRef<View | null>(null);

  useEffect(() => {
    if (view !== null) {
      // Screen readers announce the new view's heading, and the next Tab lands
      // in its content rather than back at the top of the dialog.
      viewHeading.current?.focus();
    } else if (leaving.current !== null) {
      links.current[leaving.current]?.focus();
      leaving.current = null;
    }
  }, [view]);

  function back() {
    leaving.current = view;
    setView(null);
  }

  const titles: Record<View, string> = {
    personal: strings.personalHeading,
    favorites: strings.favoritesHeading,
    hidden: strings.hiddenHeading,
  };

  function content(current: View) {
    switch (current) {
      case 'personal':
        return personal;
      case 'favorites':
        return knownFavorites.length === 0 ? (
          <p className="muted">{strings.noFavorites}</p>
        ) : (
          <SavedList
            ids={knownFavorites}
            cards={byId}
            language={language}
            translationLanguage={translationLanguage}
            actionLabel={strings.removeFavorite}
            onAction={onToggleFavorite}
          />
        );
      case 'hidden':
        return knownHidden.length === 0 ? (
          <p className="muted">{strings.noHidden}</p>
        ) : (
          <SavedList
            ids={knownHidden}
            cards={byId}
            language={language}
            translationLanguage={translationLanguage}
            actionLabel={strings.restore}
            onAction={onRestore}
          />
        );
    }
  }

  return (
    <dialog
      ref={ref}
      className="settings"
      aria-labelledby="profile-heading"
      onClose={() => {
        // Opening the profile again starts from the top.
        setView(null);
      }}
    >
      <div className="settings-header">
        <h2 id="profile-heading">{strings.profile}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={(event) => {
            event.currentTarget.closest('dialog')?.close();
          }}
        >
          <Icon name="close" />
          <span className="visually-hidden">{strings.close}</span>
        </button>
      </div>
      {view === null ? (
        <div className="settings-body saved">
          <Preferences
            language={language}
            translation={translation}
            strings={strings}
            onLanguageChange={onLanguageChange}
            onTranslationChange={onTranslationChange}
            notification={notification}
          />
          <nav aria-label={strings.profileLists}>
            <ul className="profile-links">
              {personal !== undefined && (
                <ViewLink
                  ref={(element) => {
                    links.current.personal = element;
                  }}
                  label={strings.personalHeading}
                  count={personalCount}
                  onOpen={() => {
                    setView('personal');
                  }}
                />
              )}
              <ViewLink
                ref={(element) => {
                  links.current.favorites = element;
                }}
                label={strings.favoritesHeading}
                count={knownFavorites.length}
                onOpen={() => {
                  setView('favorites');
                }}
              />
              <ViewLink
                ref={(element) => {
                  links.current.hidden = element;
                }}
                label={strings.hiddenHeading}
                count={knownHidden.length}
                onOpen={() => {
                  setView('hidden');
                }}
              />
            </ul>
          </nav>
          {/* Last and collapsed, so it never competes with the reader's own content. */}
          <section aria-labelledby="about-heading">
            <details className="disclosure about">
              <summary id="about-heading">{strings.aboutHeading}</summary>
              <p>{strings.aboutText}</p>
              <p>{strings.aboutSources}</p>
              {onInstall && (
                <p>
                  <button type="button" className="text-button" onClick={onInstall}>
                    {strings.installApp}
                  </button>
                </p>
              )}
              <p>
                <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
                  {strings.aboutLink}
                </a>
              </p>
            </details>
          </section>
        </div>
      ) : (
        <section className="settings-body saved" aria-labelledby="profile-view-heading">
          <div className="profile-view-header">
            <button type="button" className="icon-button" onClick={back}>
              <Icon name="arrowLeft" />
              <span className="visually-hidden">{strings.backToProfile}</span>
            </button>
            <h3 id="profile-view-heading" ref={viewHeading} tabIndex={-1}>
              {titles[view]}
            </h3>
          </div>
          {content(view)}
        </section>
      )}
    </dialog>
  );
}
