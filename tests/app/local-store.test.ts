import { describe, expect, it, vi } from 'vitest';
import { createLocalStore } from '../../src/app/storage/local-store.js';
import {
  createStreakStore,
  DAILY_GOAL_MS,
  recordActiveTime,
  STREAK_STORAGE_KEY,
} from '../../src/app/streak/streak.js';

const parseList = (raw: string | null) => (raw === null ? [] : (JSON.parse(raw) as string[]));

describe('createLocalStore with several copies of the app open', () => {
  it('builds each change on what another copy saved, not on its own stale copy', () => {
    const older = createLocalStore(localStorage, 'list', parseList);
    const newer = createLocalStore(localStorage, 'list', parseList);
    newer.update((list) => [...list, 'a']);
    older.update((list) => [...list, 'b']);
    expect(JSON.parse(localStorage.getItem('list')!)).toEqual(['a', 'b']);
    expect(older.get()).toEqual(['a', 'b']);
  });

  it('picks up changes another tab saved and notifies subscribers', () => {
    const store = createLocalStore(localStorage, 'list', parseList);
    const listener = vi.fn();
    store.subscribe(listener);
    localStorage.setItem('list', '["x"]');
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    expect(listener).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key: 'list' }));
    expect(store.get()).toEqual(['x']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps its own state when storage cannot be written', () => {
    const readOnly = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    } as unknown as Storage;
    const store = createLocalStore(readOnly, 'list', parseList);
    store.update((list) => [...list, 'a']);
    store.update((list) => [...list, 'b']);
    expect(store.get()).toEqual(['a', 'b']);
  });
});

describe('reading streak across an app update', () => {
  it('is not reset by a copy of the app that was opened before today counted', () => {
    // E.g. a background tab or the installed app still running the old version.
    const stale = createStreakStore(localStorage);
    stale.update((s) => recordActiveTime(s, '2026-10-13', 10_000));
    const updated = createStreakStore(localStorage);
    updated.update((s) => recordActiveTime(s, '2026-10-13', DAILY_GOAL_MS));
    expect(updated.get().count).toBe(1);

    stale.update((s) => recordActiveTime(s, '2026-10-13', 1_000));
    expect(JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)!)).toMatchObject({
      count: 1,
      lastDay: '2026-10-13',
    });
    expect(createStreakStore(localStorage).get().count).toBe(1);
  });
});
