/**
 * Renders public/icon.svg to the PNG sizes the web app manifest needs.
 * Usage: npm run icons  (needs a Playwright Chromium; set PW_CHROMIUM_PATH to use another)
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { ROOT } from './lib/dataset.js';

const svg = await readFile(join(ROOT, 'public', 'icon.svg'), 'utf8');
const executablePath = process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();

// Maskable icons keep their content inside the central 80% safe zone.
const outputs = [
  { file: 'icon-192.png', size: 192, padding: 0, background: 'transparent' },
  { file: 'icon-512.png', size: 512, padding: 0, background: 'transparent' },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.1, background: '#1b2430' },
];

for (const { file, size, padding, background } of outputs) {
  await page.setViewportSize({ width: size, height: size });
  const inset = Math.round(size * padding);
  await page.setContent(
    `<body style="margin:0;background:${background}"><div style="padding:${String(inset)}px">${svg.replace('<svg ', `<svg width="${String(size - 2 * inset)}" height="${String(size - 2 * inset)}" `)}</div></body>`,
  );
  await page.screenshot({
    path: join(ROOT, 'public', file),
    omitBackground: background === 'transparent',
  });
  console.log(`✓ public/${file}`);
}

await browser.close();
