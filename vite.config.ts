import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { CATALOG_FILE, catalogJson } from './scripts/lib/catalog-file.js';

// GitHub Pages serves the app from /<repository>/; local dev serves it from /.
const base = process.env.BASE_PATH ?? '/';

/**
 * Content Security Policy for the built app. GitHub Pages cannot send headers,
 * so it goes in a meta tag. Only the notification worker may be contacted
 * besides the app itself. The dev server injects inline scripts, so the
 * policy is added to builds only.
 */
function contentSecurityPolicy(): Plugin {
  const pushApi = process.env.VITE_PUSH_API_URL
    ? new URL(process.env.VITE_PUSH_API_URL).origin
    : '';
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self'${pushApi ? ` ${pushApi}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  };
}

/**
 * Builds the quote catalogue from data/ into its own file, so the quotes are
 * not part of the JavaScript bundle. The dev server builds it per request.
 */
function quoteCatalog(): Plugin {
  return {
    name: 'quote-catalog',
    configureServer(server) {
      server.middlewares.use(`${base}${CATALOG_FILE}`, (_request, response, next) => {
        catalogJson().then(
          (json) => {
            response.setHeader('Content-Type', 'application/json');
            response.end(json);
          },
          (error: unknown) => {
            next(error);
          },
        );
      });
    },
    // Start downloading the catalogue alongside the JavaScript, not after it.
    transformIndexHtml: () => [
      {
        tag: 'link',
        attrs: { rel: 'preload', href: `${base}${CATALOG_FILE}`, as: 'fetch', crossorigin: '' },
        injectTo: 'head',
      },
    ],
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: CATALOG_FILE, source: await catalogJson() });
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    contentSecurityPolicy(),
    quoteCatalog(),
    VitePWA({
      registerType: 'autoUpdate',
      // A custom service worker so that it can show the daily quote notification.
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      includeAssets: ['icon.svg'],
      // The quote catalogue is JSON; precache it with the app for offline use.
      injectManifest: { globPatterns: ['**/*.{js,css,html,json}'] },
      manifest: {
        name: 'Verbe',
        short_name: 'Verbe',
        description:
          'Wise quotes on philosophy, self-development, resilience, relationships, mindfulness and more, from verified sources.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f7f4ee',
        theme_color: '#1b2430',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
