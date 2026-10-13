# Accessibility

VerbeApp targets **WCAG 2.2 level AA**, and AAA contrast (7:1) for quote text.

## How it is checked

| Check                                                       | Where                      | Runs     |
| ----------------------------------------------------------- | -------------------------- | -------- |
| Colour contrast of every token pair, both themes            | `tests/app/tokens.test.ts` | Every PR |
| Static JSX rules (`eslint-plugin-jsx-a11y`, strict)         | `eslint.config.js`         | Every PR |
| Roles, names, keyboard behaviour, auto-advance pausing      | `tests/app/App.test.tsx`   | Every PR |
| axe-core scan for WCAG 2.0–2.2 A/AA, light, dark and Polish | `e2e/app.spec.ts`          | Every PR |
| 44×44 px minimum touch targets                              | `e2e/app.spec.ts`          | Every PR |
| Keyboard path: skip link, feed navigation                   | `e2e/app.spec.ts`          | Every PR |

Automated tools catch only part of the problems, so changes to interaction also need a manual pass
with TalkBack on Android and a keyboard on desktop.

## Behaviour

- **Feed**: ARIA `feed` of `article`s. Page Down and Page Up move between quotes (also arrows and
  j/k when an article has focus). Each article is named by its quote and described by its author.
- **Auto-advance**: off by default; a toggle button with `aria-pressed`; pauses on mouse hover,
  keyboard focus, and hidden page; restarts on touch; reading time grows with quote length.
- **Language**: the page `lang` follows the chosen language, and each quote carries its own `lang`,
  so screen readers pronounce English quotes correctly in the Polish interface.
- **Motion**: transitions and smooth scrolling are disabled under `prefers-reduced-motion`.
- **Hiding a quote** is announced in a status region with an Undo button.
- **Links to sources** say that they open in a new tab.
