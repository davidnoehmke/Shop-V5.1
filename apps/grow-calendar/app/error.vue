<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const de = !useRoute().path.startsWith('/en')
const embedded = useRoute().query.embedded === '1'
useEmbedBridge()
useHead({ title: de ? 'Kalender | LEAFerservice' : 'Calendar | LEAFerservice', meta: [{ name: 'robots', content: 'noindex' }] })
</script>
<template>
  <main id="calendar-app" class="rail error-page">
    <p class="eyebrow">LEAFerservice</p>
    <h1>{{ error.statusCode === 404 ? (de ? 'Hier wächst noch nichts.' : 'Nothing growing here yet.') : (de ? 'Ein kleiner Moment Geduld.' : 'A little patience, please.') }}</h1>
    <p>{{ error.statusCode === 404 ? (de ? 'Diese Seite gibt es nicht. Im Kalender findest du alle Pflanzen.' : 'This page does not exist. Find all plants in the calendar.') : (de ? 'Die Pflanzpläne können gerade nicht geladen werden. Bitte versuche es gleich noch einmal.' : 'Plant plans are temporarily unavailable. Please try again shortly.') }}</p>
    <a class="button" :href="`${de ? '/' : '/en'}${embedded ? '?embedded=1' : ''}`">{{ de ? 'Zum Kalender' : 'Back to calendar' }} →</a>
  </main>
</template>
