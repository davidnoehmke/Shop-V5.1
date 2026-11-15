'use strict';
const fs = require('node:fs');
const {createRequester, findings} = require('./live-links.cjs');
const origin = 'https://leaferservice.com';
const routes = [
  '/', '/collections/pflanzenbeleuchtung', '/collections/pflanzsubstrate-mischungen',
  '/collections/substratwelt-pflanzsubstrate-mischungen-zusatze',
  '/collections/substrate-verbesserer', '/collections/interieur-solutions',
  '/collections/zimmerpflanzen-1', '/collections/anzucht-aussaat',
  '/collections/pflanzgefasse', '/collections/pflanzenpflege-werkzeuge',
  '/blogs/leafers-nice2know-blog', '/pages/individuelles-substrat',
  '/products/leafer-alocasia-mix'
];
function inspect(path, response) {
  const issues = findings(path, response.status, response.url, response.html);
  const visible = response.html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const locale = path === '/en/' || path.startsWith('/en/') ? 'en' : 'de';
  const lang = /<html\b[^>]*\blang=["']([^"']+)/i.exec(response.html)?.[1];
  if (lang !== locale) issues.push(`Expected document language ${locale}, received ${lang || 'none'}`);
  if (!/<main\b/i.test(visible) || !/<h1\b/i.test(visible)) issues.push('Main content or primary heading missing');
  if (path === '/' || path === '/en/') {
    if (!/<leaf-guided-advisor\b/.test(visible)) issues.push('Shared advisor missing');
    if (!/data-leaf-shop-assistant\b/.test(visible)) issues.push('Assistant interface missing');
  }
  if (path.endsWith('/products/leafer-alocasia-mix') && !/leaf-ingredient-info/.test(visible)) issues.push('Product ingredient information missing');
  if (path.endsWith('/collections/pflanzsubstrate-mischungen') && !/class="mix-highlight"/.test(visible)) issues.push('Ready-made mix highlights not delivered');
  if (path.endsWith('/collections/pflanzenbeleuchtung') && !/class="led-highlight"/.test(visible)) issues.push('Lighting highlights not delivered');
  return issues;
}
async function main() {
  const get = createRequester();
  const results = [];
  for (const locale of ['de','en']) {
    for (const route of routes) {
      const path = locale === 'en' ? (route === '/' ? '/en/' : `/en${route}`) : route;
      try {
        const r = await get(new URL(path, origin));
        const issues = inspect(path, r);
        results.push({path, status:r.status, final:r.url, issues});
        console.log(`${issues.length ? 'FAIL' : 'PASS'} ${path}${issues.length ? ': ' + issues.join('; ') : ''}`);
      } catch (e) {
        results.push({path,status:0,issues:[e.message]});
        console.error(`FAIL ${path}: ${e.message}`);
      }
    }
    const path = locale === 'en' ? '/en/this-page-must-not-exist-leaf-release' : '/this-page-must-not-exist-leaf-release';
    try {
      const r = await get(new URL(path, origin));
      const issues = r.status === 404 && /<main\b/.test(r.html) && /<leaf-guided-advisor\b/.test(r.html) && !/Liquid (?:error|syntax error)/i.test(r.html) ? [] : ['Expected rendered HTTP 404 with advisor'];
      results.push({path,status:r.status,issues});
    } catch (e) { results.push({path,status:0,issues:[e.message]}); }
  }
  fs.writeFileSync(process.env.RELEASE_REPORT || '/tmp/leaf-release.json',JSON.stringify({source_sha:process.env.VERIFIED_SHA || null,verification:'public behavior and product-world delivery; no byte-identical commit assertion',results},null,2));
  if (results.some(r=>r.issues.length)) process.exitCode=1;
}
module.exports={inspect,routes};
if (require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
