/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { catalog } from '../app/catalog/load.js';
import { PUSH_API_URL } from '../app/notifications/config.js';
import { dailyNotification, dayKey, quoteOfTheDay } from '../app/notifications/daily.js';
import { readSharedPrefs } from '../app/notifications/shared-prefs.js';
import { TRANSLATION_LANGUAGE } from '../app/i18n/strings.js';

declare const self: ServiceWorkerGlobalScope;

// Offline support: precache the build and serve the app shell for navigations.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
void self.skipWaiting();
clientsClaim();

const NOTIFICATION_TAG = 'daily-quote';

async function showQuoteOfTheDay(): Promise<void> {
  const prefs = await readSharedPrefs();
  const card = quoteOfTheDay(catalog.cards, prefs, dayKey(new Date()));
  if (!card) return;
  const content = dailyNotification(
    card,
    prefs.language,
    prefs.translation ? TRANSLATION_LANGUAGE : undefined,
  );
  await self.registration.showNotification(content.title, {
    body: content.body,
    tag: NOTIFICATION_TAG,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    lang: 'en',
    data: { quoteId: content.quoteId },
  });
}

// The push carries no data: every push means "show today's quote".
self.addEventListener('push', (event) => {
  event.waitUntil(showQuoteOfTheDay());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { quoteId } = event.notification.data as { quoteId: string };
  const url = new URL(self.registration.scope);
  url.searchParams.set('quote', quoteId);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (existing) {
        try {
          // Only a window this worker controls can be navigated; any other throws.
          await existing.navigate(url.href);
          await existing.focus();
          return;
        } catch {
          // Fall through and open a new window instead.
        }
      }
      await self.clients.openWindow(url.href);
    })(),
  );
});

// Browsers occasionally rotate push subscriptions; tell the server about the new one.
self.addEventListener('pushsubscriptionchange', (event) => {
  const change = event as Event & {
    oldSubscription?: PushSubscription | null;
    newSubscription?: PushSubscription | null;
    waitUntil(promise: Promise<unknown>): void;
  };
  if (PUSH_API_URL === '') return;
  change.waitUntil(
    (async () => {
      const prefs = await readSharedPrefs();
      const subscription =
        change.newSubscription ??
        (change.oldSubscription
          ? await self.registration.pushManager.subscribe(change.oldSubscription.options)
          : null);
      if (!subscription) return;
      await fetch(`${PUSH_API_URL.replace(/\/+$/, '')}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          hour: prefs.hour,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
    })(),
  );
});
