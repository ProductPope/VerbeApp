import { fromBase64Url, toBase64Url } from './base64url.js';

/**
 * VAPID (RFC 8292) identifies this server to push services. The key pair is
 * an ECDSA P-256 pair: the public key is the uncompressed point (65 bytes)
 * and the private key is the scalar d (32 bytes), both base64url encoded.
 */
export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  /** A mailto: or https: URL push services can use to contact the operator. */
  subject: string;
}

const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60;

export async function generateVapidKeys(): Promise<Omit<VapidKeys, 'subject'>> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  if (jwk.d === undefined) throw new Error('Private key export did not include d');
  return { publicKey: toBase64Url(publicKey), privateKey: jwk.d };
}

function importPrivateKey(keys: VapidKeys): Promise<CryptoKey> {
  const point = fromBase64Url(keys.publicKey);
  if (point.length !== 65 || point[0] !== 4) throw new Error('Invalid VAPID public key');
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: keys.privateKey,
      x: toBase64Url(point.slice(1, 33)),
      y: toBase64Url(point.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

function encodeJson(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

/** Builds the Authorization header value for one push request. */
export async function vapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  nowSeconds: number,
): Promise<string> {
  const unsigned = `${encodeJson({ typ: 'JWT', alg: 'ES256' })}.${encodeJson({
    aud: new URL(endpoint).origin,
    exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    sub: keys.subject,
  })}`;
  // WebCrypto returns the raw r || s signature that JWT's ES256 expects.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    await importPrivateKey(keys),
    new TextEncoder().encode(unsigned),
  );
  return `vapid t=${unsigned}.${toBase64Url(new Uint8Array(signature))}, k=${keys.publicKey}`;
}
