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

test.describe('accessibility', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has no WCAG 2.2 AA violations in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('./');
      await expect(feed(page).getByRole('article').first()).toBeVisible();
      await expectNoAxeViolations(page);

      await page.getByRole('button', { name: 'Saved' }).click();
      await expect(page.getByRole('heading', { name: 'Favourites' })).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }

  test('has no violations in Polish', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('combobox', { name: 'Language' }).selectOption('pl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
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
    await page.goto('./');
    const controls = page.locator('button:visible, select:visible, .card-link:visible');
    const sizes = await controls.evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { name: element.textContent.trim(), width, height };
      }),
    );
    expect(sizes.length).toBeGreaterThan(5);
    for (const size of sizes) {
      expect(size.height, size.name).toBeGreaterThanOrEqual(44);
      expect(size.width, size.name).toBeGreaterThanOrEqual(44);
    }
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
    await page.getByRole('button', { name: 'Saved' }).click();
    await expect(page.getByRole('region', { name: 'Favourites' })).toContainText(
      favoriteText.replace(/[“”]/g, ''),
    );
    await expect(page.getByRole('region', { name: 'Hidden quotes' })).toContainText(
      hiddenText.replace(/[“”]/g, ''),
    );
  });

  test('filters by category', async ({ page }) => {
    await page.goto('./');
    const categories = page.getByRole('group', { name: 'Categories' });
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
