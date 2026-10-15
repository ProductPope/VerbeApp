# Daily quote notifications

Readers can switch on one notification a day, at an hour they choose, under **Preferences** in their profile. The design is
explained in [ADR 0006](adr/0006-daily-quote-push-without-payload.md).

## How it works

1. The app subscribes the browser to Web Push with the worker's VAPID public key and sends the
   worker `{ endpoint, hour, timeZone }`.
2. Every hour on the hour, the worker (`worker/src/index.ts`) sends an empty push to each device
   whose local hour has come. Devices are stored in 24 buckets by the UTC hour they are due, so
   each run reads only its own bucket and the two next to it (a daylight saving change moves a
   device by an hour; the run that notices it moves the device to its new bucket).
3. The service worker (`src/sw/sw.ts`) picks the quote of the day from the bundled catalogue,
   skipping the reader's hidden quotes and keeping to their categories, and shows a short
   invitation in the app language (`dailyNotification`) without the quote itself, so the quote is
   read in the app. Tapping the notification opens the app on that quote.

## Privacy

The worker stores only the push endpoint (a random URL issued by the browser's push service), the
hour and the time zone. It does not know which quotes a reader likes, hides or receives. Switching
the notification off deletes the record; records the push service reports as expired are deleted
automatically.

## Abuse protection and limits

- The worker accepts only endpoints of the browsers' push services (Google, Mozilla, Microsoft,
  Apple), so it cannot be used to send requests to any other address.
- Subscription changes are limited to 10 a minute per IP address (Cloudflare rate limiting).
- On the free Workers plan one run may make 50 outgoing requests, so about 50 devices can share the
  same notification hour; beyond that, move to the paid plan or spread sending with Cloudflare
  Queues. The hourly run logs how many pushes were sent, removed and failed.

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
5. Put that URL in `.github/workflows/deploy.yml` (or set the repository variable `PUSH_API_URL`,
   which overrides it) and re-run **Deploy to GitHub Pages**.
   The notification switch then appears under Preferences in the profile.

The worker allows requests only from the app's origin. The deploy workflow sets it to the
repository owner's GitHub Pages address (`https://<owner>.github.io`), so a fork works without
changes; for a custom domain, set the repository variable `APP_ORIGIN`, e.g.
`https://quotes.example.org`. The value in `worker/wrangler.jsonc` is only used locally.

## Testing

- `tests/worker/` covers the API, VAPID signing and the hourly schedule.
- `tests/app/` covers choosing the quote of the day, the push client and the setting.
- The end-to-end suite fires a real `push` event in the built service worker and checks the
  notification and the link it opens.
