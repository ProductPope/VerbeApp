import type { Ref } from 'react';
import { localized, type Card } from '../catalog/catalog.js';
import type { Language, Strings } from '../i18n/strings.js';
import { Icon } from './Icon.js';

interface QuoteCardProps {
  card: Card;
  position: number;
  language: Language;
  strings: Strings;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onHide: (id: string) => void;
  ref?: Ref<HTMLElement>;
}

/** One quote in the feed: an ARIA feed article with its own actions. */
export function QuoteCard({
  card,
  position,
  language,
  strings,
  favorite,
  onToggleFavorite,
  onHide,
  ref,
}: QuoteCardProps) {
  const translated = card.translations[language];
  const text = translated ?? card.text;
  const textLanguage = translated === undefined ? 'en' : language;
  const textId = `quote-${String(position)}-text`;
  const captionId = `quote-${String(position)}-caption`;
  const author = localized(card.author, language);

  return (
    <article
      ref={ref}
      className="card"
      // Feed articles must be focusable so Page Down and Page Up can move between them.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-posinset={position}
      aria-setsize={-1}
      aria-labelledby={textId}
      aria-describedby={captionId}
      data-card-id={card.id}
    >
      <figure className="card-figure">
        {card.kind === 'community' && <p className="card-badge">{strings.communitySaying}</p>}
        <blockquote className="card-text" id={textId} lang={textLanguage}>
          <p>{text}</p>
        </blockquote>
        <figcaption className="card-caption" id={captionId}>
          {card.kind === 'quote' ? (
            <>
              <span className="card-author">{author}</span>
              <span className="card-source">
                <cite>{card.work}</cite>, {card.locator}
              </span>
            </>
          ) : (
            <span className="card-author">
              {strings.by} {author}
            </span>
          )}
          {textLanguage !== language && <span className="card-note">{strings.englishOnly}</span>}
        </figcaption>
      </figure>
      <div className="card-actions">
        <button
          type="button"
          className="icon-button card-favorite"
          aria-pressed={favorite}
          onClick={() => {
            onToggleFavorite(card.id);
          }}
        >
          <Icon name="heart" filled={favorite} />
          <span className="visually-hidden">{strings.favorite}</span>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => {
            onHide(card.id);
          }}
        >
          <Icon name="eyeOff" />
          <span className="visually-hidden">{strings.hide}</span>
        </button>
        {card.link !== undefined && (
          <a className="card-link" href={card.link} target="_blank" rel="noopener noreferrer">
            <Icon name="book" />
            <span>{card.kind === 'quote' ? strings.readInContext : strings.inspiredBy}</span>
            <span className="visually-hidden"> {strings.newTab}</span>
          </a>
        )}
      </div>
    </article>
  );
}
