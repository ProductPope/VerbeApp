import { describe, expect, it } from 'vitest';
import {
  isPushServiceHost,
  localHour,
  parseEndpoint,
  parseSubscriber,
  subscriberKey,
  utcHourFor,
} from '../../worker/src/subscriptions.js';

const valid = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  hour: 8,
  timeZone: 'Europe/Warsaw',
};

describe('parseSubscriber', () => {
  it('accepts a well-formed subscriber and drops extra fields', () => {
    expect(parseSubscriber({ ...valid, extra: true })).toEqual(valid);
  });

  it.each([
    null,
    'text',
    { ...valid, endpoint: 'http://push.example/abc' },
    { ...valid, endpoint: 'not a url' },
    { ...valid, endpoint: `https://fcm.googleapis.com/fcm/send/${'a'.repeat(800)}` },
    { ...valid, hour: 24 },
    { ...valid, hour: -1 },
    { ...valid, hour: 7.5 },
    { ...valid, hour: '8' },
    { ...valid, timeZone: 'Mars/Olympus' },
    { ...valid, timeZone: 42 },
  ])('rejects %j', (body) => {
    expect(parseSubscriber(body)).toBeUndefined();
  });
});

describe('parseEndpoint', () => {
  it('reads only an https endpoint', () => {
    expect(parseEndpoint({ endpoint: valid.endpoint })).toBe(valid.endpoint);
    expect(parseEndpoint({ endpoint: 'ftp://x' })).toBeUndefined();
    expect(parseEndpoint(undefined)).toBeUndefined();
  });
});

describe('subscriberKey', () => {
  it('is a stable SHA-256 hex digest', async () => {
    const key = await subscriberKey(valid.endpoint);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await subscriberKey(valid.endpoint)).toBe(key);
    expect(await subscriberKey(`${valid.endpoint}x`)).not.toBe(key);
  });
});

describe('localHour', () => {
  it('follows the time zone, including daylight saving time', () => {
    expect(localHour(new Date('2026-01-15T07:00:00Z'), 'Europe/Warsaw')).toBe(8);
    expect(localHour(new Date('2026-07-15T06:00:00Z'), 'Europe/Warsaw')).toBe(8);
    expect(localHour(new Date('2026-07-15T23:00:00Z'), 'UTC')).toBe(23);
    expect(localHour(new Date('2026-07-15T00:30:00Z'), 'UTC')).toBe(0);
  });
});

describe('isPushServiceHost', () => {
  it.each([
    'fcm.googleapis.com',
    'updates.push.services.mozilla.com',
    'wns2-db5p.notify.windows.com',
    'web.push.apple.com',
    'api.push.apple.com',
  ])('accepts %s', (host) => {
    expect(isPushServiceHost(host)).toBe(true);
  });

  it.each(['example.com', 'fcm.googleapis.com.evil.example', 'evilpush.apple.com', 'localhost'])(
    'refuses %s',
    (host) => {
      expect(isPushServiceHost(host)).toBe(false);
    },
  );
});

describe('utcHourFor', () => {
  it('gives the UTC hour at which the local hour comes, whatever the minute', () => {
    const warsaw = { ...valid, hour: 8 };
    expect(utcHourFor(warsaw, new Date('2026-01-15T10:45:00Z'))).toBe(7);
    expect(utcHourFor(warsaw, new Date('2026-07-15T10:45:00Z'))).toBe(6);
    expect(utcHourFor({ ...valid, hour: 0 }, new Date('2026-01-15T10:00:00Z'))).toBe(23);
  });

  it('rounds half-hour time zones to the hour that starts in the chosen hour', () => {
    // 12:00–12:59 in Kolkata (UTC+5:30) is reached at 07:00 UTC, which is 12:30 there.
    const kolkata = { ...valid, hour: 12, timeZone: 'Asia/Kolkata' };
    expect(utcHourFor(kolkata, new Date('2026-01-15T07:45:00Z'))).toBe(7);
    expect(localHour(new Date('2026-01-15T07:00:00Z'), 'Asia/Kolkata')).toBe(12);
  });
});
