import {test, expect} from '@playwright/test';

const handle = 'venso-grow-light-winter-e27-pflanzenlampe-7w-15w';

test('real Venso product, both variants, cart and Shopify checkout handoff', async ({page, request}, testInfo) => {
  const referenceResponse = await request.get(`https://leaferservice.com/products/${handle}.js`);
  expect(referenceResponse.ok()).toBeTruthy();
  const reference = await referenceResponse.json();
  expect(reference.vendor).toBe('Venso EcoSolutions GmbH');
  expect(reference.variants).toHaveLength(2);

  const response = await page.goto('/marken/venso');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Licht für deinen Pflanzenplatz.');
  await expect(page.locator(`a[href="/products/${handle}"]`).first()).toBeVisible();
  await page.screenshot({path: testInfo.outputPath('venso-brand.png'), fullPage: true});

  for (const variant of reference.variants) {
    await page.goto(`/products/${handle}?variant=${variant.id}`);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(reference.title);
    const product = page.locator('[data-product-id]');
    await expect(product).toHaveAttribute('data-product-id', `gid://shopify/Product/${reference.id}`);
    await expect(product).toHaveAttribute('data-variant-id', `gid://shopify/ProductVariant/${variant.id}`);
    await expect(page.getByRole('button', {name: variant.title, exact: true})).toHaveAttribute('aria-pressed', 'true');
    const formattedPrice = new Intl.NumberFormat('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(variant.price / 100);
    await expect(product.locator('.product-price-block')).toContainText(formattedPrice);
  }

  const first = reference.variants[0];
  await page.getByRole('button', {name: first.title, exact: true}).click();
  await expect(page.locator('[data-product-id]')).toHaveAttribute('data-variant-id', `gid://shopify/ProductVariant/${first.id}`);
  await page.getByRole('button', {name: 'In den Warenkorb', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Warenkorb', exact: true}).getByText(reference.title, {exact: true}).first()).toBeVisible();
  await page.goto('/cart');
  await expect(page.locator('.cart').first()).toContainText(reference.title);
  await expect(page.locator('.cart').first()).toContainText(first.title);
  await page.screenshot({path: testInfo.outputPath('venso-cart.png'), fullPage: true});

  const checkout = page.getByRole('link', {name: /Zur Kasse/});
  const checkoutUrl = new URL((await checkout.getAttribute('href'))!);
  expect(checkoutUrl.protocol).toBe('https:');
  expect(checkoutUrl.hostname === 'leaferservice.com' || checkoutUrl.hostname.endsWith('.myshopify.com') || checkoutUrl.hostname.endsWith('.leaferservice.com')).toBeTruthy();
  await checkout.click();
  await expect(page).toHaveURL(/checkouts?\//);
  await page.screenshot({path: testInfo.outputPath('checkout-handoff.png'), fullPage: true});
  // Only reach checkout. Never enter customer information or submit an order.
  await page.goto('/cart');
  await page.getByRole('button', {name: 'Entfernen', exact: true}).click();
  await expect(page.locator('.cart').first()).toContainText('Dein Warenkorb ist leer.');
});
