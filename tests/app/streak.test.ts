import { describe, expect, it } from 'vitest';
import {
  createStreakStore,
  currentStreak,
  DAILY_GOAL_MS,
  dayOf,
  EMPTY_STREAK,
  parseStreak,
  previousDay,
  recordActiveTime,
  STREAK_STORAGE_KEY,
  type Streak,
} from '../../src/app/streak/streak.js';

describe('dayOf and previousDay', () => {
  it('uses the local calendar day', () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayOf(new Date(2026, 0, 6, 0, 0))).toBe('2026-01-06');
  });

  it('steps back across month, year, leap day and daylight saving boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(previousDay('2026-03-30')).toBe('2026-03-29');
    expect(previousDay('2026-10-26')).toBe('2026-10-25');
  });
});

describe('recordActiveTime', () => {
  it('adds up short visits on the same day until the goal is reached', () => {
    let streak = recordActiveTime(EMPTY_STREAK, '2026-10-13', 10_000);
    expect(streak).toEqual({ count: 0, lastDay: null, activeDay: '2026-10-13', activeMs: 10_000 });
    streak = recordActiveTime(streak, '2026-10-13', DAILY_GOAL_MS - 10_001);
    expect(streak.count).toBe(0);
    streak = recordActiveTime(streak, '2026-10-13', 1);
    expect(streak).toMatchObject({ count: 1, lastDay: '2026-10-13' });
  });

  it('starts each day from zero', () => {
    const streak = recordActiveTime(EMPTY_STREAK, '2026-10-12', 20_000);
    expect(recordActiveTime(streak, '2026-10-13', 20_000)).toMatchObject({
      count: 0,
      activeDay: '2026-10-13',
      activeMs: 20_000,
    });
  });

  it('counts a day once', () => {
    const streak = recordActiveTime(EMPTY_STREAK, '2026-10-13', DAILY_GOAL_MS);
    expect(recordActiveTime(streak, '2026-10-13', 60_000)).toBe(streak);
  });

  it('extends a streak from yesterday and restarts after a missed day', () => {
    const read: Streak = {
      count: 3,
      lastDay: '2026-10-12',
      activeDay: '2026-10-12',
      activeMs: DAILY_GOAL_MS,
    };
    expect(recordActiveTime(read, '2026-10-13', DAILY_GOAL_MS).count).toBe(4);
    expect(recordActiveTime(read, '2026-10-14', DAILY_GOAL_MS).count).toBe(1);
  });

  it('ignores zero or negative time', () => {
    expect(recordActiveTime(EMPTY_STREAK, '2026-10-13', 0)).toBe(EMPTY_STREAK);
    expect(recordActiveTime(EMPTY_STREAK, '2026-10-13', -5)).toBe(EMPTY_STREAK);
  });
});

describe('currentStreak', () => {
  const streak: Streak = { count: 5, lastDay: '2026-10-12', activeDay: null, activeMs: 0 };

  it('keeps the streak through today until a whole day is missed', () => {
    expect(currentStreak(streak, '2026-10-12')).toBe(5);
    expect(currentStreak(streak, '2026-10-13')).toBe(5);
    expect(currentStreak(streak, '2026-10-14')).toBe(0);
    expect(currentStreak(EMPTY_STREAK, '2026-10-14')).toBe(0);
  });
});

describe('parseStreak', () => {
  it('returns an empty streak for missing or broken data', () => {
    expect(parseStreak(null)).toBe(EMPTY_STREAK);
    expect(parseStreak('{not json')).toBe(EMPTY_STREAK);
    expect(parseStreak('null')).toBe(EMPTY_STREAK);
  });

  it('keeps valid fields and drops invalid ones', () => {
    expect(
      parseStreak(
        JSON.stringify({ count: 2, lastDay: '2026-10-12', activeDay: 'today', activeMs: 9 }),
      ),
    ).toEqual({ count: 2, lastDay: '2026-10-12', activeDay: null, activeMs: 0 });
    expect(
      parseStreak(JSON.stringify({ count: -1.5, lastDay: '2026-10-12', activeDay: null })),
    ).toMatchObject({ count: 0 });
    expect(parseStreak(JSON.stringify({ count: 7, lastDay: null }))).toMatchObject({ count: 0 });
  });
});

describe('createStreakStore', () => {
  it('persists to its own storage key', () => {
    const store = createStreakStore(localStorage);
    store.update((current) => recordActiveTime(current, '2026-10-13', DAILY_GOAL_MS));
    expect(JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)!)).toMatchObject({ count: 1 });
    expect(createStreakStore(localStorage).get().lastDay).toBe('2026-10-13');
  });
});
