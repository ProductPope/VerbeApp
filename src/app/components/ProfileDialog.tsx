import type { ReactNode, Ref } from 'react';
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
            <blockquote lang="en">
              <p>{card.text}</p>
            </blockquote>
            {translation !== undefined && (
              <p className="saved-translation" lang={translationLanguage}>
                {translation}
              </p>
            )}
            <p className="saved-author">{localized(card.author, language)}</p>
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

/**
 * Reading preferences, favourites to reread, and hidden quotes that can be
 * restored, in a modal dialog that works like the settings one: it traps
 * focus, closes with the X button or Escape and returns focus to its opener.
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
  ref,
}: ProfileDialogProps) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const knownFavorites = favorites.filter((id) => byId.has(id));
  const knownHidden = hidden.filter((id) => byId.has(id));

  return (
    <dialog ref={ref} className="settings" aria-labelledby="profile-heading">
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
      <div className="settings-body saved">
        <Preferences
          language={language}
          translation={translation}
          strings={strings}
          onLanguageChange={onLanguageChange}
          onTranslationChange={onTranslationChange}
          notification={notification}
        />
        <section aria-labelledby="favorites-heading">
          <h3 id="favorites-heading">{strings.favoritesHeading}</h3>
          {knownFavorites.length === 0 ? (
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
          )}
        </section>
        <section aria-labelledby="hidden-heading">
          <h3 id="hidden-heading">{strings.hiddenHeading}</h3>
          {knownHidden.length === 0 ? (
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
          )}
        </section>
        {/* Last and collapsed, so it never competes with the reader's own content. */}
        <section aria-labelledby="about-heading">
          <details className="disclosure about">
            <summary id="about-heading">{strings.aboutHeading}</summary>
            <p>{strings.aboutText}</p>
            <p>{strings.aboutSources}</p>
            <p>
              <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
                {strings.aboutLink}
              </a>
            </p>
          </details>
        </section>
      </div>
    </dialog>
  );
}
