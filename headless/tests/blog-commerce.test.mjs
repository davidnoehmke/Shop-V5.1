import test from 'node:test';
import assert from 'node:assert/strict';
import {articleCommerceHandles, articleCommerceTopic} from '../app/lib/blog-commerce.ts';

test('technical Live Labs articles remain editorial and free from product placement', () => {
  assert.equal(articleCommerceHandles('live-labs', 'shopify-liquid-headless-commerce-migration-werkstattbericht'), null);
});

test('lighting guides prioritize lighting products even when Alocasia is mentioned', () => {
  assert.equal(articleCommerceTopic('leafers-nice2know-blog', 'pflanzenlampe-alocasia-licht-abstand-dauer'), 'light');
  const picks = articleCommerceHandles('leafers-nice2know-blog', 'pflanzenlampe-alocasia-licht-abstand-dauer');
  assert.equal(picks?.length, 3);
  assert.ok(picks?.every((handle) => typeof handle === 'string' && handle.length > 10));
  assert.equal(new Set(picks).size, 3);
});

test('water, substrate, propagation and container guides remain topic-specific', () => {
  const blog = 'leafers-nice2know-blog';
  assert.equal(articleCommerceTopic(blog, 'blumat-bewaesserungssysteme-vergleich'), 'water');
  assert.equal(articleCommerceTopic(blog, 'leafers-substrate-nice2know'), 'substrate');
  assert.equal(articleCommerceTopic(blog, 'anzucht-leicht-gemacht'), 'propagation');
  assert.equal(articleCommerceTopic(blog, 'pflanzgefaesse'), 'containers');
  assert.equal(articleCommerceTopic(blog, 'monstera-thai-constellation-pflegen'), 'plants');
  assert.equal(articleCommerceTopic(blog, 'monstera-thai-constellation-substrat-mischung'), 'substrate');
});

test('unrelated informational posts do not get a generic product shelf', () => {
  assert.equal(articleCommerceHandles('leafers-nice2know-blog', 'shoplandkarte-navigation-barrierefreiheit-vorlesen'), null);
});
