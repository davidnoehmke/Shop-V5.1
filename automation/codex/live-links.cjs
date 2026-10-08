'use strict';
const fs = require('node:fs');
const origin = 'https://leaferservice.com';
const decode = value => value.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
function route(href, base = origin) {
  let url; try { url = new URL(decode(href), base); } catch { return null; }
  if (url.origin !== origin || /\.(?:pdf|jpg|jpeg|png|webp|svg|atom|json|js|css)$/i.test(url.pathname)) return null;
  if (/^\/(?:en\/)?(?:account|customer_authentication|checkout|cart\/|apps|admin|cdn)(?:\/|$)/.test(url.pathname)) return null;
  if (!/^\/(?:en\/)?(?:products|collections|pages|blogs|policies)(?:\/|$)/.test(url.pathname) && !['/', '/en', '/en/', '/cart', '/en/cart', '/search', '/en/search'].includes(url.pathname)) return null;
  return url.pathname;
}
function links(html, base) {
  return [...new Set([...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)].map(m => route(m[1], base)).filter(Boolean))];
}
function findings(path, status, finalUrl, html) {
  const issues = []; const final = new URL(finalUrl).pathname;
  if (status !== 200) issues.push(`HTTP ${status}`);
  if (!['/', '/en', '/en/'].includes(path) && ['/', '/en', '/en/'].includes(final)) issues.push('Resource redirected to homepage');
  if (path.startsWith('/en/') && !final.startsWith('/en/') && final !== '/en') issues.push('English link lost locale');
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  if (/Liquid (?:error|syntax error)|Translation missing:/i.test(visible)) issues.push('Rendering error');
  return issues;
}
async function get(url) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const r = await fetch(url, {signal: AbortSignal.timeout(25000)}); const html = await r.text();
      if ((r.status === 429 || r.status >= 500) && attempt < 2) {
        const header = r.headers.get('retry-after');
        const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? (Date.parse(header) - Date.now()) / 1000 : 5 * (attempt + 1);
        if (seconds > 60) return {status:r.status, url:r.url, html};
        await new Promise(resolve => setTimeout(resolve, Math.max(5000, Number.isFinite(seconds) ? seconds * 1000 : 5000)));
        continue;
      }
      return {status:r.status, url:r.url, html};
    }
    catch (e) { error = e; }
  }
  throw error;
}
async function main() {
  const todo = new Set(['/', '/en/', '/cart', '/en/cart', '/search', '/en/search']);
  const sitemap = await get(`${origin}/sitemap.xml`);
  if (sitemap.status !== 200) throw new Error('Sitemap unavailable');
  const maps = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => decode(m[1]));
  for (const map of maps) {
    if (new URL(map).origin !== origin) throw new Error('External sitemap');
    const r = await get(map); if (r.status !== 200) throw new Error(`Sitemap HTTP ${r.status}`);
    for (const m of r.html.matchAll(/<loc>(.*?)<\/loc>/g)) { const path = route(m[1]); if (path) { todo.add(path); if (!path.startsWith('/en')) todo.add(path === '/' ? '/en/' : `/en${path}`); } }
  }
  const seen = new Set(), results = [], sources = new Map();
  while (true) {
    const batch = [...todo].filter(p => !seen.has(p)).slice(0, 4); if (!batch.length) break;
    if (seen.size + batch.length > 1800) throw new Error('Crawl bound reached; verification incomplete');
    batch.forEach(p => seen.add(p));
    await Promise.all(batch.map(async path => {
      try {
        const r = await get(new URL(path, origin));
        results.push({path, status:r.status, final:new URL(r.url).pathname, issues:findings(path,r.status,r.url,r.html)});
        if (r.status === 200) for (const target of links(r.html,r.url)) { todo.add(target); if (!sources.has(target)) sources.set(target,new Set()); sources.get(target).add(path); }
      } catch (e) { results.push({path,status:0,issues:[e.message]}); }
    }));
    if (seen.size % 50 === 0) console.log(`Verified ${seen.size} public routes`);
  }
  const failures = results.filter(r => r.issues.length).map(r => ({...r,sources:[...(sources.get(r.path)||[])].slice(0,8)}));
  const report = {checked:results.length,failures,results};
  fs.writeFileSync(process.env.LINK_REPORT || '/tmp/leaf-live-links.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({checked:results.length,failures},null,2));
  if (failures.length) process.exitCode = 1;
}
module.exports = {route,links,findings};
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode=1; });
