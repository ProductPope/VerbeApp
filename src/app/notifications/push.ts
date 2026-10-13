/**
 * Subscribes this device to the daily quote. The push server only learns the
 * browser's push endpoint, the chosen hour and the time zone.
 */
export interface PushService {
  subscribe(hour: number): Promise<void>;
  unsubscribe(): Promise<void>;
}

export class NotificationsBlockedError extends Error {
  constructor() {
    super('Notifications are blocked');
    this.name = 'NotificationsBlockedError';
  }
}

export interface PushEnvironment {
  serviceWorker: Pick<ServiceWorkerContainer, 'ready'>;
  requestPermission: () => Promise<NotificationPermission>;
  fetch: typeof fetch;
  timeZone: string;
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function send(env: PushEnvironment, url: string, method: string, body: unknown) {
  const response = await env.fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${url}: HTTP ${String(response.status)}`);
}

export function createPushService(apiUrl: string, env: PushEnvironment): PushService {
  const api = apiUrl.replace(/\/+$/, '');

  async function publicKey(): Promise<string> {
    const response = await env.fetch(`${api}/vapid-public-key`);
    if (!response.ok) throw new Error(`Push server: HTTP ${String(response.status)}`);
    return ((await response.json()) as { publicKey: string }).publicKey;
  }

  return {
    async subscribe(hour) {
      if ((await env.requestPermission()) !== 'granted') throw new NotificationsBlockedError();
      const { pushManager } = await env.serviceWorker.ready;
      const applicationServerKey = await publicKey();
      const subscription =
        (await pushManager.getSubscription()) ??
        (await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));
      await send(env, `${api}/subscription`, 'PUT', {
        endpoint: subscription.endpoint,
        hour,
        timeZone: env.timeZone,
      });
    },

    async unsubscribe() {
      const { pushManager } = await env.serviceWorker.ready;
      const subscription = await pushManager.getSubscription();
      if (subscription === null) return;
      await send(env, `${api}/subscription`, 'DELETE', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    },
  };
}
