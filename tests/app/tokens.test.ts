import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(import.meta.dirname, '../../src/app/styles/tokens.css'), 'utf8');

function colours(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--(color-[a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  );
}

const light = colours(css.split('@media')[0]!);
const dark = {
  ...light,
  ...colours(/prefers-color-scheme: dark\)\s*\{([\s\S]*?)\n\}/.exec(css)![1]!),
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

// [foreground, background, minimum ratio]: 7 for body text (AAA), 4.5 for
// other text (AA), 3 for non-text UI such as borders and focus rings.
const pairs: [string, string, number][] = [
  ['color-text', 'color-bg', 7],
  ['color-text', 'color-surface', 7],
  ['color-text-muted', 'color-bg', 4.5],
  ['color-text-muted', 'color-surface', 4.5],
  ['color-accent', 'color-bg', 4.5],
  ['color-accent', 'color-surface', 4.5],
  ['color-on-accent', 'color-accent', 4.5],
  ['color-favorite', 'color-surface', 4.5],
  ['color-border', 'color-surface', 3],
  ['color-border', 'color-bg', 3],
  ['color-focus', 'color-bg', 3],
  ['color-focus', 'color-surface', 3],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme colours', (_theme, palette) => {
  it.each(pairs)('%s on %s reaches %d:1', (fg, bg, min) => {
    expect(contrast(palette[fg]!, palette[bg]!)).toBeGreaterThanOrEqual(min);
  });
});

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
