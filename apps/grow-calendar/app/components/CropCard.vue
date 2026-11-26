<script setup lang="ts">
import { categoryLabels, cropPath, monthRange, phaseLabel, phases, type Crop } from '../../shared/calendar'
defineProps<{ crop: Crop; month: number }>()
const { locale, de, localPath } = useCalendar()
</script>
<template>
  <article class="crop-card" :data-crop="crop.slug">
    <div class="crop-heading">
      <div><p class="crop-category">{{ categoryLabels[locale][crop.category] }}</p><h3><NuxtLink :to="localPath(cropPath(crop.slug, locale))">{{ crop.names[locale] }}</NuxtLink></h3></div>
      <svg class="crop-symbol" :class="crop.category" viewBox="0 0 48 48" aria-hidden="true">
        <template v-if="crop.category === 'vegetables'"><path d="M23 17C14 12 8 19 10 29s10 13 14 8c4 5 12 2 14-8s-4-17-13-12M24 17l-4-7m4 7 6-9m-6 9 8-2" /></template>
        <template v-else-if="crop.category === 'herbs'"><path d="M12 39 34 8M21 27C9 28 9 18 10 14c10-1 14 5 11 13m7-11c-1-9 5-12 13-12 1 8-4 14-13 12M16 34c12 3 18-3 18-10-10-2-17 2-18 10" /></template>
        <template v-else-if="crop.category === 'flowers'"><circle cx="24" cy="22" r="5"/><path d="M20 16c-10-14 19-14 8 0m1 2c17-5 17 17 2 10m-2 2c5 16-17 16-11 0m-2-3C1 32 2 10 18 17m6 13v14m0-4c4-7 8-6 11-6" /></template>
        <template v-else><path d="M23 17c-7-8-16 0-13 10 3 12 11 14 14 9 4 5 11 1 14-9 3-10-6-18-14-10Zm1 0c-4-9 1-12 8-12 1 7-1 11-8 12Z" /></template>
      </svg>
    </div>
    <dl class="crop-periods">
      <div v-for="phase in phases" :key="phase" :class="{ 'current-phase': month && crop.timing[phase].includes(month) }">
        <dt><span class="phase-dot" :class="phase" />{{ phaseLabel(phase, locale, crop.timing.harvest_kind === 'flowering') }}</dt>
        <dd>{{ monthRange(crop.timing[phase], locale) }}<span v-if="month && crop.timing[phase].includes(month)" class="sr-only">{{ de ? ', im ausgewählten Monat' : ', in selected month' }}</span></dd>
      </div>
    </dl>
    <NuxtLink class="card-link" :to="localPath(cropPath(crop.slug, locale))">{{ de ? 'Dein Pflanzplan' : 'Your growing plan' }}<span aria-hidden="true">↗</span></NuxtLink>
  </article>
</template>
