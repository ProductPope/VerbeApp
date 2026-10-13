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

function call(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://push.example.workers.dev${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}

const PUSH = 'https://fcm.googleapis.com/fcm/send/';
const subscriber = { endpoint: `${PUSH}one`, hour: 8, timeZone: 'Europe/Warsaw' };
// 10:00 UTC in January: 08:00 in Warsaw is due at 07:00 UTC.
const JANUARY = new Date('2026-01-15T10:00:00Z');

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

  it('saves a subscription in the bucket of its UTC hour, moves it and deletes it', async () => {
    const env = await testEnv();
    const kv = env.SUBSCRIBERS;
    const hash = await subscriberKey(subscriber.endpoint);
    const put = (body: unknown) => handleRequest(call('PUT', '/subscription', body), env, JANUARY);

    expect((await put(subscriber)).status).toBe(204);
    expect(kv.entries.get(`s:07:${hash}`)).toEqual(subscriber);
    expect(kv.values.get(`i:${hash}`)).toBe('7');

    await put({ ...subscriber, hour: 21 });
    expect(kv.entries.get(`s:20:${hash}`)).toMatchObject({ hour: 21 });
    expect([...kv.entries.keys()].sort()).toEqual([`i:${hash}`, `s:20:${hash}`]);

    const deleted = await handleRequest(
      call('DELETE', '/subscription', { endpoint: subscriber.endpoint }),
      env,
    );
    expect(deleted.status).toBe(204);
    expect(kv.entries.size).toBe(0);
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

  it('refuses endpoints that are not a browser push service', async () => {
    const env = await testEnv();
    for (const endpoint of [
      'https://attacker.example/ping',
      'https://fcm.googleapis.com.attacker.example/x',
      'https://fcm.googleapis.com:8443/fcm/send/x',
    ]) {
      const response = await handleRequest(
        call('PUT', '/subscription', { ...subscriber, endpoint }),
        env,
      );
      expect(response.status).toBe(400);
    }
    expect(env.SUBSCRIBERS.entries.size).toBe(0);
  });

  it('limits subscription changes per client', async () => {
    const env = await testEnv();
    const limit = vi.fn(({ key }: { key: string }) =>
      Promise.resolve({ success: key !== '203.0.113.9' }),
    );
    env.RATE_LIMITER = { limit };
    const from = (ip: string) =>
      handleRequest(call('PUT', '/subscription', subscriber, { 'CF-Connecting-IP': ip }), env);
    expect((await from('203.0.113.9')).status).toBe(429);
    expect(env.SUBSCRIBERS.entries.size).toBe(0);
    expect((await from('198.51.100.1')).status).toBe(204);
    expect((await handleRequest(call('GET', '/vapid-public-key'), env)).status).toBe(200);
    expect(limit).toHaveBeenCalledTimes(2);
  });

  it('returns 404 for anything else', async () => {
    const env = await testEnv();
    expect((await handleRequest(call('GET', '/subscription'), env)).status).toBe(404);
    expect((await handleRequest(call('POST', '/other'), env)).status).toBe(404);
  });
});

async function subscribe(
  env: Env,
  devices: { endpoint: string; hour: number; timeZone: string }[],
) {
  for (const device of devices) {
    await handleRequest(call('PUT', '/subscription', device), env, JANUARY);
  }
}

function okFetch() {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(new Response(null, { status: 201 })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('sendDueNotifications', () => {
  it('pushes to devices whose local hour has come and forgets expired ones', async () => {
    const env = await testEnv();
    await subscribe(env, [
      { endpoint: `${PUSH}ok`, hour: 8, timeZone: 'Europe/Warsaw' },
      { endpoint: `${PUSH}gone`, hour: 8, timeZone: 'Europe/Warsaw' },
      { endpoint: `${PUSH}error`, hour: 7, timeZone: 'UTC' },
      { endpoint: `${PUSH}offline`, hour: 2, timeZone: 'America/New_York' },
      { endpoint: `${PUSH}later`, hour: 9, timeZone: 'Europe/Warsaw' },
      { endpoint: `${PUSH}evening`, hour: 20, timeZone: 'Europe/Warsaw' },
    ]);
    await env.SUBSCRIBERS.put('s:07:broken', '', { metadata: { endpoint: 'x' } });

    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) => {
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
      `${PUSH}error`,
      `${PUSH}gone`,
      `${PUSH}offline`,
      `${PUSH}ok`,
    ]);
    const [, init] = fetchMock.mock.calls.find(([url]) => url.endsWith('/ok'))!;
    const headers = init?.headers as Record<string, string>;
    expect(init?.method).toBe('POST');
    expect(headers.Authorization).toMatch(/^vapid t=/);
    expect(headers.TTL).toBe('43200');
    const gone = await subscriberKey(`${PUSH}gone`);
    expect([...env.SUBSCRIBERS.entries.keys()].some((key) => key.endsWith(gone))).toBe(false);
    expect(env.SUBSCRIBERS.entries.has('s:07:broken')).toBe(false);
  });

  it('signs one token per push service for the whole run', async () => {
    const env = await testEnv();
    await subscribe(env, [
      { endpoint: `${PUSH}a`, hour: 8, timeZone: 'Europe/Warsaw' },
      { endpoint: `${PUSH}b`, hour: 8, timeZone: 'Europe/Warsaw' },
    ]);
    const fetchMock = okFetch();
    await sendDueNotifications(env, new Date('2026-01-15T07:00:00Z'));
    const tokens = fetchMock.mock.calls.map(
      ([, init]) => (init?.headers as Record<string, string>).Authorization,
    );
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toBe(tokens[1]);
  });

  it('follows daylight saving time without missing or repeating a day', async () => {
    const env = await testEnv();
    const device = { endpoint: `${PUSH}dst`, hour: 8, timeZone: 'Europe/Warsaw' };
    await subscribe(env, [device]);
    const hash = await subscriberKey(device.endpoint);
    expect(env.SUBSCRIBERS.entries.has(`s:07:${hash}`)).toBe(true);

    // In summer 08:00 in Warsaw is 06:00 UTC, an hour before its winter bucket.
    const fetchMock = okFetch();
    expect(await sendDueNotifications(env, new Date('2026-07-15T06:00:00Z'))).toMatchObject({
      sent: 1,
    });
    expect(env.SUBSCRIBERS.entries.has(`s:06:${hash}`)).toBe(true);
    expect(env.SUBSCRIBERS.entries.has(`s:07:${hash}`)).toBe(false);
    expect(await sendDueNotifications(env, new Date('2026-07-15T07:00:00Z'))).toMatchObject({
      sent: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('moves records saved before buckets existed, once', async () => {
    const env = await testEnv();
    const device = { endpoint: `${PUSH}old`, hour: 8, timeZone: 'Europe/Warsaw' };
    const hash = await subscriberKey(device.endpoint);
    await env.SUBSCRIBERS.put(hash, '', { metadata: device });
    await env.SUBSCRIBERS.put('a'.repeat(64), '', { metadata: { endpoint: 'x' } });
    const fetchMock = okFetch();

    expect(await sendDueNotifications(env, new Date('2026-01-15T07:00:00Z'))).toMatchObject({
      sent: 1,
    });
    expect(env.SUBSCRIBERS.entries.has(hash)).toBe(false);
    expect(env.SUBSCRIBERS.entries.has('a'.repeat(64))).toBe(false);
    expect(env.SUBSCRIBERS.entries.get(`s:07:${hash}`)).toEqual(device);
    expect(env.SUBSCRIBERS.values.has('meta:bucketed')).toBe(true);

    // A record that somehow appears later in the old format is left alone.
    await env.SUBSCRIBERS.put('b'.repeat(64), '', { metadata: device });
    await sendDueNotifications(env, new Date('2026-01-16T07:00:00Z'));
    expect(env.SUBSCRIBERS.entries.has('b'.repeat(64))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
