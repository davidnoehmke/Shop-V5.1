const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('home selection updates price, links and image inside the selected card', () => {
  const liquid = fs.readFileSync('sections/leaf-conversion-home.liquid', 'utf8');
  const code = liquid.split('{% javascript %}')[1].split('{% endjavascript %}')[0];
  let change;
  class Select {}
  vm.runInNewContext(code, { HTMLSelectElement: Select, document: { addEventListener(name, fn) { change = fn; } } });
  const links = [{ href: '/en/products/lamp?variant=1' }, { href: '/en/products/lamp?variant=1' }];
  const image = { srcset: 'old-image 640w', removeAttribute(name) { delete this[name]; } };
  const price = {}, unitPrice = {}, button = {};
  const card = { querySelectorAll: () => links, querySelector: () => image };
  const fields = { '[data-home-price]': price, '[data-home-unit-price]': unitPrice, 'button[name="add"]': button };
  const form = { querySelector: key => fields[key], closest: () => card };
  const select = new Select();
  select.matches = () => true;
  select.closest = () => form;
  select.selectedOptions = [{ disabled: false, dataset: { price: '€14.99', unitPrice: '', url: '/en/products/lamp?variant=2', image: '//cdn.shopify.com/white.jpg', imageAlt: 'White lamp' } }];
  change({ target: select });
  assert.equal(price.textContent, '€14.99');
  assert.equal(unitPrice.textContent, '');
  assert.equal(button.disabled, false);
  assert.ok(links.every(link => link.href === '/en/products/lamp?variant=2'));
  assert.equal(image.src, '//cdn.shopify.com/white.jpg');
  assert.equal(image.alt, 'White lamp');
  assert.equal(image.srcset, undefined);
});

test('diagnostics do not count homepage purchase forms as product page views and honor consent', () => {
  const code = fs.readFileSync('assets/leaf-conversion-events.js', 'utf8');
  function run(productPage, consent) {
    const dataLayer = [];
    vm.runInNewContext(code, {
      window: { dataLayer, Shopify: { customerPrivacy: { analyticsProcessingAllowed: () => consent } } },
      document: { readyState: 'complete', body: { classList: { contains: name => productPage && name === 'template-product' } }, querySelector: () => null, addEventListener() {} },
      location: { pathname: productPage ? '/products/lamp' : '/' }
    });
    return dataLayer;
  }
  assert.equal(run(false, true).length, 0);
  assert.equal(run(true, false).length, 0);
  assert.equal(run(true, true)[0].event, 'leaf_product_view');
});
