# 4. A React PWA with on-device preferences

Date: 2026-10-13 · Status: Accepted

## Context

The app is used mainly on Android phones, should install from the browser and work offline, and is
reviewed by people sceptical of AI-assisted development, so its code and accessibility must be easy
to audit.

## Decision

- **React 19 + TypeScript + Vite**, chosen for familiarity to reviewers and mature accessibility
  testing tools. The whole dataset is bundled at build time; there is no backend.
- **PWA** via `vite-plugin-pwa`: web app manifest, Android icons (including maskable) and a service
  worker that precaches the app so it works offline.
- **Preferences stay on the device** (`localStorage`): language, favourites, hidden quotes,
  categories and auto-advance. Nothing is sent anywhere. Storage failures (private mode, full disk)
  never break the app.
- **The feed follows the ARIA feed pattern**: each quote is a focusable `article`, Page Down and
  Page Up move between them, and the list grows endlessly by appending shuffled rounds.
- **Auto-advance is off by default** and toggled by a visible button (WCAG 2.2.2 Pause, Stop,
  Hide). It waits for a reading time based on quote length (8 to 30 seconds), pauses while a mouse
  is over the feed, while keyboard focus is in it and while the page is hidden, and restarts its
  timer on every touch. Under reduced motion it scrolls without animation.
- **Design tokens** (`src/app/styles/tokens.css`) are the only source of colours, spacing, type and
  motion; tests check every colour pair against WCAG contrast thresholds.
- Hosted on **GitHub Pages**, deployed from `main` by GitHub Actions.

## Consequences

- No accounts and no sync between devices; that can be added later without changing the data.
- Bundling all quotes keeps the app instant and offline; if the dataset grows into the thousands,
  the build can split it per category.
