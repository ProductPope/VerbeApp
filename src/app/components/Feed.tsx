import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Card } from '../catalog/catalog.js';
import { nextBatch, readingTimeMs } from '../feed/queue.js';
import type { Language, Strings } from '../i18n/strings.js';
import { Icon } from './Icon.js';
import { QuoteCard } from './QuoteCard.js';

interface FeedItem {
  key: string;
  /** Which shuffled round of the eligible cards this item belongs to. */
  round: number;
  card: Card;
}

interface FeedProps {
  /** Cards that may appear; the feed repeats them in shuffled rounds. */
  cards: Card[];
  strings: Strings;
  language: Language;
  translationLanguage: Language | undefined;
  favorites: string[];
  autoplay: boolean;
  reducedMotion: boolean;
  random: () => number;
  /** Card to put first when the feed opens. */
  initialCardId?: string | undefined;
  /** Show how to move between quotes until the reader first does it. */
  swipeHint?: boolean;
  /** Called once the reader moves to another quote or dismisses the hint. */
  onSwipeHintDone?: () => void;
  onToggleFavorite: (id: string) => void;
  onHide: (id: string) => void;
}

/** How many cards must remain after the current one before more are added. */
const LOOKAHEAD = 3;
/** How many cards are added at a time. */
const BATCH = 8;

const NEXT_KEYS = new Set(['PageDown', 'ArrowRight', 'ArrowDown', 'j']);
const PREVIOUS_KEYS = new Set(['PageUp', 'ArrowLeft', 'ArrowUp', 'k']);

let roundCounter = 0;

function item(card: Card, round: number): FeedItem {
  return { key: `${String(round)}:${card.id}`, round, card };
}

function withMore(items: FeedItem[], eligible: Card[], random: () => number): FeedItem[] {
  const current = items.at(-1)?.round;
  const { cards, newRound } = nextBatch(
    eligible,
    items.filter((entry) => entry.round === current).map((entry) => entry.card),
    items.map((entry) => entry.card),
    random,
    BATCH,
  );
  const round = newRound || current === undefined ? roundCounter++ : current;
  return [...items, ...cards.map((card) => item(card, round))];
}

/** Puts the requested card first, if it is eligible. */
function startingWith(items: FeedItem[], eligible: Card[], id: string | undefined): FeedItem[] {
  const first = items[0];
  const chosen = eligible.find((card) => card.id === id);
  if (!first || !chosen) return items;
  const rest = items.filter((entry) => entry.card.id !== id);
  // Keep the batch size: the card it displaces comes later in the round.
  return [item(chosen, first.round), ...rest.slice(0, items.length - 1)];
}

function idsOf(cards: Card[]): string {
  return cards.map((card) => card.id).join('\n');
}

/**
 * An endless, swipeable list of quotes following the ARIA feed pattern:
 * each card is an article, Page Down and Page Up move between them, and
 * optional auto-advance pauses whenever the reader interacts.
 */
export function Feed({
  cards,
  strings,
  language,
  translationLanguage,
  favorites,
  autoplay,
  reducedMotion,
  random,
  initialCardId,
  swipeHint = false,
  onSwipeHintDone,
  onToggleFavorite,
  onHide,
}: FeedProps) {
  const [items, setItems] = useState<FeedItem[]>(() =>
    startingWith(withMore([], cards, random), cards, initialCardId),
  );
  const [eligibleIds, setEligibleIds] = useState(() => idsOf(cards));
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  // Bumped on every touch so that auto-advance restarts its timer.
  const [touches, setTouches] = useState(0);
  const articles = useRef(new Map<string, HTMLElement>());

  // Keep the feed in step with the eligible cards. Hiding a card removes it
  // in place; selecting other categories starts a fresh shuffle.
  const currentIds = idsOf(cards);
  if (currentIds !== eligibleIds) {
    const previous = new Set(eligibleIds.split('\n'));
    const onlyRemoved = cards.every((card) => previous.has(card.id));
    setEligibleIds(currentIds);
    if (onlyRemoved) {
      const remaining = new Set(cards.map((card) => card.id));
      const kept = items.filter((item) => remaining.has(item.card.id));
      setItems(kept.length > LOOKAHEAD ? kept : withMore(kept, cards, random));
      setActive(Math.min(active, Math.max(0, kept.length - 1)));
    } else {
      setItems(withMore([], cards, random));
      setActive(0);
    }
  }

  function extendFrom(index: number) {
    if (index >= items.length - LOOKAHEAD) {
      setItems((current) => withMore(current, cards, random));
    }
  }

  function goTo(index: number, moveFocus: boolean) {
    const item = items[index];
    const element = item && articles.current.get(item.key);
    if (!element) return;
    element.scrollIntoView({
      block: 'nearest',
      inline: 'start',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    if (moveFocus) element.focus({ preventScroll: true });
    setActive(index);
    extendFrom(index);
  }

  // Track which card is on screen while the reader scrolls or swipes.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = items.findIndex((item) => articles.current.get(item.key) === entry.target);
          if (index >= 0) {
            setActive(index);
            if (index >= items.length - LOOKAHEAD) {
              setItems((current) => withMore(current, cards, random));
            }
          }
        }
      },
      { threshold: 0.6 },
    );
    for (const element of articles.current.values()) observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [items, cards, random]);

  // The first move to another quote, by swipe, keyboard or auto-advance,
  // shows the reader has found how the feed works.
  useEffect(() => {
    if (swipeHint && active > 0) onSwipeHintDone?.();
  }, [swipeHint, active, onSwipeHintDone]);

  useEffect(() => {
    const onVisibility = () => {
      setPageHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Auto-advance (WCAG 2.2.2): off by default, toggled by a visible control,
  // and paused while the reader points at, focuses or touches the feed.
  const current = items[active];
  const advancing = autoplay && !interacting && !pageHidden && current !== undefined;
  const translation =
    current && translationLanguage !== undefined
      ? current.card.translations[translationLanguage]
      : undefined;
  const delay = current ? readingTimeMs(`${current.card.text} ${translation ?? ''}`) : 0;

  useEffect(() => {
    if (!advancing) return;
    const timer = setTimeout(() => {
      goTo(active + 1, false);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  });

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const article = target.closest('article');
    if (!article) return;
    // On the article itself arrows and j/k also work; inside its buttons and
    // links only Page Down and Page Up do, as the ARIA feed pattern requires.
    const onArticle = target === article;
    const next = onArticle ? NEXT_KEYS.has(event.key) : event.key === 'PageDown';
    const previous = onArticle ? PREVIOUS_KEYS.has(event.key) : event.key === 'PageUp';
    if (!next && !previous) return;
    event.preventDefault();
    const index = items.findIndex((item) => articles.current.get(item.key) === article);
    goTo(next ? index + 1 : Math.max(0, index - 1), true);
  }

  function onPointerEnter(event: PointerEvent) {
    if (event.pointerType === 'mouse') setInteracting(true);
  }

  if (cards.length === 0) {
    return <p className="feed-empty">{strings.emptyFeed}</p>;
  }

  return (
    <div className="feed-frame">
      {advancing && (
        // Decorative: the play button already says whether auto-advance is on.
        // A new key restarts the animation whenever the timer restarts.
        <div className="autoplay-progress" aria-hidden="true" data-testid="autoplay-progress">
          <div
            key={`${current.key}:${String(touches)}`}
            className="autoplay-progress-bar"
            style={{ animationDuration: `${String(delay)}ms` }}
          />
        </div>
      )}
      {/* The ARIA feed pattern puts keyboard handling on the feed itself. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={swipeHint ? 'feed feed-hinting' : 'feed'}
        role="feed"
        aria-label={strings.feedLabel}
        aria-describedby="feed-hint"
        aria-busy={false}
        onKeyDown={onKeyDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={() => {
          setInteracting(false);
        }}
        onPointerDown={() => {
          setTouches((count) => count + 1);
        }}
        onFocus={(event) => {
          let keyboard = true;
          try {
            keyboard = event.target.matches(':focus-visible');
          } catch {
            // Older engines: treat any focus as interaction.
          }
          if (keyboard) setInteracting(true);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
        }}
      >
        <p id="feed-hint" className="visually-hidden">
          {strings.feedHint}
        </p>
        {items.map((item, index) => (
          <QuoteCard
            key={item.key}
            ref={(element) => {
              if (element) articles.current.set(item.key, element);
              else articles.current.delete(item.key);
            }}
            card={item.card}
            position={index + 1}
            language={language}
            strings={strings}
            favorite={favorites.includes(item.card.id)}
            translationLanguage={translationLanguage}
            onToggleFavorite={onToggleFavorite}
            onHide={onHide}
          />
        ))}
      </div>
      {swipeHint && (
        <div className="swipe-hint" data-testid="swipe-hint">
          <span className="swipe-hint-arrow">
            <Icon name="arrowLeft" />
          </span>
          <p className="swipe-hint-text">
            <span className="swipe-hint-touch">{strings.swipeHint}</span>
            <span className="swipe-hint-keys">{strings.keyboardHint}</span>
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onSwipeHintDone?.();
              // The button disappears; keep focus where the reader is.
              const element = current && articles.current.get(current.key);
              element?.focus({ preventScroll: true });
            }}
          >
            {strings.dismissHint}
          </button>
        </div>
      )}
    </div>
  );
}
