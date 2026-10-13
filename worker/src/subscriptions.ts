/** What the worker keeps about one device. Stored as KV metadata (max 1 KiB). */
export interface Subscriber {
  endpoint: string;
  /** Local hour, 0–23, at which the reader wants the quote. */
  hour: number;
  /** IANA time zone of the reader's device, e.g. Europe/Warsaw. */
  timeZone: string;
}

const MAX_ENDPOINT_LENGTH = 800;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Hosts of the browsers' push services. Anything else is refused, so the
 * worker cannot be made to send requests to arbitrary addresses.
 */
const PUSH_HOSTS = ['fcm.googleapis.com', 'web.push.apple.com'];
const PUSH_HOST_SUFFIXES = ['.push.services.mozilla.com', '.notify.windows.com', '.push.apple.com'];

export function isPushServiceHost(host: string): boolean {
  return PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_ENDPOINT_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.port === '' && isPushServiceHost(url.hostname);
  } catch {
    return false;
  }
}

/** Accepts `{ endpoint, hour, timeZone }` and rejects anything else. */
export function parseSubscriber(body: unknown): Subscriber | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const { endpoint, hour, timeZone } = body as Record<string, unknown>;
  if (!isPushEndpoint(endpoint)) return undefined;
  if (typeof hour !== 'number' || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return undefined;
  }
  if (typeof timeZone !== 'string' || timeZone.length > 64 || !isValidTimeZone(timeZone)) {
    return undefined;
  }
  return { endpoint, hour, timeZone };
}

export function parseEndpoint(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const { endpoint } = body as Record<string, unknown>;
  return isPushEndpoint(endpoint) ? endpoint : undefined;
}

/** Endpoints are long capability URLs; the key is their SHA-256 instead. */
export async function subscriberKey(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The UTC hour at which the reader's local hour comes round, as of the given
 * instant. It shifts by an hour when daylight saving time starts or ends.
 */
export function utcHourFor(subscriber: Subscriber, instant: Date): number {
  // On the hour, so that zones with a half-hour offset round the right way.
  const onTheHour = new Date(Math.floor(instant.getTime() / 3_600_000) * 3_600_000);
  const offset = subscriber.hour - localHour(onTheHour, subscriber.timeZone);
  return (((onTheHour.getUTCHours() + offset) % 24) + 24) % 24;
}

/** The hour on the reader's clock at the given instant. */
export function localHour(instant: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
  return Number(hour);
}
