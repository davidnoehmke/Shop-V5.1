'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/leaf-editorial-products.js', 'utf8');
const makeSelect = (initial) => {
  const price = { textContent: '' };
  const handlers = {};
  const select = {
    dataset: {}, selectedOptions: [{ dataset: { price: initial } }],
    closest: () => ({ querySelector: () => price }),
    addEventListener: (name, handler) => { (handlers[name] ||= []).push(handler); }
  };
  return { select, price, handlers };
};
const setup = (selects, forms = []) => {
  const events = {};
  const document = {
    querySelectorAll: (selector) => selector === '[data-editorial-variant]' ? selects : forms,
    addEventListener: (name, handler) => { events[name] = handler; }
  };
  vm.runInNewContext(source, { document });
  return events;
};
test('variant price changes update only their owning product and preserve formatted currency', () => {
  const a = makeSelect('€8,79'), b = makeSelect('€24,95');
  setup([a.select, b.select]);
  assert.equal(a.price.textContent, '€8,79');
  a.select.selectedOptions = [{ dataset: { price: '€26,39' } }];
  a.handlers.change[0]();
  assert.equal(a.price.textContent, '€26,39');
  assert.equal(b.price.textContent, '€24,95');
});
test('theme editor section reload initializes new selectors without duplicate handlers', () => {
  const a = makeSelect('£5.00');
  const events = setup([a.select]);
  events['shopify:section:load']({ target: { querySelectorAll: (selector) => selector === '[data-editorial-variant]' ? [a.select] : [] } });
  assert.equal(a.handlers.change.length, 1);
  const b = makeSelect('£10.00');
  events['shopify:section:load']({ target: { querySelectorAll: (selector) => selector === '[data-editorial-variant]' ? [b.select] : [] } });
  assert.equal(b.price.textContent, '£10.00');
});
test('localized network error survives clearing and reinitializing the error region', () => {
  const error = { textContent: 'Bitte versuche es erneut.' };
  const form = { dataset: {}, querySelector: () => error };
  const events = setup([], [form]);
  error.textContent = '';
  events['shopify:section:load']({ target: { querySelectorAll: (selector) => selector === '.leaf-editorial__form' ? [form] : [] } });
  assert.equal(form.dataset.cartErrorMessage, 'Bitte versuche es erneut.');
});
