import {
  localHour,
  parseEndpoint,
  parseSubscriber,
  subscriberKey,
  type Subscriber,
} from './subscriptions.js';
import { vapidAuthorization, type VapidKeys } from './vapid.js';

/** The parts of Cloudflare's KV binding this worker uses. */
export interface KVNamespace {
  put(key: string, value: string, options?: { metadata?: unknown }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { cursor?: string }): Promise<{
    keys: { name: string; metadata?: unknown }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export interface Env {
  SUBSCRIBERS: KVNamespace;
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

/**
 * HTTP API used by the app:
 * - GET /vapid-public-key: the key the browser needs to subscribe.
 * - PUT /subscription: `{ endpoint, hour, timeZone }` saves or updates a device.
 * - DELETE /subscription: `{ endpoint }` forgets a device.
 */
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) });

  if (pathname === '/vapid-public-key' && request.method === 'GET') {
    return respond(env, 200, { publicKey: env.VAPID_PUBLIC_KEY });
  }

  if (pathname === '/subscription' && request.method === 'PUT') {
    const subscriber = parseSubscriber(await readJson(request));
    if (!subscriber) return respond(env, 400, { error: 'Invalid subscription' });
    await env.SUBSCRIBERS.put(await subscriberKey(subscriber.endpoint), '', {
      metadata: subscriber,
    });
    return respond(env, 204);
  }

  if (pathname === '/subscription' && request.method === 'DELETE') {
    const endpoint = parseEndpoint(await readJson(request));
    if (!endpoint) return respond(env, 400, { error: 'Invalid endpoint' });
    await env.SUBSCRIBERS.delete(await subscriberKey(endpoint));
    return respond(env, 204);
  }

  return respond(env, 404, { error: 'Not found' });
}

async function* allSubscribers(kv: KVNamespace): AsyncGenerator<{ key: string } & Subscriber> {
  let cursor: string | undefined;
  do {
    const page = await kv.list(cursor === undefined ? {} : { cursor });
    for (const { name, metadata } of page.keys) {
      const subscriber = parseSubscriber(metadata);
      if (subscriber) yield { key: name, ...subscriber };
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor !== undefined);
}

/**
 * Sends an empty push. The app's service worker picks the quote itself, so
 * no payload encryption is needed and the server never sees any preferences.
 */
export async function sendPush(endpoint: string, keys: VapidKeys, now: Date): Promise<Response> {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(endpoint, keys, Math.floor(now.getTime() / 1000)),
      TTL: String(PUSH_TTL_SECONDS),
      Urgency: 'normal',
      'Content-Length': '0',
    },
  });
}

/** Runs every hour on the hour and notifies everyone whose local hour has come. */
export async function sendDueNotifications(
  env: Env,
  now: Date,
): Promise<{ sent: number; removed: number; failed: number }> {
  const keys = vapidKeys(env);
  const due: ({ key: string } & Subscriber)[] = [];
  for await (const subscriber of allSubscribers(env.SUBSCRIBERS)) {
    if (localHour(now, subscriber.timeZone) === subscriber.hour) due.push(subscriber);
  }

  const result = { sent: 0, removed: 0, failed: 0 };
  for (let start = 0; start < due.length; start += SEND_BATCH) {
    await Promise.all(
      due.slice(start, start + SEND_BATCH).map(async ({ key, endpoint }) => {
        try {
          const response = await sendPush(endpoint, keys, now);
          if (response.ok) {
            result.sent++;
          } else if (response.status === 404 || response.status === 410) {
            // The browser dropped this subscription; forget it.
            await env.SUBSCRIBERS.delete(key);
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
  fetch: handleRequest,
  scheduled(controller: ScheduledController, env: Env, context: ExecutionContext): void {
    context.waitUntil(
      sendDueNotifications(env, new Date(controller.scheduledTime)).then((result) => {
        console.log(JSON.stringify(result));
      }),
    );
  },
};
