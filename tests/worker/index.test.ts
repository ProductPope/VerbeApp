import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { handleRequest, sendDueNotifications, type Env } from '../../worker/src/index.js';
import { subscriberKey } from '../../worker/src/subscriptions.js';
import { generateVapidKeys } from '../../worker/src/vapid.js';
import { fakeKv } from './fake-kv.js';

const ORIGIN = 'https://productpope.github.io';

async function testEnv(): Promise<Env & { SUBSCRIBERS: ReturnType<typeof fakeKv> }> {
  const keys = await generateVapidKeys();
  return {
    SUBSCRIBERS: fakeKv(),
    ALLOWED_ORIGIN: ORIGIN,
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: 'https://github.com/ProductPope/VerbeApp',
  };
}

function call(method: string, path: string, body?: unknown): Request {
  return new Request(`https://push.example.workers.dev${path}`, {
    method,
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}

const subscriber = { endpoint: 'https://push.example/one', hour: 8, timeZone: 'Europe/Warsaw' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HTTP API', () => {
  it('answers CORS preflight for the app origin only', async () => {
    const env = await testEnv();
    const response = await handleRequest(call('OPTIONS', '/subscription'), env);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
  });

  it('serves the VAPID public key', async () => {
    const env = await testEnv();
    const response = await handleRequest(call('GET', '/vapid-public-key'), env);
    expect(await response.json()).toEqual({ publicKey: env.VAPID_PUBLIC_KEY });
  });

  it('saves, updates and deletes a subscription', async () => {
    const env = await testEnv();
    const key = await subscriberKey(subscriber.endpoint);
    expect((await handleRequest(call('PUT', '/subscription', subscriber), env)).status).toBe(204);
    expect(env.SUBSCRIBERS.entries.get(key)).toEqual(subscriber);

    await handleRequest(call('PUT', '/subscription', { ...subscriber, hour: 21 }), env);
    expect(env.SUBSCRIBERS.entries.get(key)).toMatchObject({ hour: 21 });
    expect(env.SUBSCRIBERS.entries.size).toBe(1);

    const deleted = await handleRequest(
      call('DELETE', '/subscription', { endpoint: subscriber.endpoint }),
      env,
    );
    expect(deleted.status).toBe(204);
    expect(env.SUBSCRIBERS.entries.size).toBe(0);
  });

  it('rejects invalid, oversized and unparseable bodies', async () => {
    const env = await testEnv();
    const bad = [
      call('PUT', '/subscription', { ...subscriber, hour: 99 }),
      call('PUT', '/subscription', '{not json'),
      call('PUT', '/subscription', { ...subscriber, padding: 'x'.repeat(3000) }),
      call('DELETE', '/subscription', { endpoint: 'nope' }),
    ];
    for (const request of bad) expect((await handleRequest(request, env)).status).toBe(400);
    expect(env.SUBSCRIBERS.entries.size).toBe(0);
  });

  it('returns 404 for anything else', async () => {
    const env = await testEnv();
    expect((await handleRequest(call('GET', '/subscription'), env)).status).toBe(404);
    expect((await handleRequest(call('POST', '/other'), env)).status).toBe(404);
  });
});

describe('sendDueNotifications', () => {
  it('pushes to devices whose local hour has come and forgets expired ones', async () => {
    const env = await testEnv();
    const devices = [
      { endpoint: 'https://push.example/ok', hour: 8, timeZone: 'Europe/Warsaw' },
      { endpoint: 'https://push.example/gone', hour: 8, timeZone: 'Europe/Warsaw' },
      { endpoint: 'https://push.example/error', hour: 7, timeZone: 'UTC' },
      { endpoint: 'https://push.example/offline', hour: 2, timeZone: 'America/New_York' },
      { endpoint: 'https://push.example/later', hour: 9, timeZone: 'Europe/Warsaw' },
    ];
    for (const device of devices) {
      await env.SUBSCRIBERS.put(await subscriberKey(device.endpoint), '', { metadata: device });
    }
    await env.SUBSCRIBERS.put('broken', '', { metadata: { endpoint: 'x' } });

    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/gone')) return Promise.resolve(new Response(null, { status: 410 }));
      if (url.endsWith('/error')) return Promise.resolve(new Response(null, { status: 500 }));
      if (url.endsWith('/offline')) return Promise.reject(new Error('network'));
      return Promise.resolve(new Response(null, { status: 201 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    // 07:00 UTC in January is 08:00 in Warsaw and 02:00 in New York.
    const result = await sendDueNotifications(env, new Date('2026-01-15T07:00:00Z'));

    expect(result).toEqual({ sent: 1, removed: 1, failed: 2 });
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
      'https://push.example/error',
      'https://push.example/gone',
      'https://push.example/offline',
      'https://push.example/ok',
    ]);
    const [, init] = fetchMock.mock.calls.find(([url]) => url.endsWith('/ok'))! as unknown as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^vapid t=/);
    expect((init.headers as Record<string, string>).TTL).toBe('43200');
    expect(env.SUBSCRIBERS.entries.has(await subscriberKey('https://push.example/gone'))).toBe(
      false,
    );
    expect(env.SUBSCRIBERS.entries.size).toBe(5);
  });

  it('is what the hourly cron trigger runs', async () => {
    const env = await testEnv();
    vi.stubGlobal('fetch', vi.fn());
    const pending: Promise<unknown>[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    worker.scheduled({ scheduledTime: Date.UTC(2026, 0, 15, 7) }, env, {
      waitUntil: (promise) => pending.push(promise),
    });
    await Promise.all(pending);
    expect(log).toHaveBeenCalledWith(JSON.stringify({ sent: 0, removed: 0, failed: 0 }));
  });
});
