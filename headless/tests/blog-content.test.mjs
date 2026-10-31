import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBlogContent} from '../app/lib/blog-content.server.ts';

test('article anchors are stable, unique and preserve existing deep links',()=>{
 const p=prepareBlogContent('<h2 id="care">Pflege</h2><h2>Gießen &amp; Licht</h2><h2>Gießen &amp; Licht</h2>');
 assert.deepEqual(p.headings.map(h=>h.id),['care','article-giessen-licht','article-giessen-licht-2']);
 assert.equal(p.headings[1].label,'Gießen & Licht');
 assert.match(p.html,/id="care"/);
});
test('legacy styles cannot alter the headless brand and unsafe markup is removed',()=>{
 const p=prepareBlogContent('<style>body{display:none}</style><script>bad()</script><p style="color:red" onclick="bad()">Original fact</p><a href="javascript:bad()">link</a><img src="https://cdn.shopify.com/photo.jpg" alt="Original photo" onerror="bad()">');
 assert.doesNotMatch(p.html,/<style|<script|onclick|onerror|javascript:|style=/i);
 assert.match(p.html,/Original fact/);assert.match(p.html,/https:\/\/cdn.shopify.com\/photo.jpg/);assert.match(p.html,/alt="Original photo"/);
});
test('long guides retain tables, disclosures and captions without duplicate page headings',()=>{
 const p=prepareBlogContent('<h1>Guide</h1><details><summary>Question</summary><p>Answer</p></details><table><tr><th>Material</th><td>Bims</td></tr></table><figure><img src="/photo.webp"><figcaption>Own photograph</figcaption></figure>');
 assert.doesNotMatch(p.html,/<h1/);for(const tag of ['h2','details','summary','table','figcaption'])assert.match(p.html,new RegExp('<'+tag));
});
test('reading time excludes imported scripts and styles',()=>{
 const p=prepareBlogContent('<style>'+('nonsense '.repeat(1000))+'</style><p>'+('word '.repeat(440))+'</p>');
 assert.equal(p.readingMinutes,2);
});
