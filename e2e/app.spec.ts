import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

function feed(page: Page) {
  return page.getByRole('feed');
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('accessibility', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has no WCAG 2.2 AA violations in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('./');
      await expect(feed(page).getByRole('article').first()).toBeVisible();
      await expectNoAxeViolations(page);

      await page.getByRole('button', { name: 'Saved quotes' }).click();
      await expect(page.getByRole('heading', { name: 'Favourites' })).toBeVisible();
      await expectNoAxeViolations(page);

      await openSettings(page);
      await expectNoAxeViolations(page);
    });
  }

  test('has no violations in Polish', async ({ page }) => {
    await page.goto('./');
    const settings = await openSettings(page);
    await settings.getByRole('combobox', { name: 'App language' }).selectOption('pl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ustawienia' })).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test('lets keyboard users skip to the quotes and move between them', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to quotes' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();

    const articles = feed(page).getByRole('article');
    await articles.first().focus();
    await page.keyboard.press('PageDown');
    await expect(articles.nth(1)).toBeFocused();
    await expect(articles.nth(1)).toBeInViewport({ ratio: 0.9 });
  });

  test('keeps every control at least 44 by 44 pixels', async ({ page }) => {
    async function expectLargeTargets() {
      const controls = page.locator(
        'button:visible, select:visible, input:visible, .card-link:visible',
      );
      const sizes = await controls.evaluateAll((elements) =>
        elements.map((element) => {
          const { width, height } = element.getBoundingClientRect();
          return { name: element.outerHTML.slice(0, 80), width, height };
        }),
      );
      expect(sizes.length).toBeGreaterThan(3);
      for (const size of sizes) {
        expect(size.height, size.name).toBeGreaterThanOrEqual(44);
        expect(size.width, size.name).toBeGreaterThanOrEqual(44);
      }
    }
    await page.goto('./');
    await expectLargeTargets();
    await openSettings(page);
    await expectLargeTargets();
  });
});

test.describe('feed', () => {
  test('snaps to the next quote on swipe and keeps adding quotes', async ({ page }) => {
    await page.goto('./');
    const articles = feed(page).getByRole('article');
    const initial = await articles.count();
    for (let i = 0; i < initial; i++) {
      await feed(page).evaluate((element) => {
        element.scrollBy({ top: element.clientHeight, behavior: 'instant' });
      });
    }
    await expect.poll(() => articles.count()).toBeGreaterThan(initial);
  });

  test('remembers favourites and hidden quotes after a reload', async ({ page }) => {
    await page.goto('./');
    const first = feed(page).getByRole('article').first();
    const favoriteText = await first.locator('blockquote').innerText();
    await first.getByRole('button', { name: 'Favourite' }).click();

    const second = feed(page).getByRole('article').nth(1);
    const hiddenText = await second.locator('blockquote').innerText();
    await second.getByRole('button', { name: 'Don’t show again' }).click();
    await expect(page.getByRole('status')).toContainText('Quote hidden.');

    await page.reload();
    await page.getByRole('button', { name: 'Saved quotes' }).click();
    await expect(page.getByRole('region', { name: 'Favourites' })).toContainText(
      favoriteText.replace(/[“”]/g, ''),
    );
    await expect(page.getByRole('region', { name: 'Hidden quotes' })).toContainText(
      hiddenText.replace(/[“”]/g, ''),
    );
  });

  test('shows the Polish translation under the quote unless switched off', async ({ page }) => {
    await page.goto('./');
    const first = feed(page).getByRole('article').first();
    const translation = first.locator('.card-translation');
    await expect(translation).toHaveAttribute('lang', 'pl');
    await expect(translation).toBeVisible();
    const quoteBox = await first.locator('blockquote').boundingBox();
    const translationBox = await translation.boundingBox();
    expect(translationBox!.y).toBeGreaterThan(quoteBox!.y + quoteBox!.height);

    const settings = await openSettings(page);
    await settings.getByRole('switch', { name: 'Polish translation' }).uncheck();
    await page.keyboard.press('Escape');
    await expect(first.locator('.card-translation')).toHaveCount(0);
  });

  test('shows a progress bar while auto-advancing', async ({ page }) => {
    await page.goto('./');
    const progress = page.getByTestId('autoplay-progress');
    await expect(progress).toHaveCount(0);
    await page.getByRole('button', { name: 'Auto-advance' }).click();
    await expect(progress).toBeAttached();
    await expect
      .poll(() => progress.locator('div').evaluate((bar) => bar.getBoundingClientRect().width))
      .toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Auto-advance' }).click();
    await expect(progress).toHaveCount(0);
  });

  test('filters by category', async ({ page }) => {
    await page.goto('./');
    const categories = (await openSettings(page)).getByRole('group', { name: 'Categories' });
    await categories.getByRole('button', { name: 'Assertiveness' }).click();
    await expect(categories.getByRole('button', { name: 'Assertiveness' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(feed(page).getByRole('article').first()).toBeVisible();
  });
});

test.describe('installable app', () => {
  test('serves a manifest with Android icons', async ({ page, request }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).not.toBeNull();
    const manifest = (await (await request.get(href!)).json()) as {
      name: string;
      display: string;
      icons: { sizes: string; purpose?: string }[];
    };
    expect(manifest).toMatchObject({ name: 'VerbeApp', display: 'standalone' });
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  test('works offline after the first visit', async ({ page, context }) => {
    await page.goto('./');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(feed(page).getByRole('article').first()).toBeVisible();
    await context.setOffline(false);
  });
});
