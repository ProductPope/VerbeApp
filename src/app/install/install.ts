/**
 * Installing the app to the home screen. Chromium browsers (Chrome on Android
 * among them) fire `beforeinstallprompt` once the site qualifies as an
 * installable PWA. The event is kept so the app can open the browser's own
 * install dialog later, at a moment that suits the reader, instead of the
 * browser's banner interrupting the first visit. Browsers without the event
 * (Safari, Firefox) never offer it, and the app simply shows nothing.
 */

/** The non-standard event Chromium fires when the app can be installed. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface InstallService {
  /** True while the browser lets the app open its install dialog. */
  canInstall: () => boolean;
  subscribe: (listener: () => void) => () => void;
  /** Opens the browser's install dialog; each captured event works once. */
  install: () => Promise<InstallOutcome>;
}

/** Reader just dismissed the offer: wait this long before offering again. */
export const INSTALL_SNOOZE_DAYS = 30;

/** After this many dismissals the offer never appears on its own again. */
export const MAX_INSTALL_DISMISSALS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Starts listening for the install event. Call it as early as possible: the
 * browser may fire the event before the app has rendered.
 */
export function createInstallService(win: Window = window): InstallService {
  let deferred: BeforeInstallPromptEvent | null = null;
  const listeners = new Set<() => void>();
  const standalone = () =>
    win.matchMedia('(display-mode: standalone)').matches ||
    (win.navigator as Navigator & { standalone?: boolean }).standalone === true;

  function set(next: BeforeInstallPromptEvent | null) {
    deferred = next;
    for (const listener of listeners) listener();
  }

  win.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's own banner away; the app offers installing itself.
    event.preventDefault();
    set(event as BeforeInstallPromptEvent);
  });
  win.addEventListener('appinstalled', () => {
    set(null);
  });

  return {
    canInstall: () => deferred !== null && !standalone(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    install: async () => {
      const event = deferred;
      if (event === null) return 'unavailable';
      set(null);
      await event.prompt();
      const { outcome } = await event.userChoice;
      return outcome;
    },
  };
}

/**
 * Whether the reader's earlier answers still allow offering installation:
 * never after repeated refusals, and not again soon after the last one.
 */
export function installOfferAllowed(
  dismissals: number,
  dismissedAt: string | null,
  now: Date,
): boolean {
  if (dismissals >= MAX_INSTALL_DISMISSALS) return false;
  if (dismissedAt === null) return true;
  const since = now.getTime() - Date.parse(dismissedAt);
  return Number.isNaN(since) || since >= INSTALL_SNOOZE_DAYS * DAY_MS;
}
