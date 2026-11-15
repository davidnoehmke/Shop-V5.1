import test from 'node:test';
import assert from 'node:assert/strict';
import {blogIndexPath, blogPath, blogArticlePath, blogArticleMeta, englishContentIsFallback} from '../app/lib/blog-routing.ts';

test('blog routes preserve the original Shopify handles in both locales', () => {
  assert.equal(blogIndexPath('de'), '/blogs');
  assert.equal(blogIndexPath('en'), '/en/blogs');
  assert.equal(blogPath('leafers-nice2know-blog', 'en'), '/en/blogs/leafers-nice2know-blog');
  assert.equal(
    blogArticlePath('live-labs', 'shopify-liquid-headless-commerce-migration-werkstattbericht', 'de'),
    '/blogs/live-labs/shopify-liquid-headless-commerce-migration-werkstattbericht',
  );
  assert.equal(blogArticlePath('wissen', 'Gießen & Licht', 'de'), '/blogs/wissen/Gie%C3%9Fen%20%26%20Licht');
});

test('published English content is distinguished from Shopify German fallback', () => {
  assert.equal(englishContentIsFallback('  Gleiche   Inhalte ', 'Gleiche Inhalte'), true);
  assert.equal(englishContentIsFallback('Actual English text', 'Deutscher Text'), false);
  assert.equal(englishContentIsFallback(undefined, 'Deutscher Text'), true);
});

const article = {
  handle: 'monstera-thai-constellation-pflegen',
  title: 'Monstera Thai Constellation richtig pflegen',
  publishedAt: '2026-08-26T03:44:21Z',
  content: 'Monstera Pflege und Licht',
  image: {url: 'https://cdn.shopify.com/leaf-blog.jpg', altText: 'Monstera'},
  author: {name: 'LEAFerservice'},
};

test('article metadata uses absolute canonical URLs, image and structured data', () => {
  const tags = blogArticleMeta(article, 'leafers-nice2know-blog', 'de');
  assert.ok(tags.some((tag) => tag.rel === 'canonical' && tag.href ===
    'https://www.leaferservice.com/blogs/leafers-nice2know-blog/monstera-thai-constellation-pflegen'));
  assert.ok(tags.some((tag) => tag.property === 'og:image' && tag.content === article.image.url));
  assert.ok(tags.some((tag) => tag['script:ld+json']?.['@type'] === 'BlogPosting'));
});

test('untranslated English articles do not create duplicate search results', () => {
  const tags = blogArticleMeta(article, 'leafers-nice2know-blog', 'en', true);
  assert.ok(tags.some((tag) => tag.name === 'robots' && tag.content === 'noindex,follow'));
  assert.ok(tags.some((tag) => tag.rel === 'canonical' && tag.href.startsWith('https://www.leaferservice.com/blogs/')));
  assert.ok(!tags.some((tag) => tag['script:ld+json']));
});
