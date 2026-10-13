import { describe, expect, it, vi } from 'vitest';
import {
  createInstallService,
  installOfferAllowed,
  type BeforeInstallPromptEvent,
} from '../../src/app/install/install.js';

/** Just enough of a window: events, display mode and navigator. */
function fakeWindow(standalone = false) {
  const target = new EventTarget();
  return Object.assign(target, {
    matchMedia: (query: string) => ({ matches: standalone && query.includes('standalone') }),
    navigator: {},
  }) as unknown as Window;
}

function installEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(event, {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  }) as BeforeInstallPromptEvent & { prompt: ReturnType<typeof vi.fn> };
}

describe('createInstallService', () => {
  it('keeps the browser offer for later and opens it once', async () => {
    const win = fakeWindow();
    const service = createInstallService(win);
    const listener = vi.fn();
    service.subscribe(listener);
    expect(service.canInstall()).toBe(false);
    expect(await service.install()).toBe('unavailable');

    const event = installEvent('accepted');
    win.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(service.canInstall()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();

    expect(await service.install()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(service.canInstall()).toBe(false);
    expect(await service.install()).toBe('unavailable');
  });

  it('reports a dismissed browser dialog', async () => {
    const win = fakeWindow();
    const service = createInstallService(win);
    win.dispatchEvent(installEvent('dismissed'));
    expect(await service.install()).toBe('dismissed');
  });

  it('forgets the offer once the app is installed', () => {
    const win = fakeWindow();
    const service = createInstallService(win);
    win.dispatchEvent(installEvent('accepted'));
    win.dispatchEvent(new Event('appinstalled'));
    expect(service.canInstall()).toBe(false);
  });

  it('never offers installing inside the installed app', () => {
    const win = fakeWindow(true);
    const service = createInstallService(win);
    win.dispatchEvent(installEvent('accepted'));
    expect(service.canInstall()).toBe(false);
  });
});

describe('installOfferAllowed', () => {
  const now = new Date('2026-10-13T12:00:00Z');

  it('allows a reader who never refused', () => {
    expect(installOfferAllowed(0, null, now)).toBe(true);
  });

  it('waits a month after "Not now"', () => {
    expect(installOfferAllowed(1, '2026-09-20T12:00:00Z', now)).toBe(false);
    expect(installOfferAllowed(1, '2026-09-13T12:00:00Z', now)).toBe(true);
  });

  it('stops after two refusals', () => {
    expect(installOfferAllowed(2, '2025-01-01T00:00:00Z', now)).toBe(false);
  });

  it('ignores an unreadable date', () => {
    expect(installOfferAllowed(1, 'yesterday', now)).toBe(true);
  });
});
