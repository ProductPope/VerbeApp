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

async function openProfile(page: Page) {
  await page.getByRole('button', { name: 'Your profile' }).click();
  const dialog = page.getByRole('dialog', { name: 'Your profile' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openYourQuotes(page: Page) {
  const profile = await openProfile(page);
  await profile.getByRole('button', { name: /^Your quotes/ }).click();
  const section = profile.getByRole('region', { name: 'Your quotes' });
  await expect(section.getByRole('heading', { name: 'Your quotes' })).toBeFocused();
  return section;
}

async function openPreferences(page: Page) {
  const profile = await openProfile(page);
  const preferences = profile.getByRole('region', { name: 'Preferences' });
  await expect(preferences.getByRole('combobox', { name: 'App language' })).toBeHidden();
  await preferences.getByText('Preferences').click();
  await expect(preferences).toBeVisible();
  return preferences;
}

test.describe('accessibility', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has no WCAG 2.2 AA violations in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('./');
      await expect(feed(page).getByRole('article').first()).toBeVisible();
      await expectNoAxeViolations(page);

      const profile = await openProfile(page);
      await expect(profile.getByRole('button', { name: /^Favourites/ })).toBeVisible();
      await profile.getByText('About Verbe').click();
      await expect(profile.getByRole('link', { name: 'Source code on GitHub' })).toBeVisible();
      await expectNoAxeViolations(page);
      await profile.getByRole('button', { name: /^Favourites/ }).click();
      await expect(profile.getByRole('heading', { name: 'Favourites' })).toBeFocused();
      await expectNoAxeViolations(page);
      await profile.getByRole('button', { name: 'Close' }).click();
      await expect(profile).toBeHidden();
      await expect(page.getByRole('button', { name: 'Your profile' })).toBeFocused();

      await openSettings(page);
      await expectNoAxeViolations(page);
    });
  }

  test('has no violations in Polish', async ({ page }) => {
    await page.goto('./');
    const preferences = await openPreferences(page);
    await preferences.getByRole('combobox', { name: 'App language' }).selectOption('pl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expectNoAxeViolations(page);
    await page.getByRole('button', { name: 'Zamknij' }).click();
    await page.getByRole('button', { name: 'Ustawienia' }).click();
    await expect(page.getByRole('dialog', { name: 'Ustawienia' })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ustawienia' })).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test('lets keyboard users skip to the quotes and move between them', async ({ page }) => {
    await page.goto('./');
    const skip = page.getByRole('link', { name: 'Skip to quotes' });
    // The app renders once the quote catalogue has loaded.
    await skip.waitFor({ state: 'attached' });
    await page.keyboard.press('Tab');
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
      // Layout can land a hair under a whole pixel (43.999996), which is still 44 px on screen.
      const minimum = 44 - 0.01;
      for (const size of sizes) {
        expect(size.height, size.name).toBeGreaterThanOrEqual(minimum);
        expect(size.width, size.name).toBeGreaterThanOrEqual(minimum);
      }
    }
    await page.goto('./');
    await expectLargeTargets();
    await openSettings(page);
    await expectLargeTargets();
    await page.keyboard.press('Escape');
    await openPreferences(page);
    await expectLargeTargets();
    await page.getByRole('button', { name: /^Your quotes/ }).click();
    await expectLargeTargets();
    await page.getByRole('button', { name: 'Add a quote' }).click();
    await expect(page.getByRole('dialog', { name: 'Add a quote' })).toBeVisible();
    await expectLargeTargets();
  });
});

test.describe('layout', () => {
  // 839 px is the Pixel 7 viewport as an installed app; 740 px leaves room for Chrome's toolbars.
  for (const height of [839, 740]) {
    test(`fits one ${String(height)} px high phone screen without page scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 412, height });
      await page.goto('./');
      await expect(feed(page).getByRole('article').first()).toBeVisible();

      const fits = () =>
        page.evaluate(() => {
          window.scrollTo(0, 100);
          return {
            overflow: document.documentElement.scrollHeight - window.innerHeight,
            scrollY: window.scrollY,
          };
        });
      expect(await fits()).toEqual({ overflow: 0, scrollY: 0 });

      await page.getByRole('button', { name: 'Your profile' }).click();
      await expect(page.getByRole('button', { name: /^Favourites/ })).toBeVisible();
      expect(await fits()).toEqual({ overflow: 0, scrollY: 0 });
    });
  }
});

test.describe('feed', () => {
  test('flips to the next quote on a sideways swipe and keeps adding quotes', async ({ page }) => {
    await page.goto('./');
    const articles = feed(page).getByRole('article');
    const initial = await articles.count();
    // Only the feed scrolls sideways; the page itself must not.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
      page.viewportSize()!.width,
    );
    const second = await articles.nth(1).boundingBox();
    expect(second!.x).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1);
    expect(second!.y).toBeLessThan(page.viewportSize()!.height);
    for (let i = 0; i < initial; i++) {
      await feed(page).evaluate((element) => {
        element.scrollBy({ left: element.clientWidth, behavior: 'instant' });
      });
    }
    await expect.poll(() => articles.count()).toBeGreaterThan(initial);
  });

  test('shows a swipe hint on first launch until the first swipe', async ({ page }) => {
    await page.goto('./');
    const hint = page.getByTestId('swipe-hint');
    await expect(hint).toHaveText(/Swipe left for the next quote/);
    // A touch screen gets the swipe wording, not the keyboard one.
    await expect(hint.getByText('Press → for the next quote')).toBeHidden();
    const nudge = await feed(page)
      .getByRole('article')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(nudge).toBe('swipe-hint-nudge');

    await feed(page).evaluate((element) => {
      element.scrollBy({ left: element.clientWidth, behavior: 'instant' });
    });
    await expect(hint).toBeHidden();
    await page.reload();
    await expect(feed(page).getByRole('article').first()).toBeVisible();
    await expect(hint).toBeHidden();
  });

  test('keeps the swipe hint still for reduced motion and closes it with a button', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    const hint = page.getByTestId('swipe-hint');
    await expect(hint).toBeVisible();
    const animations = await page.evaluate(() =>
      [...document.querySelectorAll('.swipe-hint-arrow, .feed > article')].map(
        (element) => getComputedStyle(element).animationName,
      ),
    );
    expect(new Set(animations)).toEqual(new Set(['none']));
    await hint.getByRole('button', { name: 'Got it' }).click();
    await expect(hint).toBeHidden();
    await expect(feed(page).getByRole('article').first()).toBeFocused();
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
    const profile = await openProfile(page);
    await profile.getByRole('button', { name: /^Favourites 1/ }).click();
    await expect(page.getByRole('region', { name: 'Favourites' })).toContainText(
      favoriteText.replace(/[“”]/g, ''),
    );
    await profile.getByRole('button', { name: 'Back to your profile' }).click();
    await expect(profile.getByRole('button', { name: /^Favourites/ })).toBeFocused();
    await profile.getByRole('button', { name: /^Hidden quotes 1/ }).click();
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

    const preferences = await openPreferences(page);
    await preferences.getByRole('switch', { name: 'Polish translation' }).uncheck();
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    await expect(feed(page).getByRole('article').first()).toBeVisible();
    await expect(feed(page).locator('.card-translation')).toHaveCount(0);
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

test.describe('your own quotes', () => {
  test('adds a quote that joins the feed and survives a reload', async ({ page }) => {
    await page.goto('./');
    const section = await openYourQuotes(page);
    await section.getByRole('button', { name: 'Add a quote' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a quote' });
    await expect(dialog).toBeVisible();
    await expectNoAxeViolations(page);

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.getByText('Enter the quote.')).toBeVisible();
    await expectNoAxeViolations(page);

    await dialog.getByRole('textbox', { name: 'Quote' }).fill('Write it down before it fades.');
    await dialog.getByRole('textbox', { name: 'Author (optional)' }).fill('A reader');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(section.getByText('Write it down before it fades.')).toBeVisible();
    await expect(section.getByRole('button', { name: 'Edit' })).toBeVisible();

    // The feed shows a few cards at a time; open it on the new quote, as a notification would.
    const id = await page.evaluate(
      () =>
        (
          JSON.parse(localStorage.getItem('verbeapp:personal-quotes:v1') ?? '[]') as {
            id: string;
          }[]
        )[0]?.id,
    );
    expect(id).toMatch(/^mine-/);
    await page.goto(`./?quote=${id!}`);
    const card = feed(page).getByRole('article').first();
    await expect(card).toContainText('Write it down before it fades.');
    await expect(card.getByText('Your quote')).toBeVisible();
  });

  test('imports quotes from a CSV file after a preview', async ({ page }) => {
    await page.goto('./');
    await openYourQuotes(page);
    await page.getByText('How to prepare a CSV file').click();
    await expect(page.getByRole('table')).toBeVisible();
    await expectNoAxeViolations(page);

    const csv = 'tekst;autor;kategorie\nZapisz to.;Ja;Filozofia\n;;\nBez kategorii.;;Gotowanie\n';
    await page.getByTestId('import-csv').setInputFiles({
      name: 'cytaty.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf8'),
    });
    const dialog = page.getByRole('dialog', { name: 'Import from CSV' });
    await expect(dialog).toContainText('1 quote ready to import.');
    await expect(dialog).toContainText('Row 4: unknown category “Gotowanie”.');
    await expectNoAxeViolations(page);
    await dialog.getByRole('button', { name: 'Import 1 quote' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('region', { name: 'Your quotes' })).toContainText('Zapisz to.');
  });

  test('closes the form with Escape and returns focus', async ({ page }) => {
    await page.goto('./');
    const section = await openYourQuotes(page);
    const add = section.getByRole('button', { name: 'Add a quote' });
    await add.click();
    await expect(page.getByRole('textbox', { name: 'Quote' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Add a quote' })).toBeHidden();
    await expect(add).toBeFocused();
  });
});

test.describe('reading streak', () => {
  test('counts today after 10 seconds in the app and remembers it', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 13, 9, 0) });
    await page.goto('./');
    const badge = page.locator('.streak');
    await expect(badge).toContainText('Reading streak: 0 days in a row');
    await page.clock.runFor(8_000);
    await expect(badge).toContainText('Reading streak: 0 days in a row');
    await page.clock.runFor(3_000);
    await expect(badge).toContainText('Reading streak: 1 day in a row');
    await expect(page.getByRole('status')).toContainText('Day one of your reading streak.');
    await expectNoAxeViolations(page);

    await page.reload();
    await expect(page.locator('.streak')).toContainText('Reading streak: 1 day in a row');
  });

  test('keeps the streak when an older copy of the app is still open', async ({ context }) => {
    // Pages in one context share the fake clock, so the older copy sits in the
    // background (hidden) while the newer one counts today.
    const setHidden = (page: Page, hidden: boolean) =>
      page.evaluate((value) => {
        Object.defineProperty(document, 'hidden', { configurable: true, value });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await context.clock.install({ time: new Date(2026, 9, 13, 9, 0) });
    const older = await context.newPage();
    await older.goto('./');
    await older.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await older.reload();
    await context.clock.runFor(5_000);
    await setHidden(older, true);

    const newer = await context.newPage();
    await newer.goto('./');
    await context.clock.runFor(11_000);
    await expect(newer.locator('.streak')).toContainText('Reading streak: 1 day in a row');

    await setHidden(older, false);
    await context.clock.runFor(5_000);
    await expect(older.locator('.streak')).toContainText('Reading streak: 1 day in a row');
    await newer.reload();
    await expect(newer.locator('.streak')).toContainText('Reading streak: 1 day in a row');
  });

  test('explains the streak in a dialog opened from the flame', async ({ page }) => {
    await page.goto('./');
    const flame = page.getByRole('button', { name: /^Reading streak/ });
    await flame.click();
    const dialog = page.getByRole('dialog', { name: 'Your reading streak' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Habits shape who we become.');
    await expect(dialog.locator('blockquote')).toContainText('Every habit and faculty');
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(flame).toBeFocused();
  });
});

test.describe('security', () => {
  test('runs under a Content Security Policy without violating it', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) violations.push(message.text());
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        console.error(`Content Security Policy: ${event.violatedDirective}`);
      });
    });
    await page.goto('./');
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(policy).toContain("script-src 'self'");
    await expect(feed(page).getByRole('article').first()).toBeVisible();
    await page.getByRole('button', { name: 'Auto-advance' }).click();
    await expect(page.getByTestId('autoplay-progress')).toBeVisible();
    expect(violations).toEqual([]);
  });

  test('still fits the screen in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 915, height: 412 });
    await page.goto('./');
    await expect(feed(page).getByRole('article').first()).toBeVisible();
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(scrolls).toBe(false);
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
      orientation?: string;
      icons: { sizes: string; purpose?: string }[];
    };
    expect(manifest).toMatchObject({ name: 'Verbe', display: 'standalone' });
    // WCAG 1.3.4: the app must not lock itself to portrait or landscape.
    expect(manifest.orientation).toBeUndefined();
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  test("invites the reader in when a push arrives and opens today's quote on tap", async ({
    page,
    context,
  }) => {
    await page.goto('./');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const notification = await worker.evaluate(async () => {
      // Runs inside the service worker, whose types the DOM library lacks.
      const scope = self as unknown as {
        registration: ServiceWorkerRegistration;
        dispatchEvent(event: Event): boolean;
        PushEvent: new (type: string) => Event;
      };
      // Headless browsers may have no notification centre, so record the call instead.
      const shown: { title: string; options?: NotificationOptions }[] = [];
      scope.registration.showNotification = (title, options) => {
        shown.push({ title, ...(options === undefined ? {} : { options }) });
        return Promise.resolve();
      };
      scope.dispatchEvent(new scope.PushEvent('push'));
      for (let attempt = 0; attempt < 50 && shown.length === 0; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const [first] = shown;
      if (first) {
        return {
          title: first.title,
          body: first.options?.body ?? '',
          tag: first.options?.tag,
          data: first.options?.data as { quoteId: string },
        };
      }
      return null;
    });
    expect(notification?.title).toBe('Your thought for today is waiting');
    expect(notification?.body.length).toBeGreaterThan(10);
    expect(notification?.tag).toBe('daily-quote');

    // Opening the app the way a tap does shows that quote first.
    await page.goto(`./?quote=${notification!.data.quoteId}`);
    await expect(feed(page).getByRole('article').first()).toHaveAttribute(
      'data-card-id',
      notification!.data.quoteId,
    );
    await expect(page).not.toHaveURL(/quote=/);
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

test.describe('offer to install', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`appears after a favourite and is accessible in the ${colorScheme} theme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.addInitScript(() => {
        localStorage.setItem('verbeapp:preferences:v1', '{}');
      });
      await page.goto('./');
      await expect(feed(page).getByRole('article').first()).toBeVisible();
      // Stand in for Chrome deciding the app is installable.
      await page.evaluate(() => {
        const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
          prompt: () => Promise.resolve(),
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        });
        window.dispatchEvent(event);
      });
      const offer = page.getByRole('complementary', { name: 'Install Verbe' });
      await expect(offer).toBeHidden();

      await feed(page).getByRole('button', { name: 'Favourite' }).first().click();
      await expect(offer).toBeVisible();
      // Sits under the quotes rather than over them, so their buttons stay usable.
      const favourite = feed(page).getByRole('button', { name: 'Favourite', pressed: true });
      await expect(favourite).toBeInViewport({ ratio: 1 });
      await favourite.click();
      await expect(favourite).toBeHidden();
      await expectNoAxeViolations(page);

      await offer.getByRole('button', { name: 'Not now' }).click();
      await expect(offer).toBeHidden();
    });
  }
});
