import { readFileSync, writeFileSync } from 'node:fs'
import { months, monthSlugs, monthRange, cropPath, monthPath } from '../shared/calendar.ts'

// Deployment snapshot only. Runtime crop edits belong in Supabase.
const crops=JSON.parse(readFileSync(new URL('./reviewed-crops.json',import.meta.url),'utf8'))
const origin='https://leaferservice-grow-calendar.vercel.app'
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
for(const locale of ['de','en']){
  const de=locale==='de'
  const appUrl=origin+(de?'/':'/en')
  const pageTitle=de?'Aussaatkalender: 30 Pflanzen & PDF-Pläne | LEAFerservice':'Sowing calendar: 30 plants & free PDFs | LEAFerservice'
  const pageDescription=de?'Plane Aussaat, Vorziehen, Auspflanzen und Ernte für 30 Pflanzen. Mit Monatsfiltern, Anbauhinweisen und kostenlosen PDF-Pflanzplänen auf Deutsch und Englisch.':'Plan sowing, planting and harvesting for 30 plants. Explore monthly filters, growing tips and free plant PDFs in English and German.'
  const parentScript=`(function () {
    var root = document.getElementById('leaf-grow-calendar');
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = 'true';
    var frame = root.querySelector('iframe');
    var origin = '${origin}';
    var monthSlugs = ${JSON.stringify(monthSlugs)};
    var linkedMonthPending = false;
    // The host theme can omit native metadata when its former SEO app is absent.
    // Preserve any existing metadata; add a fallback only for this calendar page.
    if (!document.title.trim()) document.title = ${JSON.stringify(pageTitle)};
    if (!document.querySelector('meta[name="description"]')) {
      var description = document.createElement('meta');
      description.name = 'description';
      description.content = ${JSON.stringify(pageDescription)};
      document.head.appendChild(description);
    }
    // Keep anchors for no-JavaScript readers, but avoid native fragment scrolling
    // into the reference table once the interactive calendar handles the month.
    root.querySelectorAll('.leaf-grow-month-links a[id]').forEach(function (link) { link.removeAttribute('id'); });
    function revealCalendar() {
      window.scrollTo({top:Math.max(0,frame.getBoundingClientRect().top+window.scrollY-110),behavior:'instant'});
    }
    function handshake() { frame.contentWindow.postMessage({type:'leaf-grow-init'}, origin); }
    frame.addEventListener('load', function () {
      handshake();
      if (linkedMonthPending) { linkedMonthPending = false; requestAnimationFrame(revealCalendar); }
    });
    window.addEventListener('message', function (event) {
      if (event.origin !== origin || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'leaf-grow-ready') { handshake(); return; }
      if (event.data.type === 'leaf-grow-height') {
        var height = event.data.height;
        if (typeof height === 'number' && Number.isFinite(height) && height >= 240 && height <= 20000) frame.style.height = Math.ceil(height) + 'px';
      }
      if (event.data.type === 'leaf-grow-route') {
        requestAnimationFrame(revealCalendar);
      }
    });
    function openLinkedMonth() {
      var hash=window.location.hash.slice(1).toLowerCase();
      var month=monthSlugs.indexOf(hash)+1;
      var query=new URLSearchParams(window.location.search).get('month');
      if (!month && /^(?:[1-9]|1[0-2])$/.test(query || '')) month=Number(query);
      if (month) {
        linkedMonthPending = true;
        frame.src='${appUrl}?embedded=1&month='+month;
      }
    }
    window.addEventListener('hashchange',openLinkedMonth);
    openLinkedMonth();
    handshake();
  })();`
  const rows=crops.slice().sort((a,b)=>a.names[locale].localeCompare(b.names[locale],locale)).map(c=>`<tr><th scope="row"><a href="${origin+cropPath(c.slug,locale)}">${escape(c.names[locale])}</a></th><td>${monthRange(c.timing.start_indoor,locale)}</td><td>${monthRange(c.timing.sow_outdoors,locale)}</td><td>${monthRange(c.timing.transplant_outdoors,locale)}</td><td>${monthRange(c.timing.harvest_or_flowering,locale)}${c.category==='flowers'?(de?' (Blüte)':' (flowers)'):''}</td></tr>`).join('\n')
  const html=`<section id="leaf-grow-calendar" aria-labelledby="leaf-grow-page-title">
<div class="leaf-grow-page-heading"><h1 id="leaf-grow-page-title">${de?'Aussaatkalender':'Sowing calendar'}</h1><a href="${appUrl}" target="_blank" rel="noopener">${de?'Kalender separat öffnen':'Open calendar in a new tab'} →</a></div>
<p class="leaf-grow-page-intro">${de?'Dein Gartenjahr mit 30 Pflanzen: Finde passende Zeitfenster für Gemüse, Kräuter, Blumen und Obst. Wähle einen Monat und öffne deinen Pflanzplan mit Kulturhinweisen und kostenlosem PDF.':'Your growing year with 30 plants: find seasonal windows for vegetables, herbs, flowers and fruit. Choose a month and open your growing plan with cultivation notes and a free PDF.'}</p>
<iframe src="${appUrl}?embedded=1" title="${de?'Interaktiver LEAFerservice Aussaatkalender':'Interactive LEAFerservice sowing calendar'}" width="100%" height="1900" loading="eager" sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" referrerpolicy="strict-origin-when-cross-origin"></iframe>
<details class="leaf-grow-reference"><summary>${de?'Monatsübersichten und Pflanzzeiten als Tabelle':'Monthly guides and growing times as a table'}</summary><h2>${de?'Aussaatkalender von Januar bis Dezember':'A sowing calendar from January to December'}</h2><p>${de?'Die Monatsübersichten zeigen Pflanzen mit passenden Tätigkeiten. Du kannst zusätzlich nach Vorziehen, Direktsaat, Auspflanzen oder Ernte und Blüte filtern.':'Monthly guides show plants with seasonal activities. Filter by starting under cover, direct sowing, planting out, or harvesting and flowering.'}</p><nav aria-label="${de?'Monatsübersichten':'Monthly guides'}" class="leaf-grow-month-links">${months[locale].map((m,i)=>`<a id="${monthSlugs[i]}" href="${origin+monthPath(i+1,locale)}">${m}</a>`).join(' ')}</nav><div class="leaf-grow-table-scroll" tabindex="0" aria-label="${de?'Pflanzzeiten, horizontal verschiebbar':'Growing times, scroll horizontally'}"><table><caption>${de?'Pflanzzeiten für gemäßigtes Mitteleuropa':'Growing windows for temperate Central Europe'}</caption><thead><tr><th scope="col">${de?'Pflanze':'Plant'}</th><th scope="col">${de?'Vorziehen':'Start under cover'}</th><th scope="col">${de?'Direktsaat':'Direct sow'}</th><th scope="col">${de?'Auspflanzen':'Plant out'}</th><th scope="col">${de?'Ernte / Blüte':'Harvest / flowering'}</th></tr></thead><tbody>${rows}</tbody></table></div><p>${de?'Die Zeitfenster sind Richtwerte, keine Sortengarantie. Saatgutanleitung, Standort, Bodenwärme und örtliche Frostgefahr haben Vorrang. Die Detailpläne erläutern Besonderheiten wie Winterernte aus Vorjahresaussaat und Ernte an mehrjährigen Pflanzen. Ein Strich bedeutet, dass eine Methode in diesem Plan nicht vorgesehen ist.':'These windows are approximate, not guarantees for every variety. Seed-packet guidance, location, soil warmth and local frost risk take priority. Individual plans explain winter harvests from the previous year and harvesting established perennials. A dash means that method is not included in this plan.'}</p><p>${de?'Fachgrundlage: Bayerische Gartenakademie, Bundesinformationszentrum Landwirtschaft und Royal Horticultural Society. Die konkreten Quellen findest du bei jeder Pflanze.':'Based on guidance from the Bavarian Garden Academy, the German Federal Agriculture Information Centre and the Royal Horticultural Society. Each plant guide links its specific sources.'}</p></details>
<div class="leaf-grow-more"><h2>${de?'Gut vorbereitet ins Gartenjahr':'Get ready for your growing year'}</h2><p><a href="${de?'':'/en'}/blogs/leafers-nice2know-blog/anzucht-leicht-gemacht">${de?'Anzucht Schritt für Schritt':'Growing from seed, step by step'}</a> · <a href="${de?'':'/en'}/collections/anzucht-aussaat">${de?'Anzucht & Aussaat im Shop':'Sowing supplies in the shop'}</a></p></div>
</section>
<style>
.main-page:has(#leaf-grow-calendar){max-width:1280px;padding-block:clamp(1rem,3vw,2.5rem)}.main-page__content:has(#leaf-grow-calendar){margin-top:0}#leaf-grow-calendar{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#454d3d}#leaf-grow-calendar .leaf-grow-page-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:14px}#leaf-grow-calendar h1{font-size:clamp(1.35rem,2.5vw,1.85rem);margin:0;letter-spacing:-.03em}#leaf-grow-calendar .leaf-grow-page-heading a{font-size:.8rem;min-height:44px;display:inline-flex;align-items:center}#leaf-grow-calendar .leaf-grow-page-intro{font-size:.87rem;line-height:1.6;max-width:850px;margin:0 0 24px}#leaf-grow-calendar iframe{display:block;width:100%;max-width:100%;border:0;border-radius:18px;background:#f5f0e6;margin:0;min-height:350px}#leaf-grow-calendar .leaf-grow-reference{margin-top:28px;padding:22px 0;border-block:1px solid #ddd1be}#leaf-grow-calendar summary{cursor:pointer;font-size:.95rem;padding:12px 0;min-height:44px}#leaf-grow-calendar .leaf-grow-reference p,#leaf-grow-calendar .leaf-grow-more p{font-size:.85rem;line-height:1.65}#leaf-grow-calendar h2{margin-top:28px;font-size:1.35rem}#leaf-grow-calendar .leaf-grow-month-links{display:flex;flex-wrap:wrap;gap:10px 20px;margin:20px 0}#leaf-grow-calendar .leaf-grow-month-links a{padding:7px 0;font-size:.85rem;min-height:40px}#leaf-grow-calendar .leaf-grow-table-scroll{overflow-x:auto;margin:24px 0}#leaf-grow-calendar table{min-width:650px;font-size:.8rem}#leaf-grow-calendar caption{text-align:left;padding:10px 0;font-weight:600}#leaf-grow-calendar th,#leaf-grow-calendar td{padding:10px;border:1px solid #ddd1be}#leaf-grow-calendar .leaf-grow-more{margin-top:25px}#leaf-grow-calendar a:focus-visible,#leaf-grow-calendar summary:focus-visible,#leaf-grow-calendar [tabindex]:focus-visible{outline:3px solid #454d3d;outline-offset:3px}@media(max-width:480px){#leaf-grow-calendar .leaf-grow-page-heading{gap:0}#leaf-grow-calendar iframe{border-radius:12px}#leaf-grow-calendar .leaf-grow-page-intro{font-size:.8rem}}
</style>
<script>${parentScript}</script>
`
  writeFileSync(new URL(`./shopify-page-${locale}.html`,import.meta.url),html)
}
