/**
 * Prints a new VAPID key pair as JSON. Used once by the worker deploy
 * workflow; the private key goes straight into a Cloudflare secret.
 */
import { generateVapidKeys } from '../worker/src/vapid.js';

process.stdout.write(`${JSON.stringify(await generateVapidKeys())}\n`);
