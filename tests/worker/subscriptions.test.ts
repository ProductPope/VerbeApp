import { describe, expect, it } from 'vitest';
import {
  localHour,
  parseEndpoint,
  parseSubscriber,
  subscriberKey,
} from '../../worker/src/subscriptions.js';

const valid = { endpoint: 'https://push.example/abc', hour: 8, timeZone: 'Europe/Warsaw' };

describe('parseSubscriber', () => {
  it('accepts a well-formed subscriber and drops extra fields', () => {
    expect(parseSubscriber({ ...valid, extra: true })).toEqual(valid);
  });

  it.each([
    null,
    'text',
    { ...valid, endpoint: 'http://push.example/abc' },
    { ...valid, endpoint: 'not a url' },
    { ...valid, endpoint: `https://push.example/${'a'.repeat(800)}` },
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
