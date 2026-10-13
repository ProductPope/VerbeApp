import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.js';
import { readingTimeMs, seededRandom } from '../../src/app/feed/queue.js';
import { NotificationsBlockedError, type PushService } from '../../src/app/notifications/push.js';
import { createPreferencesStore } from '../../src/app/prefs/store.js';
import { createStreakStore, dayOf, previousDay } from '../../src/app/streak/streak.js';
import { testCatalog } from './fixtures.js';

function renderApp(language = 'en', extra: { push?: PushService; initialCardId?: string } = {}) {
  const store = createPreferencesStore(localStorage, language);
  const streakStore = createStreakStore(localStorage);
  const user = userEvent.setup();
  const view = render(
    <App
      catalog={testCatalog()}
      store={store}
      streakStore={streakStore}
      random={seededRandom(1)}
      reducedMotion={false}
      {...extra}
    />,
  );
  return { store, streakStore, user, ...view };
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  return screen.getByRole('dialog', { name: 'Settings' });
}

function articles() {
  return within(screen.getByRole('feed')).getAllByRole('article');
}

function cardIds() {
  return articles().map((article) => article.dataset.cardId);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('feed', () => {
  it('shows every quote once per round as feed articles with captions', () => {
    renderApp();
    const feed = screen.getByRole('feed', { name: 'Quotes feed' });
    expect(feed).toHaveAccessibleDescription(/Page Down/);
    expect(new Set(cardIds())).toEqual(new Set(['alpha', 'beta', 'gamma', 'delta', 'epsilon']));
    const first = articles()[0]!;
    expect(first).toHaveAttribute('aria-posinset', '1');
    expect(first).toHaveAttribute('aria-setsize', '-1');
    expect(first).toHaveAccessibleName(/^Text of /);
  });

  it('labels community sayings and links to their inspiration', () => {
    renderApp();
    const community = articles().find((a) => a.dataset.cardId === 'epsilon')!;
    expect(within(community).getByText('Community saying')).toBeInTheDocument();
    expect(within(community).getByRole('link', { name: /Inspired by/ })).toHaveAttribute(
      'href',
      'https://www.reddit.com/r/LifeProTips/',
    );
  });

  it('opens sources in a new tab and says so', () => {
    renderApp();
    const quote = articles().find((a) => a.dataset.cardId === 'alpha')!;
    const link = within(quote).getByRole('link', { name: /Read in context/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('moves between articles with Page Down, Page Up, arrows and j/k', async () => {
    const { user } = renderApp();
    const list = articles();
    list[0]!.focus();
    await user.keyboard('{PageDown}');
    expect(list[1]).toHaveFocus();
    expect(list[1]!.dataset.scrolledTo).toBe('true');
    await user.keyboard('j');
    expect(list[2]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(list[1]).toHaveFocus();
    await user.keyboard('k');
    expect(list[0]).toHaveFocus();
    await user.keyboard('{PageUp}');
    expect(list[0]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(list[1]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(list[0]).toHaveFocus();
  });

  it('inside an article only Page Down and Page Up move, so controls keep their keys', async () => {
    const { user } = renderApp();
    const list = articles();
    const favorite = within(list[0]!).getByRole('button', { name: 'Favourite' });
    favorite.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowRight}');
    expect(favorite).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(list[1]).toHaveFocus();
  });

  it('adds another shuffled round before the reader reaches the end', async () => {
    const { user } = renderApp();
    expect(articles()).toHaveLength(5);
    articles()[1]!.focus();
    await user.keyboard('{PageDown}');
    expect(articles()).toHaveLength(10);
  });
});

describe('favourites and hidden quotes', () => {
  it('saves a favourite, lists it under Saved and removes it again', async () => {
    const { user, store } = renderApp();
    const first = articles()[0]!;
    const id = first.dataset.cardId!;
    const button = within(first).getByRole('button', { name: 'Favourite' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(store.get().favorites).toEqual([id]);

    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    expect(screen.getByRole('button', { name: 'Your profile' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Auto-advance' })).not.toBeInTheDocument();
    const favorites = screen.getByRole('region', { name: 'Favourites' });
    expect(within(favorites).getByText(`Text of ${id}.`)).toBeInTheDocument();
    await user.click(within(favorites).getByRole('button', { name: 'Remove from favourites' }));
    expect(within(favorites).getByText(/No favourites yet/)).toBeInTheDocument();
  });

  it('hides a quote, announces it, and can undo', async () => {
    const { user, store } = renderApp();
    const first = articles()[0]!;
    const id = first.dataset.cardId!;
    await user.click(within(first).getByRole('button', { name: 'Don’t show again' }));
    expect(cardIds()).not.toContain(id);
    expect(store.get().hidden).toEqual([id]);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Quote hidden.');
    await user.click(within(status).getByRole('button', { name: 'Undo' }));
    expect(store.get().hidden).toEqual([]);
    expect(status).toBeEmptyDOMElement();
  });

  it('restores hidden quotes from the Saved view', async () => {
    const { user, store } = renderApp();
    store.update((current) => ({ ...current, hidden: ['beta', 'unknown-id'] }));
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    const hidden = screen.getByRole('region', { name: 'Hidden quotes' });
    expect(within(hidden).getAllByRole('listitem')).toHaveLength(1);
    await user.click(within(hidden).getByRole('button', { name: 'Show again' }));
    expect(within(hidden).getByText('Nothing hidden.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    expect(cardIds()).toContain('beta');
  });

  it('explains an empty feed', () => {
    const { store } = renderApp();
    act(() => {
      store.update((current) => ({
        ...current,
        hidden: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'],
      }));
    });
    expect(screen.getByText(/No quotes match/)).toBeInTheDocument();
  });
});

describe('categories', () => {
  it('filters the feed by the selected categories', async () => {
    const { user } = renderApp();
    const settings = await openSettings(user);
    const group = within(settings).getByRole('group', { name: 'Categories' });
    await user.click(within(group).getByRole('button', { name: 'Productivity' }));
    expect(within(group).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(new Set(cardIds())).toEqual(new Set(['beta', 'gamma', 'epsilon']));
    await user.click(within(group).getByRole('button', { name: 'Productivity' }));
    expect(new Set(cardIds())).toEqual(new Set(['alpha', 'beta', 'gamma', 'delta', 'epsilon']));
    await user.click(within(group).getByRole('button', { name: 'Philosophy' }));
    await user.click(within(group).getByRole('button', { name: 'All' }));
    expect(cardIds()).toHaveLength(5);
  });
});

describe('settings', () => {
  it('opens as a modal dialog and closes again', async () => {
    const { user } = renderApp();
    const settings = await openSettings(user);
    expect(settings).toHaveAttribute('open');
    await user.click(within(settings).getByRole('button', { name: 'Close' }));
    expect(settings).not.toHaveAttribute('open');
  });
});

describe('translation', () => {
  it('shows the Polish translation under the English quote by default', () => {
    renderApp();
    const alpha = articles().find((a) => a.dataset.cardId === 'alpha')!;
    expect(within(alpha).getByText('Text of alpha.').closest('blockquote')).toHaveAttribute(
      'lang',
      'en',
    );
    const translation = within(alpha).getByText('Tekst alfa.');
    expect(translation).toHaveAttribute('lang', 'pl');
    expect(translation.closest('blockquote')).toBeNull();
    expect(alpha).toHaveAccessibleDescription(/Tekst alfa\./);
    const beta = articles().find((a) => a.dataset.cardId === 'beta')!;
    expect(beta).not.toHaveAccessibleDescription(/Tekst/);
  });

  it('can be switched off in settings', async () => {
    const { user, store } = renderApp();
    const settings = await openSettings(user);
    const toggle = within(settings).getByRole('switch', { name: 'Polish translation' });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/AI/);
    await user.click(toggle);
    expect(store.get().translation).toBe(false);
    expect(screen.queryByText('Tekst alfa.')).not.toBeInTheDocument();
  });

  it('also appears in the Saved view', async () => {
    const { user, store } = renderApp();
    store.update((current) => ({ ...current, favorites: ['alpha'] }));
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    const favorites = screen.getByRole('region', { name: 'Favourites' });
    expect(within(favorites).getByText('Tekst alfa.')).toHaveAttribute('lang', 'pl');
  });
});

describe('language', () => {
  it('switches the interface to Polish and keeps quotes in English', async () => {
    const { user } = renderApp();
    const settings = await openSettings(user);
    await user.selectOptions(
      within(settings).getByRole('combobox', { name: 'App language' }),
      'pl',
    );
    expect(document.documentElement.lang).toBe('pl');
    expect(screen.getByRole('feed', { name: 'Lista cytatów' })).toBeInTheDocument();
    const alpha = articles().find((a) => a.dataset.cardId === 'alpha')!;
    expect(within(alpha).getByText('Text of alpha.')).toBeInTheDocument();
    expect(within(alpha).getByText('Marek Aureliusz')).toBeInTheDocument();
  });

  it('starts in Polish for a Polish browser', () => {
    renderApp('pl-PL');
    expect(screen.getByRole('button', { name: 'Ustawienia' })).toBeInTheDocument();
  });
});

describe('auto-advance', () => {
  function advanceBy(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  it('is off by default and does nothing', () => {
    vi.useFakeTimers();
    renderApp();
    expect(screen.getByRole('button', { name: 'Auto-advance' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByTestId('autoplay-progress')).not.toBeInTheDocument();
    advanceBy(60_000);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
  });

  it('moves to the next quote after its reading time once switched on', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance' }));
    expect(screen.getByRole('button', { name: 'Auto-advance' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const first = articles()[0]!;
    const translation = first.querySelector('.card-translation')?.textContent ?? '';
    const wait = readingTimeMs(`${first.querySelector('blockquote')!.textContent} ${translation}`);
    const bar = screen.getByTestId('autoplay-progress').firstElementChild as HTMLElement;
    expect(bar.style.animationDuration).toBe(`${String(wait)}ms`);
    advanceBy(wait - 100);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
    advanceBy(200);
    expect(articles()[1]!.dataset.scrolledTo).toBe('true');
    expect(articles()[1]).not.toHaveFocus();
  });

  it('pauses while a mouse is over the feed and while the page is hidden', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance' }));
    const feed = screen.getByRole('feed');
    fireEvent.pointerEnter(feed, { pointerType: 'mouse' });
    expect(screen.queryByTestId('autoplay-progress')).not.toBeInTheDocument();
    advanceBy(60_000);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
    fireEvent.pointerLeave(feed);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    advanceBy(60_000);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    fireEvent(document, new Event('visibilitychange'));
    advanceBy(31_000);
    expect(articles()[1]!.dataset.scrolledTo).toBe('true');
  });

  it('ignores touch hovering but restarts the timer on every touch', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance' }));
    const feed = screen.getByRole('feed');
    fireEvent.pointerEnter(feed, { pointerType: 'touch' });
    advanceBy(7_000);
    const before = screen.getByTestId('autoplay-progress').firstElementChild;
    fireEvent.pointerDown(feed);
    expect(screen.getByTestId('autoplay-progress').firstElementChild).not.toBe(before);
    advanceBy(7_000);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
    advanceBy(24_000);
    expect(articles()[1]!.dataset.scrolledTo).toBe('true');
  });

  it('pauses while keyboard focus is in the feed', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance' }));
    const first = articles()[0]!;
    // jsdom never reports :focus-visible; pretend this focus came from a keyboard.
    const realMatches = Object.getOwnPropertyDescriptor(Element.prototype, 'matches')!.value as (
      this: Element,
      selector: string,
    ) => boolean;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector) {
      return selector === ':focus-visible' || realMatches.call(this, selector);
    });
    act(() => {
      first.focus();
    });
    advanceBy(60_000);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
    act(() => {
      first.blur();
    });
    advanceBy(31_000);
    expect(articles()[1]!.dataset.scrolledTo).toBe('true');
  });
});

describe('daily notification', () => {
  function fakePush() {
    return {
      subscribe: vi.fn<(hour: number) => Promise<void>>(() => Promise.resolve()),
      unsubscribe: vi.fn(() => Promise.resolve()),
    };
  }

  it('is not offered when the build has no push server', async () => {
    const { user } = renderApp();
    const settings = await openSettings(user);
    expect(within(settings).queryByRole('switch', { name: /Daily quote/ })).toBeNull();
  });

  it('subscribes at the chosen hour, moves the hour and unsubscribes', async () => {
    const push = fakePush();
    const { user, store } = renderApp('en', { push });
    const settings = await openSettings(user);
    const toggle = within(settings).getByRole('switch', { name: 'Daily quote notification' });
    expect(toggle).not.toBeChecked();
    expect(within(settings).queryByRole('combobox', { name: 'Time' })).toBeNull();

    await user.click(toggle);
    expect(push.subscribe).toHaveBeenCalledWith(8);
    expect(toggle).toBeChecked();
    expect(store.get().notify).toBe(true);

    await user.selectOptions(within(settings).getByRole('combobox', { name: 'Time' }), '21');
    expect(push.subscribe).toHaveBeenLastCalledWith(21);
    expect(store.get().notifyHour).toBe(21);

    await user.click(toggle);
    expect(push.unsubscribe).toHaveBeenCalled();
    expect(store.get()).toMatchObject({ notify: false, notifyHour: 21 });
  });

  it('explains blocked notifications and other failures', async () => {
    const push = fakePush();
    push.subscribe.mockRejectedValueOnce(new NotificationsBlockedError());
    push.subscribe.mockRejectedValueOnce(new Error('offline'));
    const { user, store } = renderApp('en', { push });
    const settings = await openSettings(user);
    const toggle = within(settings).getByRole('switch', { name: 'Daily quote notification' });

    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/blocked/);
    await user.click(toggle);
    expect(toggle).toHaveAccessibleDescription(/Could not change/);
    expect(store.get().notify).toBe(false);
  });
});

describe('opening from a notification', () => {
  it('shows the notified quote first', () => {
    renderApp('en', { initialCardId: 'delta' });
    expect(cardIds()[0]).toBe('delta');
  });

  it('ignores an unknown quote', () => {
    renderApp('en', { initialCardId: 'missing' });
    expect(cardIds()).toHaveLength(5);
  });
});

describe('reading streak', () => {
  function advanceBy(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  function setHidden(hidden: boolean) {
    Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
    fireEvent(document, new Event('visibilitychange'));
  }

  afterEach(() => {
    setHidden(false);
  });

  it('counts today after 30 seconds in the app and celebrates it once', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 13, 9, 0) });
    const { streakStore } = renderApp();
    const badge = screen.getByText('Reading streak: 0 days in a row').parentElement!;
    advanceBy(29_000);
    expect(streakStore.get().count).toBe(0);
    expect(within(badge).getByText(/Reading streak: 0/)).toBeInTheDocument();
    advanceBy(1_000);
    expect(streakStore.get()).toMatchObject({ count: 1, lastDay: '2026-10-13' });
    expect(badge).toHaveTextContent('Reading streak: 1 day in a row');
    expect(screen.getByRole('status')).toHaveTextContent('Day one of your reading streak.');
    advanceBy(6_000);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    advanceBy(60_000);
    expect(streakStore.get().count).toBe(1);
  });

  it('continues yesterday’s streak', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 13, 9, 0) });
    const yesterday = previousDay(dayOf(new Date()));
    localStorage.setItem(
      'verbeapp:streak:v1',
      JSON.stringify({ count: 4, lastDay: yesterday, activeDay: yesterday, activeMs: 30_000 }),
    );
    renderApp('pl-PL');
    expect(screen.getByText('Seria czytania: 4 dni z rzędu')).toBeInTheDocument();
    advanceBy(30_000);
    expect(screen.getByText('Seria czytania: 5 dni z rzędu')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('5 dni z rzędu. Brawo!');
  });

  it('does not count time while the device sleeps', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 13, 9, 0) });
    const { streakStore } = renderApp();
    advanceBy(5_000);
    // A sleeping phone stops timers while the clock moves on.
    vi.setSystemTime(Date.now() + 10 * 60_000);
    advanceBy(1_000);
    expect(streakStore.get()).toMatchObject({ count: 0, activeMs: 7_000 });
  });

  it('does not count time while the app is hidden', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 13, 9, 0) });
    const { streakStore } = renderApp();
    advanceBy(20_000);
    setHidden(true);
    advanceBy(120_000);
    expect(streakStore.get().count).toBe(0);
    setHidden(false);
    advanceBy(9_000);
    expect(streakStore.get()).toMatchObject({ count: 0, activeMs: 29_000 });
    advanceBy(1_000);
    expect(streakStore.get().count).toBe(1);
  });
});

describe('page', () => {
  it('offers a skip link to the quotes and sets the title', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Skip to quotes' })).toHaveAttribute('href', '#main');
    expect(document.title).toBe('VerbeApp: Wise words, one at a time');
  });
});
