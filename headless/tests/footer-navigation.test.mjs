import assert from 'node:assert/strict';
import {test} from 'node:test';
import {additionalFooterLinks, footerDestination} from '../app/lib/footer-navigation.ts';

const domains = ['https://leaferservice.com', 'leaferservice.myshopify.com'];
const primary = ['/pages/impressum', '/pages/datenschutzerklaerung', '/pages/contact'];
const link = (id, url) => ({id, title: id, url});

test('merchant links do not repeat primary links or policy aliases in either locale', () => {
  for (const locale of ['de', 'en']) {
    const result = additionalFooterLinks([
      link('legal', 'https://leaferservice.com/en/pages/impressum/'),
      link('privacy', '/policies/privacy-policy'),
      link('contact', '/pages/contact?source=footer'),
      link('labs', '/pages/labs'),
      link('labs-copy', '/en/pages/labs/'),
      link('settings', '/pages/privacy-settings#preferences'),
    ], primary, domains, locale);
    assert.deepEqual(result.map((item) => item.id), ['labs', 'settings']);
    assert.equal(result[1].url, `${locale === 'en' ? '/en' : ''}/pages/privacy-settings#preferences`);
  }
});

test('localization preserves queries and fragments without duplicating the English prefix', () => {
  const result = additionalFooterLinks([
    link('labs', 'https://leaferservice.com/en/pages/labs?view=all#details'),
  ], [], domains, 'en');
  assert.equal(result[0].url, '/en/pages/labs?view=all#details');
  assert.equal(result[0].external, false);
});

test('only exact store hosts become internal and unsafe destinations are omitted', () => {
  assert.equal(footerDestination('https://leaferservice.com.example.org/pages/labs', domains), 'https://leaferservice.com.example.org/pages/labs');
  assert.equal(footerDestination('javascript:alert(1)', domains), null);
  assert.equal(footerDestination('/pages/labs', domains), '/pages/labs');
  assert.equal(footerDestination('https://leaferservice.myshopify.com/pages/labs', domains), '/pages/labs');
  assert.deepEqual(additionalFooterLinks([link('bad', null)], [], domains, 'de'), []);
});

test('known additional links use English labels on English pages', () => {
  const [search] = additionalFooterLinks([{id: 'search', title: 'Suche', url: '/search'}], [], domains, 'en');
  assert.equal(search.title, 'Search');
  assert.equal(search.url, '/en/search');
});
