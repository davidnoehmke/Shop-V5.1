import {readFileSync} from 'node:fs';
import {test, expect} from '@playwright/test';

test.beforeEach(async ({page, baseURL}) => {
  if (!process.env.VERCEL_QA_AUTH_FILE) return;
  const access = JSON.parse(readFileSync(process.env.VERCEL_QA_AUTH_FILE, 'utf8'));
  if (!access || typeof access !== 'object' || !('origin' in access) ||
      !('secret' in access) || typeof access.origin !== 'string' ||
      typeof access.secret !== 'string') throw new Error('Invalid QA access configuration');
  const {origin, secret}=access;
  if (origin !== new URL(baseURL!).origin) throw new Error('QA access origin mismatch');
  await page.route('**/*', async (route) => {
    const request = route.request();
    await route.continue(new URL(request.url()).origin === origin
      ? {headers: {...request.headers(), 'x-vercel-protection-bypass': secret}}
      : {});
  });
});

test('German and English entry cards remain optional and link to real destinations', async ({page}) => {
  for (const prefix of ['', '/en']) {
    expect((await page.goto(prefix || '/'))?.status()).toBe(200);
    const cards=page.locator('.leaf-entry__intent');
    await expect(cards).toHaveCount(6);
    await cards.first().locator('summary').click();
    await expect(cards.first().locator('a').first()).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    for (const href of await cards.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')!))) {
      expect((await page.request.get(href)).status(),href).toBe(200);
    }
    const links=await page.locator('.leaf-entry__shortcuts a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    expect(links).toContain(`${prefix}/collections/all`);
    expect(links).toContain(`${prefix}/search`);
  }
});

test('account entry reaches the existing hosted Shopify login when the embedded client is absent', async ({page}) => {
  await page.goto('/account');
  const host=new URL(page.url()).hostname;
  expect(host==='account.leaferservice.com'||host==='127.0.0.1'||host.endsWith('.vercel.app')).toBe(true);
  expect(await page.locator('body').innerText()).not.toContain('An unexpected error occurred');
});

test('commerce and planning routes render at narrow mobile and desktop widths', async ({page}) => {
  const errors: string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  for (const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    for (const path of ['/', '/en', '/raumplaner-3d', '/en/room-planner-3d',
      '/pflanzenlicht-vergleich', '/en/pflanzenlicht-vergleich',
      '/products/leafer-substrat-konfigurator', '/en/products/leafer-substrat-konfigurator', '/cart', '/en/cart']) {
      expect((await page.goto(path))?.status(),path).toBe(200);
      await expect(page.locator('h1'),path).toHaveCount(1);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      expect(overflow,`${path} at ${width}px`).toBeLessThanOrEqual(2);
    }
  }
  expect(errors).toEqual([]);
});

test('room studio supports independent plants, numeric placement and undo', async ({page}) => {
  await page.goto('/raumplaner-3d');
  await page.getByRole('combobox',{name:'Pflanzenart'}).selectOption('monstera');
  await page.getByRole('button',{name:'Pflanze platzieren',exact:true}).click();
  const x=page.getByLabel('Position X (m)',{exact:true});
  await x.fill('1.5');
  await expect(x).toHaveValue('1.5');
  await page.getByRole('button',{name:'Duplizieren',exact:true}).click();
  await expect(page.locator('svg g')).toHaveCount(2);
  await page.getByRole('button',{name:'Rückgängig',exact:true}).click();
  await expect(page.locator('svg g')).toHaveCount(1);
});

test('four-part recipe survives cart reload and checkout handoff', async ({page}) => {
  await page.goto('/products/leafer-substrat-konfigurator');
  const components=page.locator('.substrate-component-option');
  expect(await components.count()).toBeGreaterThanOrEqual(4);
  for(let i=0;i<4;i++) await components.nth(i).click();
  const sliders=page.locator('.substrate-sliders input');
  await expect(sliders).toHaveCount(4);
  await sliders.first().fill('95');
  const values=await sliders.evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLInputElement).value)));
  expect(values.reduce((a,b)=>a+b,0)).toBe(100);
  expect(values.every(n=>n>=0)).toBe(true);
  const recipe=await page.locator('.substrate-recipe-text').innerText();
  await page.getByRole('button',{name:'Individuelles Substrat hinzufügen',exact:true}).click();
  await expect(page.locator('.overlay.expanded .cart-line-recipe').first()).toContainText(recipe);
  await page.goto('/cart');
  await expect(page.locator('.cart-line-recipe').first()).toContainText(recipe);
  await page.reload();
  await expect(page.locator('.cart-line-recipe').first()).toContainText(recipe);
  const checkout=page.getByRole('link',{name:/Zur Kasse/});
  const url=new URL((await checkout.getAttribute('href'))!);
  expect(url.protocol).toBe('https:');
  expect(url.hostname==='leaferservice.com'||url.hostname.endsWith('.myshopify.com')||url.hostname.endsWith('.leaferservice.com')).toBe(true);
  try {
    await checkout.click();
    await expect(page).toHaveURL(/checkouts?\//);
    await expect(page.locator('body')).toContainText('95%');
  } finally {
    // New isolated browser cart only. Never submit an order or enter personal data.
    await page.goto('/cart');
    await page.getByRole('button',{name:'Entfernen',exact:true}).first().click();
    await expect(page.locator('.cart-line')).toHaveCount(0);
  }
});
