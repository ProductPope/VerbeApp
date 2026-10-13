import type { ReactNode } from 'react';
import { localized, type Card } from '../catalog/catalog.js';
import { isLanguage, LANGUAGES, type Language, type Strings } from '../i18n/strings.js';

const LANGUAGE_NAMES = { en: 'English', pl: 'Polski' } as const;

interface ProfileViewProps {
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
  ProfileViewProps,
  | 'language'
  | 'translation'
  | 'strings'
  | 'onLanguageChange'
  | 'onTranslationChange'
  | 'notification'
>) {
  return (
    <section aria-labelledby="preferences-heading">
      <h2 id="preferences-heading">{strings.preferencesHeading}</h2>
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
    </section>
  );
}

/** Reading preferences, favourites to reread, and hidden quotes that can be restored. */
export function ProfileView({
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
}: ProfileViewProps) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const knownFavorites = favorites.filter((id) => byId.has(id));
  const knownHidden = hidden.filter((id) => byId.has(id));

  return (
    <div className="saved">
      <Preferences
        language={language}
        translation={translation}
        strings={strings}
        onLanguageChange={onLanguageChange}
        onTranslationChange={onTranslationChange}
        notification={notification}
      />
      <section aria-labelledby="favorites-heading">
        <h2 id="favorites-heading">{strings.favoritesHeading}</h2>
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
        <h2 id="hidden-heading">{strings.hiddenHeading}</h2>
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
    </div>
  );
}
