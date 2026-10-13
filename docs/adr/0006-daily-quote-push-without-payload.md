# 6. Daily quote by an empty Web Push from a Cloudflare Worker

Date: 2026-10-13 · Status: Accepted

## Context

Readers want one quote a day as a notification at a time they choose, on Android, from an app
hosted as static files on GitHub Pages. Browsers have no reliable way to schedule a local
notification for a later time, so something outside the phone has to wake it up. The project has
no backend and should keep what it learns about readers to a minimum.

## Decision

- **Web Push with VAPID**, sent by a small **Cloudflare Worker** (`worker/`) on the free plan. A
  cron trigger runs every hour on the hour and pushes to every device whose chosen local hour has
  come, using the device's IANA time zone so daylight saving time is handled.
- **The push is empty.** The service worker (`src/sw/sw.ts`) already holds the whole catalogue,
  so it picks the quote of the day itself (`quoteOfTheDay`: the same quote all day, respecting the
  reader's hidden quotes and categories) and shows it. This avoids payload encryption and means the
  server never learns anything about the reader's preferences.
- **The server stores only** the browser's push endpoint, the hour and the time zone, as metadata
  in Workers KV keyed by the SHA-256 of the endpoint. Endpoints the push service reports as gone
  (404 or 410) are deleted.
- **Preferences reach the service worker through Cache Storage**, because it cannot read
  `localStorage`. They never leave the device.
- **Deployment is a GitHub Actions workflow** that creates the KV namespace if needed, deploys the
  worker and generates the VAPID key pair once, straight into Cloudflare secrets. The app gets the
  worker's address at build time (`VITE_PUSH_API_URL`) and hides the setting without it.

## Consequences

- One external service (Cloudflare) and two repository secrets are needed; until they are set the
  app works as before, without the notification setting.
- Hourly granularity: readers choose a whole hour.
- The cron run lists every subscription each hour. That is fine for thousands of readers; beyond
  that, subscriptions should be grouped by UTC hour.
- If the VAPID keys are ever replaced, existing subscriptions stop working and readers have to
  switch the notification off and on again.
