import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.js';
import { catalog } from './catalog/load.js';
import { PUSH_API_URL } from './notifications/config.js';
import { createPushService, isPushSupported } from './notifications/push.js';
import { createPreferencesStore } from './prefs/store.js';
import { createStreakStore } from './streak/streak.js';
import './styles/tokens.css';
import './styles/app.css';

function localStorageOrUndefined(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const push =
  PUSH_API_URL !== '' && isPushSupported()
    ? createPushService(PUSH_API_URL, {
        serviceWorker: navigator.serviceWorker,
        requestPermission: () => Notification.requestPermission(),
        fetch: (input, init) => fetch(input, init),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    : undefined;

// A notification opens the app on its quote; drop the parameter afterwards.
const url = new URL(window.location.href);
const initialCardId = url.searchParams.get('quote') ?? undefined;
if (initialCardId !== undefined) {
  url.searchParams.delete('quote');
  window.history.replaceState(null, '', url);
}

const root = document.getElementById('root');
if (root) {
  const storage = localStorageOrUndefined();
  createRoot(root).render(
    <StrictMode>
      <App
        catalog={catalog}
        store={createPreferencesStore(storage, navigator.language)}
        streakStore={createStreakStore(storage)}
        random={Math.random}
        reducedMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches}
        push={push}
        initialCardId={initialCardId}
      />
    </StrictMode>,
  );
}

registerSW({ immediate: true });
