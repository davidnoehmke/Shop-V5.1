import { categories, categoryLabels, filterCrops, monthRange, months, monthSlugs, phases, phaseLabel, type Crop, type Locale } from '../shared/calendar'

/** One public rendering contract for Shopify's stored HTML and browser updates. */
export type View = { kind: 'calendar' } | { kind: 'month'; month: number } | { kind: 'plant'; slug: string }
export interface Filters { month: number; category: string; search: string; phase: string }
export const emptyFilters: Filters = { month: 0, category: '', search: '', phase: '' }
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}
export function pageHandle(view: View): string {
  return view.kind === 'plant' ? `aussaatkalender-${view.slug}` : view.kind === 'month' ? `aussaatkalender-${monthSlugs[view.month - 1]}` : 'aussaatkalender'
}
export function pagePath(view: View, locale: Locale): string {
  return `${locale === 'en' ? '/en' : ''}/pages/${pageHandle(view)}`
}
export function shopPath(path: string, locale: Locale): string { return `${locale === 'en' ? '/en' : ''}${path}` }
const t = (locale: Locale, de: string, en: string) => locale === 'de' ? de : en
const imageUrl = 'https://cdn.shopify.com/s/files/1/0949/8876/3521/articles/1789062835.jpg?width=1000'
const symbols = {
  vegetables: '<path d="M23 17C14 12 8 19 10 29s10 13 14 8c4 5 12 2 14-8s-4-17-13-12M24 17l-4-7m4 7 6-9m-6 9 8-2"/>',
  herbs: '<path d="M12 39 34 8M21 27C9 28 9 18 10 14c10-1 14 5 11 13m7-11c-1-9 5-12 13-12 1 8-4 14-13 12M16 34c12 3 18-3 18-10-10-2-17 2-18 10"/>',
  flowers: '<circle cx="24" cy="22" r="5"/><path d="M20 16c-10-14 19-14 8 0m1 2c17-5 17 17 2 10m-2 2c5 16-17 16-11 0m-2-3C1 32 2 10 18 17m6 13v14m0-4c4-7 8-6 11-6"/>',
  fruit: '<path d="M23 17c-7-8-16 0-13 10 3 12 11 14 14 9 4 5 11 1 14-9 3-10-6-18-14-10Zm1 0c-4-9 1-12 8-12 1 7-1 11-8 12Z"/>',
}

export function renderCard(crop: Crop, locale: Locale, month = 0): string {
  return `<article class="crop-card" data-crop="${crop.slug}">
    <div class="crop-heading"><div><p class="crop-category">${categoryLabels[locale][crop.category]}</p><h3>${escapeHtml(crop.names[locale])}</h3></div>
    <svg class="crop-symbol ${crop.category}" viewBox="0 0 48 48" aria-hidden="true">${symbols[crop.category]}</svg></div>
    <dl class="crop-periods">${phases.map(phase => `<div${month && crop.timing[phase].includes(month) ? ' class="current-phase"' : ''}><dt><span class="phase-dot ${phase}"></span>${phaseLabel(phase, locale, crop.timing.harvest_kind === 'flowering')}</dt><dd>${monthRange(crop.timing[phase], locale)}${month && crop.timing[phase].includes(month) ? `<span class="sr-only">${t(locale, ', im ausgewählten Monat', ', in selected month')}</span>` : ''}</dd></div>`).join('')}</dl>
    <a class="card-link" href="${pagePath({ kind: 'plant', slug: crop.slug }, locale)}">${t(locale, 'Dein Pflanzplan', 'Your growing plan')}<span class="sr-only">: ${escapeHtml(crop.names[locale])}</span><span aria-hidden="true">→</span></a>
  </article>`
}
export function selectedCrops(crops: Crop[], locale: Locale, filters: Filters): Crop[] {
  return filterCrops(crops, filters).sort((a, b) => a.names[locale].localeCompare(b.names[locale], locale))
}
export function resultCount(count: number, locale: Locale): string {
  return `${count} ${t(locale, count === 1 ? 'Pflanze passt zu deiner Auswahl' : 'Pflanzen passen zu deiner Auswahl', count === 1 ? 'plant matches your selection' : 'plants match your selection')}`
}
export function renderResults(crops: Crop[], locale: Locale, filters: Filters): string {
  const selected = selectedCrops(crops, locale, filters)
  return selected.length ? `<div class="crop-grid">${selected.map(crop => renderCard(crop, locale, filters.month)).join('')}</div>` : `<div class="empty-state"><h3>${t(locale, 'Ein guter Moment zum Neuplanen.', 'A good moment for a new plan.')}</h3><p>${t(locale, 'Für diese Kombination gibt es keinen Eintrag. Wähle einen anderen Monat oder zeige alle Pflanzen.', 'No plants match these filters. Choose another month or explore all plants.')}</p><button type="button" class="button" data-reset>${t(locale, 'Alle Pflanzen entdecken', 'Explore all plants')}</button></div>`
}
export function renderCalendar(crops: Crop[], locale: Locale, month = 0): string {
  const filters = { ...emptyFilters, month }
  const root = pagePath({ kind: 'calendar' }, locale)
  return `<div class="calendar-page rail">
    <section class="hero" aria-labelledby="calendar-heading"><div class="hero-copy">
      <p class="eyebrow">${t(locale, 'Dein Jahr im Grünen', 'Your year in green')}</p>
      <h1 id="calendar-heading">${month ? `${t(locale, 'Dein Garten im', 'Your garden in')}<br><em>${months[locale][month - 1]}.</em>` : t(locale, 'Kleine Samen.<br><em>Große Vorfreude.</em>', 'Little seeds.<br><em>So much to grow.</em>')}</h1>
      <p class="hero-description">${t(locale, 'Was wächst wann? Finde den richtigen Moment zum Säen, Pflanzen und Ernten – und mach aus deinen Ideen ein Stück Grün.', 'What grows when? Find the right time to sow, plant and harvest — and turn your ideas into something green.')}</p>
      <a class="button" href="#pflanzen">${t(locale, 'Gartenjahr planen', 'Plan your growing year')} <span aria-hidden="true">↓</span></a>
      <p class="hero-note">${crops.length} ${t(locale, 'Pflanzen · 12 Monate · kostenlose Pflanzpläne', 'plants · 12 months · free growing plans')}</p>
    </div><figure class="hero-image"><img src="${imageUrl}" alt="${t(locale, 'Junge Keimlinge wachsen in einer Anzuchtschale', 'Young seedlings growing in a seed tray')}" width="1000" height="667" fetchpriority="high"><figcaption><span class="image-line"></span>${t(locale, 'Aus einem Anfang wird ein Garten.', 'Every garden starts somewhere.')}</figcaption></figure></section>

    <section id="pflanzen" class="planner" aria-labelledby="planner-heading">
      <div class="section-heading"><div><p class="eyebrow">${t(locale, 'Der Aussaatkalender', 'The sowing calendar')}</p><h2 id="planner-heading">${t(locale, 'Dein Plan. Deine Saison.', 'Your plan. Your season.')}</h2></div><button type="button" class="text-button" data-current-month hidden></button></div>
      <nav class="month-picker" aria-label="${t(locale, 'Monat auswählen', 'Choose a month')}"><a href="${root}#pflanzen" data-month="0" ${!month ? 'aria-current="true"' : ''}><span class="month-number">↻</span><span>${t(locale, 'Ganzjährig', 'All year')}</span></a>${months[locale].map((name, index) => `<a href="${pagePath({ kind: 'month', month: index + 1 }, locale)}#pflanzen" data-month="${index + 1}" aria-label="${name}" ${month === index + 1 ? 'aria-current="true"' : ''}><span class="month-number">${String(index + 1).padStart(2, '0')}</span><span>${name.slice(0, 3)}</span></a>`).join('')}</nav>
      <div class="filter-row" data-enhance hidden>
        <label class="search-field"><span class="sr-only">${t(locale, 'Pflanze suchen', 'Search plants')}</span><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m15 15 6 6" stroke="currentColor" stroke-width="1.5"/></svg><input data-filter="search" type="search" maxlength="80" placeholder="${t(locale, 'Welche Pflanze suchst du?', 'Which plant are you looking for?')}"></label>
        <label class="select-field"><span>${t(locale, 'Kategorie', 'Category')}</span><select data-filter="category"><option value="">${t(locale, 'Alle Pflanzen', 'All plants')}</option>${categories.map(category => `<option value="${category}">${categoryLabels[locale][category]}</option>`).join('')}</select></label>
        <label class="select-field"><span>${t(locale, 'Was möchtest du tun?', 'What would you like to do?')}</span><select data-filter="phase"><option value="">${t(locale, 'Alle Tätigkeiten', 'All activities')}</option>${phases.map(phase => `<option value="${phase}">${phase === 'harvest_or_flowering' ? t(locale, 'Ernten / Blüte erleben', 'Harvest / enjoy flowers') : phaseLabel(phase, locale)}</option>`).join('')}</select></label>
      </div>
      <div class="results-heading"><div><h3 data-result-title>${month ? months[locale][month - 1] : t(locale, 'Dein ganzes Gartenjahr', 'Your whole growing year')}</h3><p data-result-count>${resultCount(selectedCrops(crops, locale, filters).length, locale)}</p></div><button type="button" class="text-button" data-reset hidden>${t(locale, 'Filter zurücksetzen', 'Reset filters')} <span aria-hidden="true">↺</span></button></div>
      <div data-results>${renderResults(crops, locale, filters)}</div>
      <div class="calendar-note"><span class="note-icon" aria-hidden="true">i</span><p>${t(locale, 'Dein Garten gibt den Takt vor. Die Zeitfenster sind Richtwerte für gemäßigtes Mitteleuropa. Sorte, Höhenlage, Bodenwärme und Wetter entscheiden mit. Beachte die Saatgutangaben und setze frostempfindliche Pflanzen erst nach den letzten örtlichen Frösten nach draußen. Ein Strich bedeutet: Diese Methode ist in diesem Pflanzplan nicht vorgesehen.', 'Your garden sets the pace. These windows are approximate for temperate Central Europe. Variety, altitude, soil temperature and weather matter. Follow your seed packet and plant tender crops out only after local frost risk has passed. A dash means that method is not included in this growing plan.')}</p></div>
    </section>
    <section class="growing-guide" aria-labelledby="guide-heading"><div><p class="eyebrow">${t(locale, 'Vom Plan zur ersten Pflanze', 'From planning to planting')}</p><h2 id="guide-heading">${t(locale, 'Alles beginnt mit<br><em>guten Wurzeln.</em>', 'It all starts with<br><em>healthy roots.</em>')}</h2><p>${t(locale, 'Der Kalender zeigt dir, wann es losgeht. In unseren Anzuchttipps liest du, worauf es bei Licht, Feuchtigkeit und dem passenden Substrat ankommt.', 'The calendar shows you when to begin. Our growing guide explains light, moisture and choosing a suitable growing medium.')}</p><a class="button" href="${shopPath('/blogs/leafers-nice2know-blog/anzucht-leicht-gemacht', locale)}">${t(locale, 'Anzucht verstehen', 'Explore the growing guide')} →</a></div>
    <div class="guide-steps">${[
      [t(locale, 'Deine Pflanze wählen', 'Choose your plant'), t(locale, 'Finde den passenden Pflanzplan und lies die Kulturhinweise.', 'Find a growing plan and read the cultivation notes.')],
      [t(locale, 'Den Standort mitdenken', 'Know your growing space'), t(locale, 'Licht, Wärme und Platz sind genauso wichtig wie der Monat.', 'Light, warmth and space matter as much as the month.')],
      [t(locale, 'Mit einem Plan starten', 'Keep your plan close'), t(locale, 'Speichere dein kostenloses Pflanzen-PDF für die nächste Aussaat.', 'Download your free plant PDF for the next sowing session.')],
    ].map(([heading, text], index) => `<div><span>0${index + 1}</span><h3>${heading}</h3><p>${text}</p></div>`).join('')}</div></section>
    <section class="month-links" aria-labelledby="month-links-heading"><h2 id="month-links-heading">${t(locale, 'Monat für Monat ins Grüne.', 'A growing year, month by month.')}</h2><nav aria-label="${t(locale, 'Monatsübersichten', 'Monthly growing guides')}">${months[locale].map((name, index) => `<a id="${monthSlugs[index]}" href="${pagePath({ kind: 'month', month: index + 1 }, locale)}">${name} <span aria-hidden="true">→</span></a>`).join('')}</nav></section>
  </div>`
}

export function renderPlant(crop: Crop, crops: Crop[], locale: Locale): string {
  const de = locale === 'de'
  const name = escapeHtml(crop.names[locale])
  const flowering = crop.timing.harvest_kind === 'flowering'
  const directOnly = !crop.timing.start_indoor.length && crop.timing.sow_outdoors.length > 0
  const pdfButton = (label: string, extra = '') => `<button type="button" class="button ${extra}" data-pdf hidden>${label} <span aria-hidden="true">↓</span></button>`
  const related = crops.filter(item => item.category === crop.category && item.slug !== crop.slug).slice(0, 3)
  return `<article class="plant-page rail">
    <a class="back-link" href="${pagePath({ kind: 'calendar' }, locale)}#pflanzen">← ${t(locale, 'Alle Pflanzen', 'All plants')}</a>
    <header class="plant-intro"><div><p class="eyebrow">${categoryLabels[locale][crop.category]} · ${t(locale, 'Dein Pflanzplan', 'Your growing plan')}</p><h1${crop.names[locale].length > 12 ? ' class="long-title"' : ''}>${name}</h1>${crop.timing.botanical_name ? `<p class="botanical-name">${escapeHtml(crop.timing.botanical_name)}</p>` : ''}</div>${pdfButton(t(locale, 'Pflanzplan als PDF', 'Download plant PDF'), 'secondary')}</header>
    <div class="plant-layout"><div>
    <section class="timeline-panel" aria-labelledby="timeline-heading"><h2 id="timeline-heading">${t(locale, 'Ein Jahr auf einen Blick.', 'A year at a glance.')}</h2><p>${t(locale, 'Richtwerte für gemäßigtes Mitteleuropa', 'Approximate windows for temperate Central Europe')}</p>
      <div class="timeline-scroll" tabindex="0" aria-label="${t(locale, 'Jahrestabelle, horizontal verschiebbar', 'Annual timeline, scroll horizontally')}"><table class="timeline"><caption class="sr-only">${name}: ${t(locale, 'Anbaukalender', 'growing calendar')}</caption><thead><tr><th scope="col">${t(locale, 'Tätigkeit', 'Activity')}</th>${months[locale].map(month => `<th scope="col"><abbr title="${month}">${month.slice(0, 1)}</abbr></th>`).join('')}</tr></thead><tbody>${phases.map(phase => `<tr><th scope="row">${phaseLabel(phase, locale, flowering)}</th>${Array.from({ length: 12 }, (_, index) => `<td><span class="timeline-cell ${crop.timing[phase].includes(index + 1) ? phase : ''}"><span class="sr-only">${crop.timing[phase].includes(index + 1) ? t(locale, 'Mögliches Zeitfenster', 'Typical window') : '—'}</span></span></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <dl class="timeline-summary">${phases.map(phase => `<div><dt><span class="phase-dot ${phase}"></span>${phaseLabel(phase, locale, flowering)}</dt><dd>${monthRange(crop.timing[phase], locale)}</dd></div>`).join('')}</dl><p class="fine-print">${t(locale, 'Ein Strich bedeutet: Diese Methode ist in diesem Pflanzplan nicht vorgesehen. Bei Blumen zeigt die letzte Zeile die Blüte, nicht die Samenreife.', 'A dash means that method is not included in this plan. For flowers, the final row shows flowering, not seed maturity.')}</p>
    </section>
    <section class="cultivation" aria-labelledby="cultivation-heading"><p class="eyebrow">${t(locale, 'Darauf kommt es an', 'What matters most')}</p><h2 id="cultivation-heading">${t(locale, 'So gelingt dein Start.', 'Give your plants a good start.')}</h2><p class="cultivation-note">${escapeHtml(de ? crop.cultivation_note_de : crop.cultivation_note_en)}</p><p>${t(locale, 'Wähle die Sorte passend zu deinem Standort. Die konkrete Saatgutanleitung hat Vorrang vor diesem allgemeinen Kalender. Plane Platz zum Wachsen ein und beobachte Feuchtigkeit und Wetter regelmäßig.', 'Choose a variety suited to your location. Specific seed-packet instructions take priority over this general calendar. Allow room for growth and check moisture and weather regularly.')}</p></section>
    <section class="sources" aria-labelledby="sources-heading"><h2 id="sources-heading">${t(locale, 'Worauf dieser Plan beruht', 'Sources behind this plan')}</h2><p>${t(locale, 'Die Zeitfenster sind eine redaktionelle Zusammenfassung der folgenden Fachquellen. Sie zeigen einen möglichen Anbauplan; Sorte und Mikroklima können andere Termine erfordern.', 'These windows are an editorial synthesis of the following horticultural sources. They describe one practical growing plan; varieties and local conditions may need different timings.')}</p><ul role="list">${crop.source_refs.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.publisher)} — ${escapeHtml(source.title)} <span aria-hidden="true">→</span></a></li>`).join('')}</ul>${Number.isFinite(Date.parse(crop.updated_at)) ? `<p class="fine-print">${t(locale, 'Fachlich abgeglichen am', 'Sources checked on')} ${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Berlin' }).format(new Date(crop.updated_at))}.</p>` : ''}</section>
    </div><aside class="plant-sidebar"><div class="download-panel"><svg width="38" height="44" viewBox="0 0 38 44" aria-hidden="true"><path d="M7 2h16l9 9v31H7V2Zm15 0v11h10M13 22h13M13 28h13M13 34h8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><h2>${t(locale, 'Dein Plan zum Mitnehmen.', 'Take your plan with you.')}</h2><p>${t(locale, 'Monatsübersicht, Kulturhinweise und Quellen auf einem kostenlosen Pflanzenblatt.', 'Your monthly calendar, cultivation notes and sources in a free printable plant guide.')}</p>${pdfButton(t(locale, 'PDF herunterladen', 'Download PDF'))}<p data-pdf-message role="status" aria-live="polite" aria-atomic="true"></p><a data-pdf-ready hidden target="_blank" rel="noopener">${t(locale, 'PDF öffnen / speichern', 'Open / save PDF')}</a><small>${t(locale, 'Ohne Anmeldung. Für deine nächste Aussaat.', 'No sign-up. Ready for your next sowing session.')}</small><noscript><p>${t(locale, 'Du kannst diese Seite über die Druckfunktion deines Browsers als PDF speichern.', 'You can save this page as a PDF using your browser’s print menu.')}</p></noscript></div>
      <div class="shop-panel"><p class="eyebrow">${t(locale, 'Für deinen Start', 'For your next step')}</p><h2>${t(locale, 'Anzucht gut vorbereiten.', 'Get ready to grow.')}</h2><p>${directOnly ? t(locale, 'Bei dieser Pflanze steht die Direktsaat im Vordergrund. Bereite das Beet vor und beachte die Hinweise zur Bodenfeuchte.', 'This plan focuses on direct sowing. Prepare your bed and follow the moisture guidance.') : t(locale, 'Passende Gefäße und Anzuchtsubstrat findest du in unserem Shop.', 'Find suitable containers and seed-starting medium in our shop.')}</p><a href="${shopPath('/collections/anzucht-aussaat', locale)}">${t(locale, 'Anzucht & Aussaat entdecken', 'Explore sowing supplies')} →</a>${!directOnly && crop.slug !== 'erdbeere' ? `<a href="${shopPath('/products/leafer-seed-cutting-mix', locale)}">Seed & Cutting Mix →</a><a href="${shopPath('/products/anzucht-starter-set', locale)}">${t(locale, 'Anzucht Starter Set', 'Seed-starting starter set')} →</a>` : ''}</div>
    </aside></div>
    ${related.length ? `<section class="related-plants"><h2>${t(locale, 'Noch mehr Ideen fürs Grüne.', 'More ideas for your growing space.')}</h2><div class="crop-grid">${related.map(item => renderCard(item, locale)).join('')}</div></section>` : ''}
    <a class="back-link" href="${pagePath({ kind: 'calendar' }, locale)}#pflanzen">← ${t(locale, 'Zurück zum Aussaatkalender', 'Back to the sowing calendar')}</a>
  </article>`
}

export function renderPage(crops: Crop[], locale: Locale, view: View): string {
  const crop = view.kind === 'plant' ? crops.find(item => item.slug === view.slug) : undefined
  if (view.kind === 'plant' && !crop) throw new Error(`Unknown crop: ${view.slug}`)
  return `<leaf-grow-calendar data-locale="${locale}" data-view="${view.kind}" data-month="${view.kind === 'month' ? view.month : 0}" data-slug="${crop?.slug || ''}" data-revision="${escapeHtml(crop?.updated_at || crops.map(item => item.updated_at).sort().at(-1) || '')}">
    <div class="native-data-status rail" data-data-status hidden><p data-data-message></p><button type="button" class="text-button" data-retry>${t(locale, 'Aktualisierung erneut versuchen', 'Try updating again')}</button></div>
    <div class="sr-only" data-announcer role="status" aria-live="polite" aria-atomic="true"></div>
    <div data-view-content>${crop ? renderPlant(crop, crops, locale) : renderCalendar(crops, locale, view.kind === 'month' ? view.month : 0)}</div>
  </leaf-grow-calendar>`
}
export function pageMetadata(crops: Crop[], locale: Locale, view: View): { title: string; description: string } {
  if (view.kind === 'plant') {
    const crop = crops.find(item => item.slug === view.slug)!
    return { title: `${crop.names[locale]}: ${t(locale, 'Aussaat & Pflanzplan', 'sowing & growing plan')} | LEAFerservice`, description: t(locale, crop.cultivation_note_de, crop.cultivation_note_en).slice(0, 155) }
  }
  return {
    title: view.kind === 'month' ? `${t(locale, 'Aussaatkalender', 'Sowing calendar')} ${months[locale][view.month - 1]} | LEAFerservice` : t(locale, 'Aussaatkalender: 30 Pflanzen & PDF-Pläne | LEAFerservice', 'Sowing calendar: 30 plants & free PDFs | LEAFerservice'),
    description: t(locale, 'Plane Aussaat, Vorziehen, Auspflanzen und Ernte für 30 Pflanzen. Mit Monatsfiltern, Anbauhinweisen und kostenlosen PDF-Pflanzplänen.', 'Plan sowing, planting and harvesting for 30 plants. Explore monthly filters, growing tips and free printable plant PDFs.'),
  }
}
