import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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

export default defineConfig({
  base,
  plugins: [
    react(),
    contentSecurityPolicy(),
    VitePWA({
      registerType: 'autoUpdate',
      // A custom service worker so that it can show the daily quote notification.
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      includeAssets: ['icon.svg'],
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
