# 5. A reading streak counted on the device

Date: 2026-10-13 · Status: Accepted

## Context

Readers asked for a gentle habit cue: how many days in a row they have opened the app to read. There
are no accounts and no backend (see [0004](0004-react-pwa-with-local-preferences.md)), and simply
opening the app by accident should not count as reading.

## Decision

- **A day counts after 10 seconds of visible time** (30 seconds at first; shortened on
  2026-10-15 at the owner's request so a quick look on the phone is enough). Time adds up across visits on the same
  calendar day; time while the page is hidden (another app, locked screen) or while the device
  sleeps and timers stall is not counted.
- **Days follow the reader's local calendar.** A streak survives until a whole day is missed, so
  it still shows in the morning before today has counted.
- **Stored on the device only**, under its own `localStorage` key (`verbeapp:streak:v1`), separate
  from preferences so either can change format on its own. Malformed data resets to an empty
  streak rather than breaking the app.
- **The timer lives outside React** (`src/app/streak/tracker.ts`) and writes to a small store;
  only the streak badge re-renders when the number changes, so ticking never restarts
  auto-advance or other timers in the feed.
- **Minimal UI**: a flame and a number next to the title, read out in full by screen readers
  ("Reading streak: 3 days in a row"), and one short message in the existing status region when
  today joins the streak. It disappears on its own; it is a status message, not an alert, and has
  no controls.

## Consequences

- The streak is per device and per browser; clearing site data resets it.
- Travelling across time zones can shift a day boundary; that is accepted for simplicity.
