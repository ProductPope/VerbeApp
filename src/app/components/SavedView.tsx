import { localized, type Card } from '../catalog/catalog.js';
import type { Language, Strings } from '../i18n/strings.js';

interface SavedViewProps {
  cards: Card[];
  favorites: string[];
  hidden: string[];
  language: Language;
  strings: Strings;
  onToggleFavorite: (id: string) => void;
  onRestore: (id: string) => void;
}

function SavedList({
  ids,
  cards,
  language,
  actionLabel,
  onAction,
}: {
  ids: string[];
  cards: Map<string, Card>;
  language: Language;
  actionLabel: string;
  onAction: (id: string) => void;
}) {
  return (
    <ul className="saved-list">
      {ids.map((id) => {
        const card = cards.get(id);
        if (!card) return null;
        const translated = card.translations[language];
        return (
          <li key={id} className="saved-item">
            <blockquote lang={translated === undefined ? 'en' : language}>
              <p>{translated ?? card.text}</p>
            </blockquote>
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

/** Favourites to reread, and hidden quotes that can be restored. */
export function SavedView({
  cards,
  favorites,
  hidden,
  language,
  strings,
  onToggleFavorite,
  onRestore,
}: SavedViewProps) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const knownFavorites = favorites.filter((id) => byId.has(id));
  const knownHidden = hidden.filter((id) => byId.has(id));

  return (
    <div className="saved">
      <section aria-labelledby="favorites-heading">
        <h2 id="favorites-heading">{strings.favoritesHeading}</h2>
        {knownFavorites.length === 0 ? (
          <p className="muted">{strings.noFavorites}</p>
        ) : (
          <SavedList
            ids={knownFavorites}
            cards={byId}
            language={language}
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
            actionLabel={strings.restore}
            onAction={onRestore}
          />
        )}
      </section>
    </div>
  );
}
