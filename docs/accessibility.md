# Accessibility

VerbeApp targets **WCAG 2.2 level AA**, and AAA contrast (7:1) for quote text.

## How it is checked

| Check                                                              | Where                      | Runs     |
| ------------------------------------------------------------------ | -------------------------- | -------- |
| Colour contrast of every token pair, both themes                   | `tests/app/tokens.test.ts` | Every PR |
| Static JSX rules (`eslint-plugin-jsx-a11y`, strict)                | `eslint.config.js`         | Every PR |
| Roles, names, keyboard behaviour, auto-advance pausing             | `tests/app/App.test.tsx`   | Every PR |
| axe-core scan for WCAG 2.0–2.2 A/AA, light, dark, Polish, settings | `e2e/app.spec.ts`          | Every PR |
| 44×44 px minimum touch targets                                     | `e2e/app.spec.ts`          | Every PR |
| Keyboard path: skip link, feed navigation                          | `e2e/app.spec.ts`          | Every PR |

Automated tools catch only part of the problems, so changes to interaction also need a manual pass
with TalkBack on Android and a keyboard on desktop.

## Behaviour

- **Feed**: ARIA `feed` of `article`s laid out side by side; swipe left and right like flipping cards. Page Down and Page Up move between quotes (also arrows and
  j/k when an article has focus). Each article is named by its quote and described by its author.
- **Auto-advance**: off by default; a toggle button with `aria-pressed`; pauses on mouse hover,
  keyboard focus, and hidden page; restarts on touch; reading time grows with the length of the
  quote and its translation. A thin progress bar shows the time left; it is decorative
  (`aria-hidden`), since the button already conveys the state, and it disappears while paused.
- **Settings** (category filters) live in one native modal `<dialog>`: it traps focus, closes on
  Escape and returns focus to the Settings button.
- **Profile** opens a native modal `<dialog>` that works like Settings: an X button or Escape
  closes it and focus returns to the Profile button. It has three labelled regions: Preferences,
  Favourites and Hidden quotes. Preferences is a native `<details>` disclosure, collapsed by default; inside it the translation toggle is a checkbox with
  `role="switch"`, drawn as a sliding switch (44 px tall touch area; native checkbox in forced-colors mode), and the app language is a native `<select>`.
- **About** is the profile's last region, a `<details>` disclosure collapsed by default, so it
  stays out of the way; its GitHub link opens in a new tab with `rel="noopener noreferrer"`.
- **Daily notification** (in Preferences): a switch with its hint and any error in its accessible
  description; the error is also announced through a status region. The hour picker appears only
  when the switch is on.
- **Language**: the page `lang` follows the chosen language. Quotes are always `lang="en"`, and the
  translation under them carries `lang="pl"`, so screen readers pronounce each correctly. The
  translation is part of the article's description.
- **Motion**: transitions and smooth scrolling are disabled under `prefers-reduced-motion`.
- **Hiding a quote** is announced in a status region with an Undo button. The offer leaves after
  8 seconds, but not while the Undo button has focus; hidden quotes can always be restored from
  the profile, so the time limit takes nothing away (WCAG 2.2.1).
- **Orientation**: the app works in portrait and landscape and does not lock either (WCAG 1.3.4).
- **AI draft translations** say so in a short line under the translation, which is also part of
  the article's description.
- **Reading streak**: the flame in the header is a button whose visible icon and number are
  decorative; a visually hidden sentence gives its name with the full count. It opens a native modal
  `<dialog>` about the streak (closes with its X button or Escape and returns focus to the flame); the
  quote in it is `lang="en"` and its translation `lang="pl"`. When today joins the streak, a message appears in the same status region
  and leaves after a few seconds without needing any action.
- **Links to sources** say that they open in a new tab.
