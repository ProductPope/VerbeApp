import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { localized, type Card } from '../catalog/catalog.js';
import type { Language, Strings } from '../i18n/strings.js';
import { currentStreak, dayOf, type StreakStore } from '../streak/streak.js';
import { Icon } from './Icon.js';

/** How long the message celebrating today's reading stays on screen. */
export const CELEBRATION_MS = 6_000;

/** Days in a row; re-renders only when that number changes, not on every tick. */
function useStreakDays(store: StreakStore): number {
  const days = () => currentStreak(store.get(), dayOf(new Date()));
  return useSyncExternalStore(store.subscribe, days, days);
}

function useLastDay(store: StreakStore) {
  const lastDay = () => store.get().lastDay;
  return useSyncExternalStore(store.subscribe, lastDay, lastDay);
}

/** The verified quote on habit shown in the streak dialog (Epictetus, Discourses II). */
export const HABIT_QUOTE_ID = 'every-habit-faculty-maintained';

interface StreakButtonProps {
  store: StreakStore;
  strings: Strings;
  language: Language;
  /** Shown in the dialog; omitted if the dataset no longer has it. */
  quote: Card | undefined;
  translationLanguage: Language | undefined;
}

/**
 * A quiet count of days in a row, read out in full by screen readers. It opens
 * a modal dialog about the streak; the native element traps focus, closes on
 * Escape and returns focus to this button.
 */
export function StreakButton({
  store,
  strings,
  language,
  quote,
  translationLanguage,
}: StreakButtonProps) {
  const days = useStreakDays(store);
  const dialog = useRef<HTMLDialogElement>(null);
  const translation =
    quote && translationLanguage !== undefined
      ? quote.translations[translationLanguage]
      : undefined;
  return (
    <>
      <button
        type="button"
        className="icon-button streak"
        data-active={days > 0}
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
        }}
      >
        <Icon name="flame" filled={days > 0} />
        <span aria-hidden="true">{days}</span>
        <span className="visually-hidden">{strings.streak(days)}</span>
      </button>
      <dialog ref={dialog} className="settings" aria-labelledby="streak-heading">
        <div className="settings-header">
          <h2 id="streak-heading">{strings.streakTitle}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              dialog.current?.close();
            }}
          >
            <Icon name="close" />
            <span className="visually-hidden">{strings.close}</span>
          </button>
        </div>
        <div className="settings-body streak-body">
          <p className="streak-count" data-active={days > 0}>
            <Icon name="flame" filled={days > 0} />
            {strings.streakDays(days)}
          </p>
          <p>{strings.streakHabit}</p>
          {quote && (
            <figure className="streak-quote">
              <blockquote lang="en">
                <p>{quote.text}</p>
              </blockquote>
              {translation !== undefined && (
                <p className="streak-quote-translation" lang={translationLanguage}>
                  {translation}
                </p>
              )}
              <figcaption className="muted">
                {localized(quote.author, language)}, <cite>{quote.work}</cite>
              </figcaption>
            </figure>
          )}
          <p>{strings.streakHow}</p>
        </div>
      </dialog>
    </>
  );
}

/**
 * A short message when today joins the streak during this visit. Rendered
 * inside the app's status region, so screen readers announce it.
 */
export function StreakCelebration({
  store,
  strings,
  suppressed,
}: {
  store: StreakStore;
  strings: Strings;
  suppressed: boolean;
}) {
  const days = useStreakDays(store);
  const lastDay = useLastDay(store);
  const [seenDay, setSeenDay] = useState(lastDay);
  const fresh = lastDay !== seenDay;

  // The message waits while another notice holds the status region, and then
  // stays its full time.
  useEffect(() => {
    if (!fresh || suppressed) return;
    const timer = setTimeout(() => {
      setSeenDay(lastDay);
    }, CELEBRATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [fresh, lastDay, suppressed]);

  if (!fresh || suppressed) return null;
  return <p className="toast toast-plain">{strings.streakReached(days)}</p>;
}
