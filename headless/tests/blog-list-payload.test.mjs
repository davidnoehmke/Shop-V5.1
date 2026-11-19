import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

const overview = read('../app/routes/blogs.$blogHandle._index.tsx');
const article = read('../app/routes/blogs.$blogHandle.$articleHandle.tsx');
const englishOverview = read('../app/routes/en.blogs.$blogHandle._index.tsx');
const englishArticle = read('../app/routes/en.blogs.$blogHandle.$articleHandle.tsx');

test('blog overview fetches card metadata, not complete article HTML', () => {
  const fragment = overview.split('fragment ArticleItem on Article {')[1];
  assert.ok(fragment, 'Expected ArticleItem fragment on Blog route');
  for (const field of ['id', 'handle', 'title', 'excerpt', 'publishedAt', 'image', 'blog']) {
    assert.match(fragment, new RegExp('\\b' + field + '\\b'));
  }
  assert.doesNotMatch(fragment, /\bcontentHtml\b/);
  assert.doesNotMatch(fragment, /\bauthorV2\b/);
});

test('blog article detail still fetches the complete article body', () => {
  assert.match(article, /\bcontentHtml\b/);
  assert.match(article, /<BlogArticlePage /);
});

test('English routes reuse lightweight list while retaining full detail page', () => {
  assert.match(englishOverview, /export \{loader, meta, default\} from '\.\/blogs\.\$blogHandle\._index'/);
  assert.match(englishArticle, /\bcontentHtml\b/);
});
