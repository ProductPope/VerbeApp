import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from '../../worker/src/base64url.js';
import { generateVapidKeys, vapidAuthorization } from '../../worker/src/vapid.js';

function decodeJson(part: string): unknown {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(part)));
}

describe('base64url', () => {
  it('round-trips bytes without padding or URL-unsafe characters', () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, i) => (i * 37) % 256);
    const text = toBase64Url(bytes);
    expect(text).not.toMatch(/[+/=]/);
    expect(fromBase64Url(text)).toEqual(bytes);
  });
});

describe('vapidAuthorization', () => {
  it('signs a JWT for the push service origin that verifies with the public key', async () => {
    const keys = { ...(await generateVapidKeys()), subject: 'https://example.org/app' };
    expect(fromBase64Url(keys.publicKey)).toHaveLength(65);
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys, 1_000);

    const match = /^vapid t=([^,]+), k=(.+)$/.exec(header);
    expect(match?.[2]).toBe(keys.publicKey);
    const [head, claims, signature] = match![1]!.split('.');
    expect(decodeJson(head!)).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(decodeJson(claims!)).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: 1_000 + 12 * 60 * 60,
      sub: 'https://example.org/app',
    });

    const publicKey = await crypto.subtle.importKey(
      'raw',
      fromBase64Url(keys.publicKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      fromBase64Url(signature!),
      new TextEncoder().encode(`${head!}.${claims!}`),
    );
    expect(valid).toBe(true);
  });

  it('rejects a malformed public key', async () => {
    const keys = await generateVapidKeys();
    await expect(
      vapidAuthorization(
        'https://push.example/1',
        { ...keys, publicKey: toBase64Url(new Uint8Array(10)), subject: 'mailto:a@b.c' },
        0,
      ),
    ).rejects.toThrow('Invalid VAPID public key');
  });
});
