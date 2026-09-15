'use strict';
// Runs without OpenAI, Shopify, GitHub-write or customer credentials.
// Every test uses a fresh cookie jar and never visits or submits checkout.
const {chromium} = require('playwright');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const target = new URL(process.env.TARGET_URL || '');
  assert(target.protocol === 'https:' && (target.hostname.endsWith('.myshopify.com') || ['leaferservice.com', 'www.leaferservice.com'].includes(target.hostname)), 'Unexpected storefront host');
  assert(/^[1-9][0-9]*$/.test(process.env.EXPECTED_THEME_ID || ''), 'Expected theme ID is required');
  const expected = Number(process.env.EXPECTED_THEME_ID);
  const browser = await chromium.launch();
  try {
    for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 1000}]) {
      const context = await browser.newContext({viewport});
      const page = await context.newPage(); const errors = []; let cartTouched = false;
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(20000);
      try {
        const response = await page.goto(target.href, {waitUntil: 'domcontentloaded', timeout: 45000});
        assert(response?.ok(), 'Storefront did not return a successful response');
        const origin = new URL(page.url()).origin;
        assert(['leaferservice.com', 'www.leaferservice.com', target.hostname].includes(new URL(origin).hostname), 'Unexpected storefront redirect');
        const local = (pathname) => {
          const url = new URL(pathname, origin); assert(url.origin === origin, 'External navigation is forbidden');
          if (target.searchParams.has('preview_theme_id')) url.searchParams.set('preview_theme_id', target.searchParams.get('preview_theme_id'));
          url.searchParams.set('_leaf_ci', process.env.GITHUB_RUN_ID || 'local'); return url.href;
        };
        async function pageReady() {
          await page.locator('main').first().waitFor({state: 'visible'});
          await page.waitForFunction(id => Number(window.Shopify?.theme?.id) === id, expected);
          assert(await page.locator('h1').count() >= 1, 'Missing page H1');
          assert(!/Liquid (?:error|syntax error)/i.test(await page.locator('body').innerText()), 'Liquid rendering error');
        }
        await pageReady();
        const links = await page.locator('a[href]').evaluateAll(elements => elements.map(e => e.getAttribute('href')).filter(Boolean));
        const configurator = links.find(href => /konfigur|configurat/i.test(href) && !href.startsWith('#'));
        assert(configurator, 'No configurator link found on the home page');
        const productPaths = [...new Set(links.map(href => {
          try { const u = new URL(href, origin); return u.origin === origin && /\/products\//.test(u.pathname) ? u.pathname : null; } catch { return null; }
        }).filter(Boolean))].slice(0, 15);
        await page.goto(local(configurator), {waitUntil: 'domcontentloaded'}); await pageReady();
        const range = page.locator('input[type="range"]:visible').first();
        assert(await range.count() > 0, 'No visible configurator slider found');
        await range.focus(); await range.press('ArrowRight'); await range.press('ArrowLeft');
        let selected;
        for (const pathname of productPaths) {
          const handle = pathname.split('/products/')[1]?.split('/')[0];
          if (!handle) continue;
          const r = await context.request.get(new URL(`/products/${encodeURIComponent(handle)}.js`, origin).href);
          if (!r.ok()) continue;
          const product = await r.json(); const variant = product.variants?.find(v => v.available);
          if (variant && !product.requires_selling_plan) { selected = {handle, id: variant.id}; break; }
        }
        assert(selected, 'No purchasable product found among home-page product links');
        await page.goto(local(`/products/${encodeURIComponent(selected.handle)}?variant=${selected.id}`), {waitUntil: 'domcontentloaded'}); await pageReady();
        const forms = page.locator('form[action*="/cart/add"]'); let button;
        for (let index = 0; index < await forms.count(); index++) {
          const form = forms.nth(index); const id = form.locator('[name="id"]').first();
          const submit = form.locator('button[type="submit"]:visible, input[type="submit"]:visible').first();
          if (await id.count() && String(await id.inputValue()) === String(selected.id) && await submit.count() && await submit.isEnabled()) { button = submit; break; }
        }
        assert(button, 'Selected variant has no usable add-to-cart form');
        cartTouched = true; await button.click();
        let added = false;
        for (let attempt = 0; attempt < 20; attempt++) {
          const r = await context.request.get(new URL('/cart.js', origin).href);
          if (r.ok()) { const cart = await r.json(); if (cart.items?.some(item => String(item.variant_id || item.id) === String(selected.id))) { added = true; break; } }
          await pause(500);
        }
        assert(added, 'Add-to-cart did not add the selected variant');
        await page.goto(local('/cart'), {waitUntil: 'domcontentloaded'}); await pageReady();
        assert(errors.length === 0, `Browser reported ${errors.length} uncaught JavaScript error(s)`);
        console.log(`${viewport.width}px: correct theme, home, configurator slider, product form and cart passed. Checkout was not submitted.`);
      } finally {
        if (cartTouched) {
          try { await context.request.post(new URL('/cart/clear.js', page.url()).href); } catch { /* Only this disposable test session is affected. */ }
        }
        await context.close();
      }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
