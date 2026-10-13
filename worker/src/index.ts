import {
  localHour,
  parseEndpoint,
  parseSubscriber,
  subscriberKey,
  utcHourFor,
  type Subscriber,
} from './subscriptions.js';
import { vapidAuthorization, type VapidKeys } from './vapid.js';

/** The parts of Cloudflare's KV binding this worker uses. */
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { metadata?: unknown }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string; metadata?: unknown }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

/** Cloudflare's rate limiting binding. */
export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  SUBSCRIBERS: KVNamespace;
  /** Limits subscription changes per client IP; absent in local tests. */
  RATE_LIMITER?: RateLimit;
  /** Origin of the app allowed to call the API, e.g. https://productpope.github.io. */
  ALLOWED_ORIGIN: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

export interface ScheduledController {
  scheduledTime: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const MAX_BODY_BYTES = 2048;
/** Keep the push for half a day if the phone is offline; after that it is stale. */
const PUSH_TTL_SECONDS = 12 * 60 * 60;
const SEND_BATCH = 50;

/*
 * Storage layout. Each device is stored once, in the bucket of the UTC hour
 * its notification is due, so the hourly run reads only a few buckets
 * instead of every device:
 *   s:<UTC hour, 2 digits>:<hash>  metadata: the subscriber
 *   i:<hash>                      value: the UTC hour bucket it is in
 * Records from before buckets existed are keyed by the bare hash; the first
 * hourly run moves them.
 */
const BUCKETED_FLAG = 'meta:bucketed';
const LEGACY_KEY = /^[0-9a-f]{64}$/;

function bucketPrefix(hour: number): string {
  return `s:${String(hour).padStart(2, '0')}:`;
}

function indexKey(hash: string): string {
  return `i:${hash}`;
}

async function saveSubscriber(kv: KVNamespace, subscriber: Subscriber, now: Date): Promise<void> {
  const hash = await subscriberKey(subscriber.endpoint);
  const bucket = utcHourFor(subscriber, now);
  const previous = await kv.get(indexKey(hash));
  if (previous !== null && Number(previous) !== bucket) {
    await kv.delete(`${bucketPrefix(Number(previous))}${hash}`);
  }
  await kv.put(`${bucketPrefix(bucket)}${hash}`, '', { metadata: subscriber });
  if (previous === null || Number(previous) !== bucket) {
    await kv.put(indexKey(hash), String(bucket));
  }
}

async function forgetSubscriber(kv: KVNamespace, hash: string): Promise<void> {
  const bucket = await kv.get(indexKey(hash));
  if (bucket !== null) await kv.delete(`${bucketPrefix(Number(bucket))}${hash}`);
  await kv.delete(indexKey(hash));
  await kv.delete(hash);
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function respond(env: Env, status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(env), 'Content-Type': 'application/json' },
  });
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function vapidKeys(env: Env): VapidKeys {
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };
}

/** False when this client has changed subscriptions too often lately. */
async function withinRateLimit(request: Request, env: Env): Promise<boolean> {
  if (!env.RATE_LIMITER) return true;
  const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  return (await env.RATE_LIMITER.limit({ key })).success;
}

/**
 * HTTP API used by the app:
 * - GET /vapid-public-key: the key the browser needs to subscribe.
 * - PUT /subscription: `{ endpoint, hour, timeZone }` saves or updates a device.
 * - DELETE /subscription: `{ endpoint }` forgets a device.
 * Endpoints must belong to a browser push service, and changes are rate limited.
 */
export async function handleRequest(
  request: Request,
  env: Env,
  now: Date = new Date(),
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) });

  if (pathname === '/vapid-public-key' && request.method === 'GET') {
    return respond(env, 200, { publicKey: env.VAPID_PUBLIC_KEY });
  }

  const changesSubscription =
    pathname === '/subscription' && (request.method === 'PUT' || request.method === 'DELETE');
  if (changesSubscription && !(await withinRateLimit(request, env))) {
    return respond(env, 429, { error: 'Too many requests' });
  }

  if (pathname === '/subscription' && request.method === 'PUT') {
    const subscriber = parseSubscriber(await readJson(request));
    if (!subscriber) return respond(env, 400, { error: 'Invalid subscription' });
    await saveSubscriber(env.SUBSCRIBERS, subscriber, now);
    return respond(env, 204);
  }

  if (pathname === '/subscription' && request.method === 'DELETE') {
    const endpoint = parseEndpoint(await readJson(request));
    if (!endpoint) return respond(env, 400, { error: 'Invalid endpoint' });
    await forgetSubscriber(env.SUBSCRIBERS, await subscriberKey(endpoint));
    return respond(env, 204);
  }

  return respond(env, 404, { error: 'Not found' });
}

async function* listAll(
  kv: KVNamespace,
  prefix?: string,
): AsyncGenerator<{ name: string; metadata?: unknown }> {
  let cursor: string | undefined;
  do {
    const options = {
      ...(prefix === undefined ? {} : { prefix }),
      ...(cursor === undefined ? {} : { cursor }),
    };
    const page = await kv.list(options);
    yield* page.keys;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor !== undefined);
}

/** Moves records stored before buckets existed into their buckets, once. */
async function moveLegacyRecords(kv: KVNamespace, now: Date): Promise<void> {
  if ((await kv.get(BUCKETED_FLAG)) !== null) return;
  for await (const { name, metadata } of listAll(kv)) {
    if (!LEGACY_KEY.test(name)) continue;
    const subscriber = parseSubscriber(metadata);
    if (subscriber) await saveSubscriber(kv, subscriber, now);
    await kv.delete(name);
  }
  await kv.put(BUCKETED_FLAG, now.toISOString());
}

/**
 * Sends an empty push. The app's service worker picks the quote itself, so
 * no payload encryption is needed and the server never sees any preferences.
 */
export async function sendPush(endpoint: string, authorization: string): Promise<Response> {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      TTL: String(PUSH_TTL_SECONDS),
      Urgency: 'normal',
      'Content-Length': '0',
    },
  });
}

/**
 * Runs every hour on the hour and notifies everyone whose local hour has come.
 * It reads this hour's bucket and its two neighbours, because a daylight
 * saving change moves a device's due time by an hour: such a device is sent
 * its notification and moved to its new bucket.
 */
export async function sendDueNotifications(
  env: Env,
  now: Date,
): Promise<{ sent: number; removed: number; failed: number }> {
  const kv = env.SUBSCRIBERS;
  await moveLegacyRecords(kv, now);

  const keys = vapidKeys(env);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  // One signed token per push service for the whole run.
  const tokens = new Map<string, Promise<string>>();
  function authorization(endpoint: string): Promise<string> {
    const audience = new URL(endpoint).origin;
    let token = tokens.get(audience);
    if (!token) {
      token = vapidAuthorization(endpoint, keys, nowSeconds);
      tokens.set(audience, token);
    }
    return token;
  }

  const hour = now.getUTCHours();
  const found: { name: string; hash: string; bucket: number; metadata?: unknown }[] = [];
  for (const bucket of [(hour + 23) % 24, hour, (hour + 1) % 24]) {
    const prefix = bucketPrefix(bucket);
    for await (const { name, metadata } of listAll(kv, prefix)) {
      found.push({ name, hash: name.slice(prefix.length), bucket, metadata });
    }
  }

  const due = new Map<string, string>();
  for (const { name, hash, bucket, metadata } of found) {
    const subscriber = parseSubscriber(metadata);
    if (!subscriber) {
      await kv.delete(name);
      continue;
    }
    if (localHour(now, subscriber.timeZone) === subscriber.hour) due.set(hash, subscriber.endpoint);
    if (utcHourFor(subscriber, now) !== bucket) await saveSubscriber(kv, subscriber, now);
  }

  const result = { sent: 0, removed: 0, failed: 0 };
  for (let start = 0; start < due.size; start += SEND_BATCH) {
    await Promise.all(
      [...due].slice(start, start + SEND_BATCH).map(async ([hash, endpoint]) => {
        try {
          const response = await sendPush(endpoint, await authorization(endpoint));
          if (response.ok) {
            result.sent++;
          } else if (response.status === 404 || response.status === 410) {
            // The browser dropped this subscription; forget it.
            await forgetSubscriber(kv, hash);
            result.removed++;
          } else {
            result.failed++;
          }
        } catch {
          result.failed++;
        }
      }),
    );
  }
  return result;
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
  scheduled(controller: ScheduledController, env: Env, context: ExecutionContext): void {
    context.waitUntil(
      sendDueNotifications(env, new Date(controller.scheduledTime)).then((result) => {
        console.log(JSON.stringify(result));
      }),
    );
  },
};
