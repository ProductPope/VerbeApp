import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.js';
import { catalog } from './catalog/load.js';
import { createPreferencesStore } from './prefs/store.js';
import './styles/tokens.css';
import './styles/app.css';

function localStorageOrUndefined(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App
        catalog={catalog}
        store={createPreferencesStore(localStorageOrUndefined(), navigator.language)}
        random={Math.random}
        reducedMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches}
      />
    </StrictMode>,
  );
}

registerSW({ immediate: true });
