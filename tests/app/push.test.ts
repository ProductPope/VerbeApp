import { describe, expect, it, vi } from 'vitest';
import {
  createPushService,
  isPushSupported,
  NotificationsBlockedError,
  type PushEnvironment,
} from '../../src/app/notifications/push.js';

function setup(options: { permission?: NotificationPermission; existing?: boolean } = {}) {
  const unsubscribe = vi.fn(() => Promise.resolve(true));
  const subscription = { endpoint: 'https://push.example/device', unsubscribe };
  let current: typeof subscription | null = options.existing ? subscription : null;
  const pushManager = {
    getSubscription: vi.fn(() => Promise.resolve(current)),
    subscribe: vi.fn(() => {
      current = subscription;
      return Promise.resolve(subscription);
    }),
  };
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) =>
    Promise.resolve(
      url.endsWith('/vapid-public-key')
        ? Response.json({ publicKey: 'PUBLIC' })
        : new Response(null, { status: 204 }),
    ),
  );
  const env = {
    serviceWorker: { ready: Promise.resolve({ pushManager }) },
    requestPermission: () => Promise.resolve(options.permission ?? 'granted'),
    fetch: fetchMock,
    timeZone: 'Europe/Warsaw',
  } as unknown as PushEnvironment;
  return {
    service: createPushService('https://api.example/', env),
    pushManager,
    fetchMock,
    unsubscribe,
  };
}

describe('push service', () => {
  it('subscribes with the server key and registers the hour and time zone', async () => {
    const { service, pushManager, fetchMock } = setup();
    await service.subscribe(7);
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: 'PUBLIC',
    });
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe('https://api.example/subscription');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({
      endpoint: 'https://push.example/device',
      hour: 7,
      timeZone: 'Europe/Warsaw',
    });
  });

  it('reuses an existing subscription when only the hour changes', async () => {
    const { service, pushManager } = setup({ existing: true });
    await service.subscribe(21);
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('stops when the reader blocks notifications', async () => {
    const { service, fetchMock } = setup({ permission: 'denied' });
    await expect(service.subscribe(8)).rejects.toBeInstanceOf(NotificationsBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports server errors', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(service.subscribe(8)).rejects.toThrow('HTTP 503');
    fetchMock.mockResolvedValueOnce(Response.json({ publicKey: 'PUBLIC' }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(service.subscribe(8)).rejects.toThrow('PUT https://api.example/subscription');
  });

  it('unsubscribes on the server and in the browser', async () => {
    const { service, fetchMock, unsubscribe } = setup({ existing: true });
    await service.unsubscribe();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.example/subscription');
    expect(init?.method).toBe('DELETE');
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('has nothing to do when the device is not subscribed', async () => {
    const { service, fetchMock } = setup();
    await service.unsubscribe();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('isPushSupported', () => {
  it('is false in jsdom, which has no Push API', () => {
    expect(isPushSupported()).toBe(false);
  });
});
