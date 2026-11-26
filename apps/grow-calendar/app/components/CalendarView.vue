<script setup lang="ts">
import { categories, categoryLabels, filterCrops, months, phases, phaseLabel, parseMonth, monthPath, type Crop } from '../../shared/calendar'
const props = withDefaults(defineProps<{ fixedMonth?: number }>(), { fixedMonth: 0 })
const { locale, de, embedded, localPath, shopLink } = useCalendar()
const route = useRoute()
const router = useRouter()
const { data, error, refresh } = await useAsyncData('published-crops', () => $fetch<{ crops: Crop[] }>('/api/crops'))
const selectedMonth = computed(() => props.fixedMonth || parseMonth(route.query.month))
const category = computed(() => categories.includes(route.query.category as any) ? String(route.query.category) : '')
const action = computed(() => phases.includes(route.query.action as any) ? String(route.query.action) : '')
const search = computed(() => typeof route.query.q === 'string' ? route.query.q.slice(0, 80) : '')
const crops = computed(() => data.value?.crops || [])
const filtered = computed(() => filterCrops(crops.value, { month: selectedMonth.value, category: category.value, search: search.value, phase: action.value }).sort((a, b) => a.names[locale.value].localeCompare(b.names[locale.value], locale.value)))
const title = computed(() => props.fixedMonth ? `${de.value ? 'Aussaatkalender' : 'Sowing calendar'} ${months[locale.value][props.fixedMonth - 1]}` : de.value ? 'Aussaatkalender für Gemüse, Kräuter & Blumen' : 'Sowing calendar for vegetables, herbs & flowers')
const description = computed(() => de.value ? 'Plane dein Gartenjahr mit 30 Pflanzen: Vorziehen, Direktsaat, Auspflanzen und Ernte. Mit Pflanzplänen und kostenlosen PDFs.' : 'Plan your growing year with 30 plants: sowing, planting and harvesting. Explore growing plans and free printable PDFs.')
usePageSeo(title, description, !props.fixedMonth)
const monthName = computed(() => selectedMonth.value ? months[locale.value][selectedMonth.value - 1] : (de.value ? 'Dein ganzes Gartenjahr' : 'Your whole growing year'))
let pendingQuery: Record<string, any> | null = null
async function setFilter(key: string, value: string) {
  const query = { ...(pendingQuery || route.query), [key]: value || undefined }
  pendingQuery = query
  try { await router.replace({ query, hash: route.hash }) } finally { if (pendingQuery === query) pendingQuery = null }
}
function chooseMonth(month: number) {
  if (props.fixedMonth) return router.push(localPath(month ? monthPath(month, locale.value) : (de.value ? '/' : '/en')))
  setFilter('month', month ? String(month) : '')
}
function reset() {
  router.replace({ path: props.fixedMonth ? (de.value ? '/' : '/en') : route.path, query: embedded.value ? { embedded: '1' } : {}, hash: '#pflanzen' })
}
const currentMonth = ref(0)
onMounted(() => { currentMonth.value = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Europe/Berlin' }).format(new Date())) })
</script>

<template>
  <div class="calendar-page rail">
    <section class="hero" aria-labelledby="calendar-heading">
      <div class="hero-copy">
        <p class="eyebrow">{{ de ? 'Dein Jahr im Grünen' : 'Your year in green' }}</p>
        <h1 id="calendar-heading" v-if="!fixedMonth">{{ de ? 'Kleine Samen.' : 'Little seeds.' }}<br><em>{{ de ? 'Große Vorfreude.' : 'So much to grow.' }}</em></h1>
        <h1 id="calendar-heading" v-else>{{ de ? 'Dein Garten im' : 'Your garden in' }}<br><em>{{ months[locale][fixedMonth - 1] }}.</em></h1>
        <p class="hero-description">{{ de ? 'Was wächst wann? Finde den richtigen Moment zum Säen, Pflanzen und Ernten – und mach aus deinen Ideen ein Stück Grün.' : 'What grows when? Find the right time to sow, plant and harvest — and turn your ideas into something green.' }}</p>
        <a class="button" href="#pflanzen">{{ de ? 'Gartenjahr planen' : 'Plan your growing year' }} <span aria-hidden="true">↓</span></a>
        <p class="hero-note">{{ de ? '30 Pflanzen · 12 Monate · kostenlose Pflanzpläne' : '30 plants · 12 months · free growing plans' }}</p>
      </div>
      <figure class="hero-image">
        <img src="https://cdn.shopify.com/s/files/1/0949/8876/3521/articles/1789062835.jpg?width=1000" :alt="de ? 'Junge Keimlinge wachsen in einer Anzuchtschale' : 'Young seedlings growing in a seed tray'" width="1000" height="667" fetchpriority="high">
        <figcaption><span class="image-line" />{{ de ? 'Aus einem Anfang wird ein Garten.' : 'Every garden starts somewhere.' }}</figcaption>
      </figure>
    </section>

    <section id="pflanzen" class="planner" aria-labelledby="planner-heading">
      <div class="section-heading"><div><p class="eyebrow">{{ de ? 'Der Aussaatkalender' : 'The sowing calendar' }}</p><h2 id="planner-heading">{{ de ? 'Dein Plan. Deine Saison.' : 'Your plan. Your season.' }}</h2></div><button v-if="currentMonth" class="text-button" @click="chooseMonth(currentMonth)">{{ de ? 'Jetzt im' : 'This' }} {{ months[locale][currentMonth - 1] }} <span aria-hidden="true">→</span></button></div>
      <div class="month-picker" role="group" :aria-label="de ? 'Monat auswählen' : 'Choose a month'">
        <button :aria-pressed="selectedMonth === 0" @click="chooseMonth(0)"><span class="month-number">↻</span><span>{{ de ? 'Ganzjährig' : 'All year' }}</span></button>
        <button v-for="(month, i) in months[locale]" :key="i" :aria-label="month" :aria-pressed="selectedMonth === i + 1" @click="chooseMonth(i + 1)"><span class="month-number">{{ String(i + 1).padStart(2, '0') }}</span><span>{{ month.slice(0, 3) }}</span></button>
      </div>
      <div class="filter-row">
        <label class="search-field"><span class="sr-only">{{ de ? 'Pflanze suchen' : 'Search plants' }}</span><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m15 15 6 6" stroke="currentColor" stroke-width="1.5"/></svg><input :value="search" type="search" maxlength="80" :placeholder="de ? 'Welche Pflanze suchst du?' : 'Which plant are you looking for?'" @input="setFilter('q', ($event.target as HTMLInputElement).value)"></label>
        <label class="select-field"><span>{{ de ? 'Kategorie' : 'Category' }}</span><select :value="category" @change="setFilter('category', ($event.target as HTMLSelectElement).value)"><option value="">{{ de ? 'Alle Pflanzen' : 'All plants' }}</option><option v-for="cat in categories" :key="cat" :value="cat">{{ categoryLabels[locale][cat] }}</option></select></label>
        <label class="select-field"><span>{{ de ? 'Was möchtest du tun?' : 'What would you like to do?' }}</span><select :value="action" @change="setFilter('action', ($event.target as HTMLSelectElement).value)"><option value="">{{ de ? 'Alle Tätigkeiten' : 'All activities' }}</option><option v-for="phase in phases" :key="phase" :value="phase">{{ phase === 'harvest_or_flowering' ? (de ? 'Ernten / Blüte erleben' : 'Harvest / enjoy flowers') : phaseLabel(phase, locale) }}</option></select></label>
      </div>
      <div class="results-heading"><div><h3>{{ monthName }}</h3><p role="status" aria-live="polite">{{ filtered.length }} {{ de ? (filtered.length === 1 ? 'Pflanze passt zu deiner Auswahl' : 'Pflanzen passen zu deiner Auswahl') : (filtered.length === 1 ? 'plant matches your selection' : 'plants match your selection') }}</p></div><button v-if="selectedMonth || category || action || search" class="text-button" @click="reset">{{ de ? 'Filter zurücksetzen' : 'Reset filters' }} <span aria-hidden="true">↺</span></button></div>
      <div v-if="error" class="empty-state" role="alert"><h3>{{ de ? 'Der Kalender lädt gerade nicht.' : 'The calendar could not load.' }}</h3><p>{{ de ? 'Bitte versuche es noch einmal.' : 'Please try again.' }}</p><button class="button" @click="refresh()">{{ de ? 'Erneut laden' : 'Try again' }}</button></div>
      <div v-else-if="!filtered.length" class="empty-state"><h3>{{ de ? 'Ein guter Moment zum Neuplanen.' : 'A good moment for a new plan.' }}</h3><p>{{ de ? 'Für diese Kombination gibt es keinen Eintrag. Wähle einen anderen Monat oder zeige alle Pflanzen.' : 'No plants match these filters. Choose another month or explore all plants.' }}</p><button class="button" @click="reset">{{ de ? 'Alle Pflanzen entdecken' : 'Explore all plants' }}</button></div>
      <div v-else class="crop-grid"><CropCard v-for="crop in filtered" :key="crop.slug" :crop="crop" :month="selectedMonth" /></div>
      <div class="calendar-note"><span class="note-icon" aria-hidden="true">i</span><p>{{ de ? 'Dein Garten gibt den Takt vor. Die Zeitfenster sind Richtwerte für gemäßigtes Mitteleuropa. Sorte, Höhenlage, Bodenwärme und Wetter entscheiden mit. Beachte die Saatgutangaben und setze frostempfindliche Pflanzen erst nach den letzten örtlichen Frösten nach draußen. Ein Strich bedeutet: Diese Methode ist in diesem Pflanzplan nicht vorgesehen.' : 'Your garden sets the pace. These windows are approximate for temperate Central Europe. Variety, altitude, soil temperature and weather matter. Follow your seed packet and plant tender crops out only after local frost risk has passed. A dash means that method is not included in this growing plan.' }}</p></div>
    </section>

    <section class="growing-guide" aria-labelledby="guide-heading"><div><p class="eyebrow">{{ de ? 'Vom Plan zur ersten Pflanze' : 'From planning to planting' }}</p><h2 id="guide-heading">{{ de ? 'Alles beginnt mit' : 'It all starts with' }}<br><em>{{ de ? 'guten Wurzeln.' : 'healthy roots.' }}</em></h2><p>{{ de ? 'Der Kalender zeigt dir, wann es losgeht. In unseren Anzuchttipps liest du, worauf es bei Licht, Feuchtigkeit und dem passenden Substrat ankommt.' : 'The calendar shows you when to begin. Our growing guide explains light, moisture and choosing a suitable growing medium.' }}</p><a class="button" :href="shopLink('/blogs/leafers-nice2know-blog/anzucht-leicht-gemacht')" :target="embedded ? '_top' : undefined">{{ de ? 'Anzucht verstehen' : 'Explore the growing guide' }} →</a></div><div class="guide-steps"><div><span>01</span><h3>{{ de ? 'Deine Pflanze wählen' : 'Choose your plant' }}</h3><p>{{ de ? 'Finde den passenden Pflanzplan und lies die Kulturhinweise.' : 'Find a growing plan and read the cultivation notes.' }}</p></div><div><span>02</span><h3>{{ de ? 'Den Standort mitdenken' : 'Know your growing space' }}</h3><p>{{ de ? 'Licht, Wärme und Platz sind genauso wichtig wie der Monat.' : 'Light, warmth and space matter as much as the month.' }}</p></div><div><span>03</span><h3>{{ de ? 'Mit einem Plan starten' : 'Keep your plan close' }}</h3><p>{{ de ? 'Speichere dein kostenloses Pflanzen-PDF für die nächste Aussaat.' : 'Download your free plant PDF for the next sowing session.' }}</p></div></div></section>

    <section class="month-links" aria-labelledby="month-links-heading"><h2 id="month-links-heading">{{ de ? 'Monat für Monat ins Grüne.' : 'A growing year, month by month.' }}</h2><nav :aria-label="de ? 'Monatsübersichten' : 'Monthly growing guides'"><NuxtLink v-for="(month, i) in months[locale]" :key="i" :to="localPath(monthPath(i + 1, locale))">{{ month }} <span aria-hidden="true">→</span></NuxtLink></nav></section>
  </div>
</template>
