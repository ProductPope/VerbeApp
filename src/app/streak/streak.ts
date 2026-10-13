import { createLocalStore, type LocalStore } from '../storage/local-store.js';

/** Time the app must be open and visible on a day for that day to count. */
export const DAILY_GOAL_MS = 30_000;

export const STREAK_STORAGE_KEY = 'verbeapp:streak:v1';

/** A calendar day in the reader's own time zone, as `YYYY-MM-DD`. */
export type Day = string;

/** The reading streak, kept on this device only. */
export interface Streak {
  /** Consecutive days read, ending on `lastDay`. */
  count: number;
  /** The most recent day that reached the goal. */
  lastDay: Day | null;
  /** The day `activeMs` was measured on. */
  activeDay: Day | null;
  /** Visible time so far on `activeDay`, kept so short visits add up. */
  activeMs: number;
}

export const EMPTY_STREAK: Streak = { count: 0, lastDay: null, activeDay: null, activeMs: 0 };

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dayOf(date: Date): Day {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The calendar day before `day`; safe across month ends and daylight saving changes. */
export function previousDay(day: Day): Day {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return dayOf(new Date(year, month - 1, date - 1));
}

/** Adds visible time on `today` and counts the day once it reaches the goal. */
export function recordActiveTime(streak: Streak, today: Day, ms: number): Streak {
  if (streak.lastDay === today || ms <= 0) return streak;
  const activeMs = (streak.activeDay === today ? streak.activeMs : 0) + ms;
  if (activeMs < DAILY_GOAL_MS) return { ...streak, activeDay: today, activeMs };
  return {
    count: streak.lastDay === previousDay(today) ? streak.count + 1 : 1,
    lastDay: today,
    activeDay: today,
    activeMs,
  };
}

/** Days in a row as seen on `today`: a streak survives until a whole day is missed. */
export function currentStreak(streak: Streak, today: Day): number {
  return streak.lastDay === today || streak.lastDay === previousDay(today) ? streak.count : 0;
}

/** Reads a stored streak, falling back to an empty one for anything malformed. */
export function parseStreak(raw: string | null): Streak {
  if (raw === null) return EMPTY_STREAK;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const day = (value: unknown) =>
      typeof value === 'string' && DAY_PATTERN.test(value) ? value : null;
    const count = (value: unknown) =>
      typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
    const lastDay = day(data.lastDay);
    const activeDay = day(data.activeDay);
    return {
      count: lastDay === null ? 0 : count(data.count),
      lastDay,
      activeDay,
      activeMs: activeDay === null ? 0 : count(data.activeMs),
    };
  } catch {
    return EMPTY_STREAK;
  }
}

export function createStreakStore(storage: Storage | undefined) {
  return createLocalStore(storage, STREAK_STORAGE_KEY, parseStreak);
}

export type StreakStore = LocalStore<Streak>;
