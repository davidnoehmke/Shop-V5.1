import {test, expect} from '@playwright/test';

for (const en of [false, true]) {
  test(`${en ? 'EN' : 'DE'} planning: six viewpoints, keyboard, placement, persistence and cart`, async ({
    page,
  }, testInfo) => {
    const path = en ? '/en/planning' : '/raumplanung';
    await page.goto(path);
    const tour = page.locator('#room-tour');
    const points = tour.locator('nav button');
    await expect(points).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await points.nth(i).focus();
      await page.keyboard.press('Enter');
      await expect(points.nth(i)).toHaveAttribute('aria-pressed', 'true');
      await expect(tour.locator('.room-tour__panel')).toContainText(
        `${i + 1} / 6`,
      );
      const href = await tour
        .locator('.room-tour__panel a')
        .getAttribute('href');
      expect(href).toMatch(
        i === 0 ? /^#room-planner$/ : en ? /^\/en\// : /^\/(?!en)/,
      );
    }
    const planner = page.locator('#room-planner');
    const builder = planner.locator('interieur-room-builder');
    await expect(builder).toHaveAttribute('data-ready', 'true');
    await planner.locator('[data-builder-reset]').click();
    await planner.locator('[data-room-width]').fill('5');
    await planner.locator('[data-add-primitive="shelf"]').click();
    await planner.locator('[data-position="x"]').fill('1.2');
    await planner.locator('[data-position="x"]').press('Tab');
    await expect(planner.locator('[data-position="x"]')).toHaveValue('1.2');
    await expect(planner.locator('[data-summary-count]')).toHaveText('3');
    await page.reload();
    await expect(planner.locator('[data-room-width]')).toHaveValue('5');
    await expect(planner.locator('[data-summary-count]')).toHaveText('3');
    const choices = planner.locator(
      '[data-builder-product-select] option[value^="gid://shopify/ProductVariant/"]',
    );
    expect(
      await choices.count(),
      'A real orderable planner product is required',
    ).toBeGreaterThan(0);
    await planner
      .locator('[data-builder-product-select]')
      .selectOption((await choices.first().getAttribute('value'))!);
    await planner.locator('[data-add-product]').click();
    await planner.locator('[data-duplicate]').click();
    await expect(planner.locator('.room-planner__products li')).toContainText(
      '× 2',
    );
    await planner
      .getByRole('button', {
        name: en ? 'Add setup to cart' : 'Setup in den Warenkorb',
        exact: true,
      })
      .click();
    const dialog = page.getByRole('dialog', {
      name: en ? 'Cart' : 'Warenkorb',
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const checkout = dialog.getByRole('link', {
      name: en ? /Checkout/ : /Zur Kasse/,
    });
    await expect(checkout).toHaveAttribute('href', /^https:\/\//);
    await page.keyboard.press('Escape');
    const language = page.getByRole('link', {
      name: en ? 'Auf Deutsch wechseln' : 'Switch to English',
    });
    await expect(language).toHaveAttribute(
      'href',
      en ? '/raumplanung' : '/en/planning',
    );
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBeTruthy();
    await page.screenshot({
      path: testInfo.outputPath('room-planning.png'),
      fullPage: true,
    });
    await page.goto(en ? '/en/cart' : '/cart');
    for (const button of await page
      .getByRole('button', {name: en ? 'Remove' : 'Entfernen', exact: true})
      .all())
      await button.click();
  });
}
