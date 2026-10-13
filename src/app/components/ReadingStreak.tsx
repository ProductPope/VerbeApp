import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Strings } from '../i18n/strings.js';
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

/** A quiet count of days in a row, read out in full by screen readers. */
export function StreakBadge({ store, strings }: { store: StreakStore; strings: Strings }) {
  const days = useStreakDays(store);
  return (
    <p className="streak" data-active={days > 0}>
      <Icon name="flame" filled={days > 0} />
      <span aria-hidden="true">{days}</span>
      <span className="visually-hidden">{strings.streak(days)}</span>
    </p>
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

  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => {
      setSeenDay(lastDay);
    }, CELEBRATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [fresh, lastDay]);

  if (!fresh || suppressed) return null;
  return <p className="toast toast-plain">{strings.streakReached(days)}</p>;
}
