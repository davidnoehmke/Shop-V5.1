import {test, expect} from '@playwright/test';

test('three conversion tools are discoverable without intrusive overlays', async ({page}) => {
  const home = await page.goto('/');
  expect(home?.status()).toBe(200);
  await expect(page.getByRole('link', {name:/3D-Raumplaner/}).first()).toBeVisible();
  await expect(page.getByRole('link', {name:/Leuchtmittel vergleichen/}).first()).toBeVisible();
  await expect(page.getByRole('link', {name:/3D-Substratkonfigurator/}).first()).toBeVisible();
  await expect(page.locator('.leaf-quiet-advice')).toBeVisible();
  await expect(page.locator('.leaf-quiet-advice button')).toHaveText('Freiwillig beraten lassen');
  await expect(page.locator('.leaf-quiet-advice')).not.toHaveAttribute('role', 'dialog');
});

test('room experience keeps six original areas operable with or without WebGL', async ({page}) => {
  const response = await page.goto('/raumplaner-3d');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', {level:1})).toContainText('Pflanzenraum');
  const zones = page.locator('.leaf-room__zones button');
  await expect(zones).toHaveCount(6);
  await zones.nth(3).click();
  await expect(page.locator('.leaf-room__details h2')).toHaveText('Pflanzenbeleuchtung');
  await expect(page.locator('.leaf-room__details a')).toHaveAttribute('href','/pflanzenlicht-vergleich');
  await expect(page.locator('.leaf-room__stage canvas')).toBeAttached();
});

test('two grow lights show comparable published catalog facts', async ({page}) => {
  const response = await page.goto('/pflanzenlicht-vergleich');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', {level:1})).toHaveText('Zwei Leuchtmittel. Ein klarer Vergleich.');
  const a = page.getByRole('combobox', {name:'Leuchtmittel A'});
  const b = page.getByRole('combobox', {name:'Leuchtmittel B'});
  await expect(a).toBeVisible();
  await expect(b).toBeVisible();
  expect(await a.locator('option').count()).toBeGreaterThanOrEqual(2);
  const secondId = await b.locator('option').nth(1).getAttribute('value');
  expect(secondId).toBeTruthy();
  await b.selectOption(secondId!);
  await expect(page.locator('.leaf-compare__product')).toHaveCount(2);
  await expect(page.locator('.leaf-compare__facts')).toContainText('Photonenfluss (PPF)');
  await expect(page.locator('.leaf-compare__facts')).toContainText('Abstrahlwinkel');
  await expect(page.locator('.leaf-compare__facts')).toContainText('Keine Angabe');
});

test('320 and 430 px navigation and tools do not overflow', async ({page}) => {
  for (const width of [320, 430]) {
    await page.setViewportSize({width,height:750});
    for (const path of ['/', '/raumplaner-3d', '/pflanzenlicht-vergleich']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      const dimensions = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(dimensions.document, `${path} at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 2);
    }
  }
});
