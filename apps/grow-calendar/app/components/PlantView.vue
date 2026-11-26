<script setup lang="ts">
import { categoryLabels, cropPath, months, phases, phaseLabel, monthRange, type Crop } from '../../shared/calendar'
const { locale, de, embedded, homePath, localPath, shopLink } = useCalendar()
const route = useRoute()
const { data, error } = await useAsyncData('published-crops', () => $fetch<{ crops: Crop[] }>('/api/crops'))
if (error.value) throw createError({ statusCode: 503 })
const crop = computed(() => data.value?.crops.find(c => c.slug === route.params.slug))
if (!crop.value) throw createError({ statusCode: 404 })
const title = computed(() => `${crop.value!.names[locale.value]}: ${crop.value!.timing.harvest_kind === 'flowering' ? (de.value ? 'Aussaat, Pflege & Blüte' : 'sowing, growing & flowering') : (de.value ? 'Aussaat, Pflege & Ernte' : 'sowing, growing & harvesting')}`)
const note = computed(() => de.value ? crop.value!.cultivation_note_de : crop.value!.cultivation_note_en)
usePageSeo(title, note)
const pdfUrl = computed(() => `/api/crops/${crop.value!.slug}/pdf?lang=${locale.value}`)
const pdfFilename = computed(() => `leaferservice-${crop.value!.slug}-${locale.value}.pdf`)
const related = computed(() => data.value!.crops.filter(c => c.category === crop.value!.category && c.slug !== crop.value!.slug).slice(0, 3))
const isDirectOnly = computed(() => !crop.value!.timing.start_indoor.length && crop.value!.timing.sow_outdoors.length > 0)
</script>
<template>
  <article v-if="crop" class="plant-page rail">
    <NuxtLink class="back-link" :to="homePath">← {{ de ? 'Alle Pflanzen' : 'All plants' }}</NuxtLink>
    <header class="plant-intro"><div><p class="eyebrow">{{ categoryLabels[locale][crop.category] }} · {{ de ? 'Dein Pflanzplan' : 'Your growing plan' }}</p><h1 :class="{ 'long-title': crop.names[locale].length > 12 }">{{ crop.names[locale] }}</h1><p v-if="crop.timing.botanical_name" class="botanical-name">{{ crop.timing.botanical_name }}</p></div><a class="button secondary" :href="pdfUrl" :download="pdfFilename">{{ de ? 'Pflanzplan als PDF' : 'Download plant PDF' }} <span aria-hidden="true">↓</span></a></header>
    <div class="plant-layout">
      <div>
        <section class="timeline-panel" aria-labelledby="timeline-heading"><h2 id="timeline-heading">{{ de ? 'Ein Jahr auf einen Blick.' : 'A year at a glance.' }}</h2><p>{{ de ? 'Richtwerte für gemäßigtes Mitteleuropa' : 'Approximate windows for temperate Central Europe' }}</p>
          <div class="timeline-scroll" tabindex="0" :aria-label="de ? 'Jahrestabelle, horizontal verschiebbar' : 'Annual timeline, scroll horizontally'">
            <table class="timeline"><caption class="sr-only">{{ crop.names[locale] }}: {{ de ? 'Anbaukalender' : 'growing calendar' }}</caption><thead><tr><th scope="col">{{ de ? 'Tätigkeit' : 'Activity' }}</th><th v-for="(month, index) in months[locale]" :key="index" scope="col"><abbr :title="month">{{ month.slice(0, 1) }}</abbr></th></tr></thead><tbody><tr v-for="phase in phases" :key="phase"><th scope="row">{{ phaseLabel(phase, locale, crop.timing.harvest_kind === 'flowering') }}</th><td v-for="month in 12" :key="month"><span class="timeline-cell" :class="{ [phase]: crop.timing[phase].includes(month) }"><span class="sr-only">{{ crop.timing[phase].includes(month) ? (de ? 'Mögliches Zeitfenster' : 'Typical window') : '—' }}</span></span></td></tr></tbody></table>
          </div>
          <dl class="timeline-summary"><div v-for="phase in phases" :key="phase"><dt><span class="phase-dot" :class="phase" />{{ phaseLabel(phase, locale, crop.timing.harvest_kind === 'flowering') }}</dt><dd>{{ monthRange(crop.timing[phase], locale) }}</dd></div></dl>
          <p class="fine-print">{{ de ? 'Ein Strich bedeutet: Diese Methode ist in diesem Pflanzplan nicht vorgesehen. Bei Blumen zeigt die letzte Zeile die Blüte, nicht die Samenreife.' : 'A dash means that method is not included in this plan. For flowers, the final row shows flowering, not seed maturity.' }}</p>
        </section>
        <section class="cultivation" aria-labelledby="cultivation-heading"><p class="eyebrow">{{ de ? 'Darauf kommt es an' : 'What matters most' }}</p><h2 id="cultivation-heading">{{ de ? 'So gelingt dein Start.' : 'Give your plants a good start.' }}</h2><p class="cultivation-note">{{ note }}</p><p>{{ de ? 'Wähle die Sorte passend zu deinem Standort. Die konkrete Saatgutanleitung hat Vorrang vor diesem allgemeinen Kalender. Plane Platz zum Wachsen ein und beobachte Feuchtigkeit und Wetter regelmäßig.' : 'Choose a variety suited to your location. Specific seed-packet instructions take priority over this general calendar. Allow room for growth and check moisture and weather regularly.' }}</p></section>
        <section class="sources" aria-labelledby="sources-heading"><h2 id="sources-heading">{{ de ? 'Worauf dieser Plan beruht' : 'Sources behind this plan' }}</h2><p>{{ de ? 'Die Zeitfenster sind eine redaktionelle Zusammenfassung der folgenden Fachquellen. Sie zeigen einen möglichen Anbauplan; Sorte und Mikroklima können andere Termine erfordern.' : 'These windows are an editorial synthesis of the following horticultural sources. They describe one practical growing plan; varieties and local conditions may need different timings.' }}</p><ul><li v-for="source in crop.source_refs" :key="source.url"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.publisher }} — {{ source.title }} <span aria-hidden="true">→</span></a></li></ul><p v-if="crop.updated_at" class="fine-print">{{ de ? 'Fachlich abgeglichen am' : 'Sources checked on' }} {{ new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Berlin' }).format(new Date(crop.updated_at)) }}.</p></section>
      </div>
      <aside class="plant-sidebar">
        <div class="download-panel"><svg width="38" height="44" viewBox="0 0 38 44" aria-hidden="true"><path d="M7 2h16l9 9v31H7V2Zm15 0v11h10M13 22h13M13 28h13M13 34h8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><h2>{{ de ? 'Dein Plan zum Mitnehmen.' : 'Take your plan with you.' }}</h2><p>{{ de ? 'Monatsübersicht, Kulturhinweise und Quellen auf einem kostenlosen Pflanzenblatt.' : 'Your monthly calendar, cultivation notes and sources in a free printable plant guide.' }}</p><a class="button" :href="pdfUrl" :download="pdfFilename">{{ de ? 'PDF herunterladen' : 'Download PDF' }} ↓</a><small>{{ de ? 'Ohne Anmeldung. Für deine nächste Aussaat.' : 'No sign-up. Ready for your next sowing session.' }}</small></div>
        <div class="shop-panel"><p class="eyebrow">{{ de ? 'Für deinen Start' : 'For your next step' }}</p><h2>{{ de ? 'Anzucht gut vorbereiten.' : 'Get ready to grow.' }}</h2><p>{{ isDirectOnly ? (de ? 'Bei dieser Pflanze steht die Direktsaat im Vordergrund. Bereite das Beet vor und beachte die Hinweise zur Bodenfeuchte.' : 'This plan focuses on direct sowing. Prepare your bed and follow the moisture guidance.') : (de ? 'Passende Gefäße und Anzuchtsubstrat findest du in unserem Shop.' : 'Find suitable containers and seed-starting medium in our shop.') }}</p><a :href="shopLink('/collections/anzucht-aussaat')" :target="embedded ? '_top' : undefined">{{ de ? 'Anzucht & Aussaat entdecken' : 'Explore sowing supplies' }} →</a><template v-if="!isDirectOnly && crop.slug !== 'erdbeere'"><a :href="shopLink('/products/leafer-seed-cutting-mix')" :target="embedded ? '_top' : undefined">Seed & Cutting Mix →</a><a :href="shopLink('/products/anzucht-starter-set')" :target="embedded ? '_top' : undefined">{{ de ? 'Anzucht Starter Set' : 'Seed-starting starter set' }} →</a></template></div>
      </aside>
    </div>
    <section v-if="related.length" class="related-plants"><h2>{{ de ? 'Noch mehr Ideen fürs Grüne.' : 'More ideas for your growing space.' }}</h2><div class="crop-grid"><CropCard v-for="item in related" :key="item.slug" :crop="item" :month="0" /></div></section>
    <NuxtLink class="back-link" :to="homePath">← {{ de ? 'Zurück zum Aussaatkalender' : 'Back to the sowing calendar' }}</NuxtLink>
  </article>
</template>
