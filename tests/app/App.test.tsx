import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.js';
import { readingTimeMs, seededRandom } from '../../src/app/feed/queue.js';
import { createPreferencesStore } from '../../src/app/prefs/store.js';
import { testCatalog } from './fixtures.js';

function renderApp(language = 'en') {
  const store = createPreferencesStore(localStorage, language);
  const user = userEvent.setup();
  const view = render(
    <App catalog={testCatalog()} store={store} random={seededRandom(1)} reducedMotion={false} />,
  );
  return { store, user, ...view };
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
  });

  it('inside an article only Page Down and Page Up move, so controls keep their keys', async () => {
    const { user } = renderApp();
    const list = articles();
    const favorite = within(list[0]!).getByRole('button', { name: 'Favourite' });
    favorite.focus();
    await user.keyboard('{ArrowDown}');
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

    await user.click(screen.getByRole('button', { name: 'Saved' }));
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-current', 'page');
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
    await user.click(screen.getByRole('button', { name: 'Saved' }));
    const hidden = screen.getByRole('region', { name: 'Hidden quotes' });
    expect(within(hidden).getAllByRole('listitem')).toHaveLength(1);
    await user.click(within(hidden).getByRole('button', { name: 'Show again' }));
    expect(within(hidden).getByText('Nothing hidden.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quotes' }));
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
    const group = screen.getByRole('group', { name: 'Categories' });
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

describe('language', () => {
  it('switches the interface and quotes to Polish, marking English fallbacks', async () => {
    const { user } = renderApp();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pl');
    expect(document.documentElement.lang).toBe('pl');
    expect(screen.getByRole('feed', { name: 'Lista cytatów' })).toBeInTheDocument();
    const alpha = articles().find((a) => a.dataset.cardId === 'alpha')!;
    expect(within(alpha).getByText('Tekst alfa.').closest('blockquote')).toHaveAttribute(
      'lang',
      'pl',
    );
    expect(within(alpha).getByText('Marek Aureliusz')).toBeInTheDocument();
    const beta = articles().find((a) => a.dataset.cardId === 'beta')!;
    expect(within(beta).getByText('Text of beta.').closest('blockquote')).toHaveAttribute(
      'lang',
      'en',
    );
    expect(within(beta).getByText(/Jeszcze bez tłumaczenia/)).toBeInTheDocument();
  });

  it('starts in Polish for a Polish browser', () => {
    renderApp('pl-PL');
    expect(screen.getByRole('button', { name: 'Cytaty' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Auto-advance off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    advanceBy(60_000);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
  });

  it('moves to the next quote after its reading time once switched on', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance off' }));
    expect(screen.getByRole('button', { name: 'Auto-advance on' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const wait = readingTimeMs(articles()[0]!.querySelector('blockquote')!.textContent);
    advanceBy(wait - 100);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
    advanceBy(200);
    expect(articles()[1]!.dataset.scrolledTo).toBe('true');
    expect(articles()[1]).not.toHaveFocus();
  });

  it('pauses while a mouse is over the feed and while the page is hidden', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance off' }));
    const feed = screen.getByRole('feed');
    fireEvent.pointerEnter(feed, { pointerType: 'mouse' });
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
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance off' }));
    const feed = screen.getByRole('feed');
    fireEvent.pointerEnter(feed, { pointerType: 'touch' });
    advanceBy(7_000);
    fireEvent.pointerDown(feed);
    advanceBy(7_000);
    expect(articles()[1]!.dataset.scrolledTo).toBeUndefined();
    advanceBy(24_000);
    expect(articles()[1]!.dataset.scrolledTo).toBe('true');
  });

  it('pauses while keyboard focus is in the feed', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-advance off' }));
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

describe('page', () => {
  it('offers a skip link to the quotes and sets the title', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Skip to quotes' })).toHaveAttribute('href', '#main');
    expect(document.title).toBe('VerbeApp: Wise words, one at a time');
  });
});
