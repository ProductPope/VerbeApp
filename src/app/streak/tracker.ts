import { dayOf, recordActiveTime, type StreakStore } from './streak.js';

const TICK_MS = 1_000;

/**
 * Counts the time the app is open and visible and records it in the streak
 * store, which adds today once the daily goal is reached. Time while the page
 * is hidden, or while the device sleeps and the timer stalls, is not counted.
 * Lives outside React so that ticking never re-renders the app.
 * Returns a function that stops tracking.
 */
export function trackActiveTime(store: StreakStore, doc: Document = document): () => void {
  let last = Date.now();

  function tick() {
    const now = Date.now();
    const elapsed = Math.min(now - last, TICK_MS * 2);
    last = now;
    if (doc.hidden) return;
    store.update((current) => recordActiveTime(current, dayOf(new Date(now)), elapsed));
  }

  function restart() {
    last = Date.now();
  }

  const timer = setInterval(tick, TICK_MS);
  doc.addEventListener('visibilitychange', restart);
  return () => {
    clearInterval(timer);
    doc.removeEventListener('visibilitychange', restart);
  };
}
