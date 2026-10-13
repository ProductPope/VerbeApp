import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.js';
import { readingTimeMs, seededRandom } from '../../src/app/feed/queue.js';
import { NotificationsBlockedError, type PushService } from '../../src/app/notifications/push.js';
import { createPersonalStore } from '../../src/app/personal/personal.js';
import { createPreferencesStore } from '../../src/app/prefs/store.js';
import { createStreakStore, dayOf, previousDay } from '../../src/app/streak/streak.js';
import type { Catalog } from '../../src/app/catalog/catalog.js';
import type { InstallOutcome, InstallService } from '../../src/app/install/install.js';
import { HABIT_QUOTE_ID } from '../../src/app/components/ReadingStreak.js';
import { card, testCatalog } from './fixtures.js';

function renderApp(
  language = 'en',
  extra: {
    push?: PushService;
    initialCardId?: string;
    catalog?: Catalog;
    install?: InstallService;
  } = {},
) {
  const store = createPreferencesStore(localStorage, language);
  const streakStore = createStreakStore(localStorage);
  const personalStore = createPersonalStore(localStorage);
  const saveFile = vi.fn<(name: string, contents: string) => void>();
  const persistStorage = vi.fn<() => void>();
  const user = userEvent.setup();
  const view = render(
    <App
      catalog={testCatalog()}
      store={store}
      streakStore={streakStore}
      personalStore={personalStore}
      saveFile={saveFile}
      persistStorage={persistStorage}
      random={seededRandom(1)}
      reducedMotion={false}
      {...extra}
    />,
  );
  return { store, streakStore, personalStore, saveFile, persistStorage, user, ...view };
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  return screen.getByRole('dialog', { name: 'Settings' });
}

async function openProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Your profile' }));
  return screen.getByRole('dialog', { name: 'Your profile' });
}

async function openPreferences(user: ReturnType<typeof userEvent.setup>) {
  const profile = await openProfile(user);
  const preferences = within(profile).getByRole('region', { name: 'Preferences' });
  await user.click(within(preferences).getByText('Preferences'));
  expect(preferences.querySelector('details')).toHaveAttribute('open');
  return preferences;
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

describe('swipe hint', () => {
  function hint() {
    return screen.queryByTestId('swipe-hint');
  }

  it('explains swiping and the arrow key on first launch', () => {
    renderApp();
    expect(hint()).toHaveTextContent('Swipe left for the next quote');
    expect(hint()).toHaveTextContent('Press → for the next quote');
    expect(screen.getByRole('feed')).toHaveClass('feed-hinting');
  });

  it('goes away for good after the first move to another quote', async () => {
    const { user, store, unmount } = renderApp();
    articles()[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(hint()).not.toBeInTheDocument();
    expect(screen.getByRole('feed')).not.toHaveClass('feed-hinting');
    expect(store.get().swipeHintSeen).toBe(true);
    unmount();
    renderApp();
    expect(hint()).not.toBeInTheDocument();
  });

  it('can be dismissed with a button, leaving focus on the quote', async () => {
    const { user, store } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(hint()).not.toBeInTheDocument();
    expect(articles()[0]).toHaveFocus();
    expect(store.get().swipeHintSeen).toBe(true);
  });

  it('speaks Polish', () => {
    renderApp('pl-PL');
    expect(hint()).toHaveTextContent('Przesuń w lewo, aby zobaczyć kolejny cytat');
    expect(screen.getByRole('button', { name: 'Rozumiem' })).toBeInTheDocument();
  });

  it('is not shown to readers who saved preferences before it existed', () => {
    localStorage.setItem('verbeapp:preferences:v1', JSON.stringify({ favorites: ['alpha'] }));
    renderApp();
    expect(hint()).not.toBeInTheDocument();
  });

  it('is not shown with an empty feed', () => {
    renderApp('en', { catalog: { ...testCatalog(), cards: [] } });
    expect(hint()).not.toBeInTheDocument();
  });
});

describe('favourites and hidden quotes', () => {
  it('saves a favourite, lists it in the profile and removes it again', async () => {
    const { user, store } = renderApp();
    const first = articles()[0]!;
    const id = first.dataset.cardId!;
    const button = within(first).getByRole('button', { name: 'Favourite' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(store.get().favorites).toEqual([id]);

    const profile = await openProfile(user);
    const favorites = within(profile).getByRole('region', { name: 'Favourites' });
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

  it('lets the undo offer go after a while, but not while it has focus', () => {
    vi.useFakeTimers();
    renderApp();
    const hideFirst = () => {
      fireEvent.click(within(articles()[0]!).getByRole('button', { name: 'Don’t show again' }));
    };
    const wait = (ms: number) => {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    };
    const status = screen.getByRole('status');
    hideFirst();
    wait(7_900);
    expect(status).toHaveTextContent('Quote hidden.');
    wait(200);
    expect(status).toBeEmptyDOMElement();

    hideFirst();
    const undo = within(status).getByRole('button', { name: 'Undo' });
    act(() => {
      undo.focus();
    });
    wait(20_000);
    expect(status).toHaveTextContent('Quote hidden.');
    act(() => {
      undo.blur();
    });
    wait(8_000);
    expect(status).not.toHaveTextContent('Quote hidden.');
    // With the offer gone, the streak message that was held back can show.
    expect(status).toHaveTextContent('Day one of your reading streak');
  });

  it('restores hidden quotes from the profile', async () => {
    const { user, store } = renderApp();
    store.update((current) => ({ ...current, hidden: ['beta', 'unknown-id'] }));
    const profile = await openProfile(user);
    const hidden = within(profile).getByRole('region', { name: 'Hidden quotes' });
    expect(within(hidden).getAllByRole('listitem')).toHaveLength(1);
    await user.click(within(hidden).getByRole('button', { name: 'Show again' }));
    expect(within(hidden).getByText('Nothing hidden.')).toBeInTheDocument();
    await user.click(within(profile).getByRole('button', { name: 'Close' }));
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

describe('profile', () => {
  it('opens as a modal dialog with preferences collapsed and closes with the X button', async () => {
    const { user } = renderApp();
    const profile = await openProfile(user);
    expect(profile).toHaveAttribute('open');
    const preferences = within(profile).getByRole('region', { name: 'Preferences' });
    expect(preferences.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Your profile' })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    await user.click(within(profile).getByRole('button', { name: 'Close' }));
    expect(profile).not.toHaveAttribute('open');
  });

  it('keeps a collapsed About section last, with a link to the source code', async () => {
    const { user } = renderApp();
    const profile = await openProfile(user);
    const regions = within(profile).getAllByRole('region');
    const about = regions.at(-1)!;
    expect(about).toHaveAccessibleName('About VerbeApp');
    expect(about.querySelector('details')).not.toHaveAttribute('open');
    await user.click(within(about).getByText('About VerbeApp'));
    expect(about.querySelector('details')).toHaveAttribute('open');
    expect(about).toHaveTextContent(/open-source/);
    expect(about).toHaveTextContent(/public-domain/);
    const link = within(about).getByRole('link', { name: 'Source code on GitHub' });
    expect(link).toHaveAttribute('href', 'https://github.com/ProductPope/VerbeApp');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
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

  it('labels an AI draft translation and leaves a reviewed one unlabelled', () => {
    renderApp();
    const alpha = articles().find((a) => a.dataset.cardId === 'alpha')!;
    expect(within(alpha).getByText('AI Translated')).toBeInTheDocument();
    expect(alpha).toHaveAccessibleDescription(/AI Translated/);
    const gamma = articles().find((a) => a.dataset.cardId === 'gamma')!;
    expect(within(gamma).getByText('Tekst gamma.')).toBeInTheDocument();
    expect(within(gamma).queryByText('AI Translated')).not.toBeInTheDocument();
  });

  it('can be switched off in the profile preferences', async () => {
    const { user, store } = renderApp();
    const preferences = await openPreferences(user);
    const toggle = within(preferences).getByRole('switch', { name: 'Polish translation' });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/AI/);
    await user.click(toggle);
    expect(store.get().translation).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Tekst alfa.')).not.toBeInTheDocument();
  });

  it('also appears in the profile', async () => {
    const { user, store } = renderApp();
    store.update((current) => ({ ...current, favorites: ['alpha'] }));
    const profile = await openProfile(user);
    const favorites = within(profile).getByRole('region', { name: 'Favourites' });
    expect(within(favorites).getByText('Tekst alfa.')).toHaveAttribute('lang', 'pl');
  });
});

describe('language', () => {
  it('switches the interface to Polish and keeps quotes in English', async () => {
    const { user } = renderApp();
    const preferences = await openPreferences(user);
    await user.selectOptions(
      within(preferences).getByRole('combobox', { name: 'App language' }),
      'pl',
    );
    expect(document.documentElement.lang).toBe('pl');
    const profile = screen.getByRole('dialog', { name: 'Twój profil' });
    expect(within(profile).getByRole('region', { name: 'Preferencje' })).toBeInTheDocument();
    await user.click(within(profile).getByRole('button', { name: 'Zamknij' }));
    expect(profile).not.toHaveAttribute('open');
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
    const settings = await openPreferences(user);
    expect(within(settings).queryByRole('switch', { name: /Daily quote/ })).toBeNull();
  });

  it('subscribes at the chosen hour, moves the hour and unsubscribes', async () => {
    const push = fakePush();
    const { user, store } = renderApp('en', { push });
    const settings = await openPreferences(user);
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
    const settings = await openPreferences(user);
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
  it('shows the notified quote first even when the catalogue is large', () => {
    const catalog = testCatalog();
    for (let i = 0; i < 40; i++) catalog.cards.push(card(`extra-${String(i)}`, ['philosophy']));
    renderApp('en', { catalog, initialCardId: 'extra-39' });
    expect(cardIds()[0]).toBe('extra-39');
    expect(cardIds()).toHaveLength(8);
  });
});

describe('a large catalogue', () => {
  it('renders a few cards at a time and adds more as the reader moves on', async () => {
    const catalog = testCatalog();
    for (let i = 0; i < 40; i++) catalog.cards.push(card(`extra-${String(i)}`, ['philosophy']));
    const { user } = renderApp('en', { catalog });
    expect(articles()).toHaveLength(8);
    articles()[0]!.focus();
    for (let i = 0; i < 6; i++) await user.keyboard('{PageDown}');
    expect(articles().length).toBeGreaterThan(8);
    expect(articles().length).toBeLessThanOrEqual(16);
    expect(new Set(cardIds()).size).toBe(cardIds().length);
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
    const badge = screen.getByRole('button', { name: 'Reading streak: 0 days in a row' });
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

  function catalogWithHabitQuote(): Catalog {
    const catalog = testCatalog();
    catalog.cards.push(
      card(HABIT_QUOTE_ID, ['productivity'], {
        text: 'Every habit is maintained by the corresponding actions.',
        translations: { pl: 'Każdy nawyk utrzymuje się dzięki działaniom.' },
        author: { en: 'Epictetus', pl: 'Epiktet' },
        work: 'Discourses',
      }),
    );
    return catalog;
  }

  it('opens a dialog about habits from the flame and closes it again', async () => {
    const { user } = renderApp('en', { catalog: catalogWithHabitQuote() });
    const flame = screen.getByRole('button', { name: 'Reading streak: 0 days in a row' });
    expect(flame).toHaveAttribute('aria-haspopup', 'dialog');
    await user.click(flame);
    const dialog = screen.getByRole('dialog', { name: 'Your reading streak' });
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByText('0 days in a row')).toBeInTheDocument();
    expect(within(dialog).getByText(/Habits shape who we become/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Come back tomorrow/)).toBeInTheDocument();
    const quote = within(dialog).getByText(/Every habit is maintained/);
    expect(quote.closest('blockquote')).toHaveAttribute('lang', 'en');
    expect(
      within(dialog).getByText('Każdy nawyk utrzymuje się dzięki działaniom.'),
    ).toHaveAttribute('lang', 'pl');
    expect(within(dialog).getByText('Discourses').tagName).toBe('CITE');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(dialog).not.toHaveAttribute('open');
  });

  it('speaks Polish and leaves out a quote the dataset no longer has', async () => {
    const { user } = renderApp('pl-PL');
    await user.click(screen.getByRole('button', { name: 'Seria czytania: 0 dni z rzędu' }));
    const dialog = screen.getByRole('dialog', { name: 'Twoja seria czytania' });
    expect(within(dialog).getByText(/To nawyki nas kształtują/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Wróć jutro/)).toBeInTheDocument();
    expect(dialog.querySelector('blockquote')).toBeNull();
  });
});

describe('your own quotes', () => {
  async function openAddForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    const section = screen.getByRole('region', { name: 'Your quotes' });
    await user.click(within(section).getByRole('button', { name: 'Add a quote' }));
    return screen.getByRole('dialog', { name: 'Add a quote' });
  }

  it('adds a quote that shows in the feed with its own label', async () => {
    const { user, personalStore, persistStorage } = renderApp();
    const dialog = await openAddForm(user);
    expect(within(dialog).getByRole('textbox', { name: 'Quote' })).toHaveAccessibleDescription(
      'Up to 1000 characters.',
    );
    await user.type(within(dialog).getByRole('textbox', { name: 'Quote' }), 'Mind the  gap.');
    await user.type(within(dialog).getByRole('textbox', { name: 'Author (optional)' }), 'Me');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Book or source (optional)' }),
      'Notebook, p. 3',
    );
    await user.click(within(dialog).getByRole('checkbox', { name: 'Philosophy' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog', { name: 'Add a quote' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Quote saved.');
    expect(persistStorage).toHaveBeenCalledOnce();
    const [saved] = personalStore.get();
    expect(saved).toMatchObject({
      text: 'Mind the gap.',
      author: 'Me',
      source: 'Notebook, p. 3',
      language: 'en',
      tags: ['philosophy'],
    });
    const section = screen.getByRole('region', { name: 'Your quotes' });
    expect(within(section).getByText('Mind the gap.')).toBeInTheDocument();
    expect(within(section).getByText('Me, Notebook, p. 3')).toBeInTheDocument();

    const card = articles().find((a) => a.dataset.cardId === saved!.id)!;
    expect(within(card).getByText('Your quote')).toBeInTheDocument();
    expect(within(card).getByText('Notebook, p. 3')).toBeInTheDocument();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
  });

  it('requires the text and says why', async () => {
    const { user, personalStore } = renderApp();
    const dialog = await openAddForm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    const field = within(dialog).getByRole('textbox', { name: 'Quote' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Enter the quote. Up to 1000 characters.');
    expect(field).toHaveFocus();
    expect(personalStore.get()).toEqual([]);
  });

  it('marks the language of a Polish quote and closes without saving on Cancel', async () => {
    const { user, personalStore } = renderApp('pl');
    await user.click(screen.getByRole('button', { name: 'Twój profil' }));
    await user.click(screen.getByRole('button', { name: 'Dodaj cytat' }));
    const dialog = screen.getByRole('dialog', { name: 'Dodaj cytat' });
    expect(within(dialog).getByRole('combobox', { name: 'Język cytatu' })).toHaveValue('pl');
    const field = within(dialog).getByRole('textbox', { name: 'Cytat' });
    await user.type(field, 'Nie wszystko złoto.');
    expect(field).toHaveAttribute('lang', 'pl');
    await user.click(within(dialog).getByRole('button', { name: 'Anuluj' }));
    expect(screen.queryByRole('dialog', { name: 'Dodaj cytat' })).not.toBeInTheDocument();
    expect(personalStore.get()).toEqual([]);
  });

  it('edits and deletes a quote, with undo', async () => {
    const { user, personalStore } = renderApp();
    const original = {
      id: 'mine-1',
      text: 'First draft.',
      author: '',
      source: '',
      language: 'en' as const,
      tags: [],
      added: '2026-10-13T10:00:00.000Z',
    };
    personalStore.update(() => [original]);
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    const section = screen.getByRole('region', { name: 'Your quotes' });
    const edit = within(section).getByRole('button', { name: 'Edit' });
    expect(edit).toHaveAccessibleDescription('First draft.');
    await user.click(edit);

    const dialog = screen.getByRole('dialog', { name: 'Edit quote' });
    const field = within(dialog).getByRole('textbox', { name: 'Quote' });
    expect(field).toHaveValue('First draft.');
    await user.clear(field);
    await user.type(field, 'Second draft.');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(personalStore.get()).toEqual([{ ...original, text: 'Second draft.' }]);

    await user.click(within(section).getByRole('button', { name: 'Delete' }));
    expect(personalStore.get()).toEqual([]);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Quote deleted.');
    await user.click(within(status).getByRole('button', { name: 'Undo' }));
    expect(personalStore.get()).toEqual([{ ...original, text: 'Second draft.' }]);
  });

  it('downloads a backup and restores it, skipping quotes already here', async () => {
    const { user, personalStore, saveFile } = renderApp();
    const quote = {
      id: 'mine-1',
      text: 'Keep me.',
      author: '',
      source: '',
      language: 'en' as const,
      tags: [],
      added: '2026-10-13T10:00:00.000Z',
    };
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    const section = screen.getByRole('region', { name: 'Your quotes' });
    expect(within(section).getByRole('button', { name: 'Download backup' })).toBeDisabled();

    act(() => {
      personalStore.update(() => [quote]);
    });
    await user.click(within(section).getByRole('button', { name: 'Download backup' }));
    expect(saveFile).toHaveBeenCalledWith(
      expect.stringMatching(/^verbeapp-my-quotes-\d{4}-\d{2}-\d{2}\.json$/),
      expect.any(String),
    );
    const backup = saveFile.mock.calls[0]![1];

    const input = screen.getByTestId('import-file');
    const other = { ...quote, id: 'mine-2', text: 'And me.' };
    const file = new File(
      [backup.replace('"quotes": [', `"quotes": [${JSON.stringify(other)},`)],
      'backup.json',
      { type: 'application/json' },
    );
    await user.upload(input, file);
    await vi.waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Added 1 quote from the backup.');
    });
    expect(personalStore.get()).toEqual([quote, other]);

    await user.upload(input, new File(['nope'], 'x.json', { type: 'application/json' }));
    await vi.waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('This file is not a VerbeApp backup.');
    });
  });

  it('previews a CSV file, explains skipped rows and imports on confirmation', async () => {
    const { user, personalStore, persistStorage } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    const csv = 'text;author;categories\nFirst.;Me;Philosophy\n;Nobody;\nSecond.;;Cooking\n';
    await user.upload(
      screen.getByTestId('import-csv'),
      new File([csv], 'quotes.csv', { type: 'text/csv' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Import from CSV' });
    expect(dialog).toHaveAccessibleDescription('1 quote ready to import.');
    expect(within(dialog).getByText('First.')).toBeInTheDocument();
    const problems = within(dialog).getByRole('region', { name: 'Rows that will be skipped' });
    expect(
      within(problems)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Row 3: no quote text.', 'Row 4: unknown category “Cooking”.']);
    expect(personalStore.get()).toEqual([]);

    await user.click(within(dialog).getByRole('button', { name: 'Import 1 quote' }));
    expect(screen.queryByRole('dialog', { name: 'Import from CSV' })).not.toBeInTheDocument();
    expect(personalStore.get()).toMatchObject([
      { text: 'First.', author: 'Me', tags: ['philosophy'], language: 'en' },
    ]);
    expect(persistStorage).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Added 1 quote from the CSV file.');
  });

  it('explains a CSV file it cannot read, without importing anything', async () => {
    const { user, personalStore } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    await user.upload(
      screen.getByTestId('import-csv'),
      new File(['author\nMe\n'], 'quotes.csv', { type: 'text/csv' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Import from CSV' });
    expect(dialog).toHaveAccessibleDescription(/at least one called text/);
    expect(within(dialog).queryByRole('button', { name: /^Import / })).not.toBeInTheDocument();
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.queryByRole('dialog', { name: 'Import from CSV' })).not.toBeInTheDocument();
    expect(personalStore.get()).toEqual([]);
  });

  it('explains the CSV format and offers a template', async () => {
    const { user, saveFile } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    await user.click(screen.getByText('How to prepare a CSV file'));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('rowheader', { name: 'categories' })).toBeInTheDocument();
    expect(within(table).getByText(/Available: Philosophy, Productivity\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download template' }));
    expect(saveFile).toHaveBeenCalledWith(
      'verbeapp-quotes-template.csv',
      expect.stringMatching(/^\uFEFFtext,author,source,language,categories\r\n/),
    );
  });

  it('shows saved notices only for a while', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Your profile' }));
    await user.click(screen.getByRole('button', { name: 'Add a quote' }));
    await user.type(screen.getByRole('textbox', { name: 'Quote' }), 'Brief.');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status')).toHaveTextContent('Quote saved.');
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('page', () => {
  it('offers a skip link to the quotes and sets the title', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Skip to quotes' })).toHaveAttribute('href', '#main');
    expect(document.title).toBe('VerbeApp: Wise words, one at a time');
  });
});

describe('offer to install', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  /** A browser that can install the app once, answering the dialog with `outcome`. */
  function fakeInstall(outcome: InstallOutcome = 'accepted') {
    let available = true;
    const listeners = new Set<() => void>();
    return {
      canInstall: () => available,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      install: vi.fn(() => {
        available = false;
        for (const listener of listeners) listener();
        return Promise.resolve(outcome);
      }),
    };
  }

  /** A returning reader who already knows how to swipe. */
  function savePreferences(prefs: Record<string, unknown> = {}) {
    localStorage.setItem('verbeapp:preferences:v1', JSON.stringify(prefs));
  }

  function offer() {
    return screen.queryByRole('complementary', { name: 'Install VerbeApp' });
  }

  async function favouriteFirst(user: ReturnType<typeof userEvent.setup>) {
    await user.click(within(articles()[0]!).getByRole('button', { name: 'Favourite' }));
  }

  it('waits for a moment of value instead of greeting a first visit', async () => {
    savePreferences();
    const install = fakeInstall();
    const { user } = renderApp('en', { install });
    expect(offer()).not.toBeInTheDocument();

    await favouriteFirst(user);
    expect(offer()).toHaveTextContent(/home screen/);
    expect(offer()).not.toContainElement(document.activeElement as HTMLElement);

    await user.click(within(offer()!).getByRole('button', { name: 'Install' }));
    expect(install.install).toHaveBeenCalledOnce();
    expect(offer()).not.toBeInTheDocument();
  });

  it('never competes with the swipe hint on the first launch', async () => {
    const { user } = renderApp('en', { install: fakeInstall() });
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(offer()).not.toBeInTheDocument();
    await favouriteFirst(user);
    expect(offer()).toBeInTheDocument();
  });

  it('shows itself to a reader back for a second day in a row', () => {
    savePreferences();
    const today = dayOf(new Date());
    localStorage.setItem(
      'verbeapp:streak:v1',
      JSON.stringify({ count: 2, lastDay: today, activeDay: today, activeMs: 30_000 }),
    );
    renderApp('en', { install: fakeInstall() });
    expect(offer()).toBeInTheDocument();
  });

  it('appears after the reader saves a quote of their own', async () => {
    savePreferences();
    const { user } = renderApp('en', { install: fakeInstall() });
    const profile = await openProfile(user);
    await user.click(within(profile).getByRole('button', { name: 'Add a quote' }));
    const form = screen.getByRole('dialog', { name: 'Add a quote' });
    await user.type(within(form).getByRole('textbox', { name: 'Quote' }), 'Mine.');
    await user.click(within(form).getByRole('button', { name: 'Save' }));
    expect(offer()).toBeInTheDocument();
  });

  it('is not offered where the browser cannot install', async () => {
    savePreferences();
    const { user } = renderApp();
    await favouriteFirst(user);
    expect(offer()).not.toBeInTheDocument();
  });

  it('remembers "Not now" for a month, and stops asking after two refusals', async () => {
    savePreferences();
    const first = renderApp('en', { install: fakeInstall() });
    await favouriteFirst(first.user);
    await first.user.click(within(offer()!).getByRole('button', { name: 'Not now' }));
    expect(offer()).not.toBeInTheDocument();
    expect(first.store.get().installDismissals).toBe(1);
    first.unmount();

    const again = renderApp('en', { install: fakeInstall() });
    await favouriteFirst(again.user);
    expect(offer()).not.toBeInTheDocument();
    again.unmount();

    const monthAgo = new Date(Date.now() - 31 * DAY_MS).toISOString();
    savePreferences({ installDismissals: 1, installDismissedAt: monthAgo });
    const later = renderApp('en', { install: fakeInstall() });
    await favouriteFirst(later.user);
    expect(offer()).toBeInTheDocument();
    await later.user.click(within(offer()!).getByRole('button', { name: 'Not now' }));
    expect(later.store.get().installDismissals).toBe(2);
    later.unmount();

    savePreferences({ installDismissals: 2, installDismissedAt: monthAgo });
    const last = renderApp('en', { install: fakeInstall() });
    await favouriteFirst(last.user);
    expect(offer()).not.toBeInTheDocument();
  });

  it('counts closing the browser dialog without installing as "Not now"', async () => {
    savePreferences();
    const { user, store } = renderApp('en', { install: fakeInstall('dismissed') });
    await favouriteFirst(user);
    await user.click(within(offer()!).getByRole('button', { name: 'Install' }));
    expect(store.get().installDismissals).toBe(1);
  });

  it('stays available in the profile while the app can be installed', async () => {
    savePreferences();
    const install = fakeInstall();
    const { user } = renderApp('en', { install });
    const profile = await openProfile(user);
    await user.click(within(profile).getByText('About VerbeApp'));
    await user.click(within(profile).getByRole('button', { name: 'Install the app' }));
    expect(install.install).toHaveBeenCalledOnce();
    expect(
      within(profile).queryByRole('button', { name: 'Install the app' }),
    ).not.toBeInTheDocument();
  });

  it('speaks Polish', async () => {
    savePreferences({ language: 'pl' });
    const { user } = renderApp('pl-PL', { install: fakeInstall() });
    await user.click(within(articles()[0]!).getByRole('button', { name: 'Ulubiony' }));
    const polish = screen.getByRole('complementary', { name: 'Zainstaluj VerbeApp' });
    expect(within(polish).getByRole('button', { name: 'Nie teraz' })).toBeInTheDocument();
  });
});
