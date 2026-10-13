# Daily quote notifications

Readers can switch on one notification a day, at an hour they choose, in **Settings**. The design is
explained in [ADR 0005](adr/0005-daily-quote-push-without-payload.md).

## How it works

1. The app subscribes the browser to Web Push with the worker's VAPID public key and sends the
   worker `{ endpoint, hour, timeZone }`.
2. Every hour on the hour, the worker (`worker/src/index.ts`) sends an empty push to each device
   whose local hour has come.
3. The service worker (`src/sw/sw.ts`) picks the quote of the day from the bundled catalogue,
   skipping the reader's hidden quotes and keeping to their categories, and shows it. Tapping the
   notification opens the app on that quote.

## Privacy

The worker stores only the push endpoint (a random URL issued by the browser's push service), the
hour and the time zone. It does not know which quotes a reader likes, hides or receives. Switching
the notification off deletes the record; records the push service reports as expired are deleted
automatically.

## Setting it up

This needs a free [Cloudflare](https://dash.cloudflare.com/sign-up) account. Done once by the
repository owner:

1. In the Cloudflare dashboard, open **Workers & Pages** once so that Cloudflare assigns the account
   a `workers.dev` subdomain.
2. Create an API token (**My Profile → API Tokens → Create Token → Edit Cloudflare Workers**
   template) and copy the **Account ID** from the Workers & Pages overview.
3. In GitHub, add them as repository secrets (**Settings → Secrets and variables → Actions**):
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Run the **Deploy notification worker** workflow. It creates the KV namespace, deploys the worker,
   creates the VAPID keys once and prints the worker URL in its summary.
5. Add that URL as the repository variable `PUSH_API_URL` and re-run **Deploy to GitHub Pages**.
   The notification switch then appears in Settings.

The worker allows requests only from `ALLOWED_ORIGIN` in `worker/wrangler.jsonc`; change it if the
app moves to another domain.

## Testing

- `tests/worker/` covers the API, VAPID signing and the hourly schedule.
- `tests/app/` covers choosing the quote of the day, the push client and the setting.
- The end-to-end suite fires a real `push` event in the built service worker and checks the
  notification and the link it opens.
