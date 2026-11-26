<script setup lang="ts">
import { monthSlugs } from '../../../shared/calendar'
const month = computed(() => monthSlugs.indexOf(String(useRoute().params.month)) + 1)
if (!month.value) throw createError({ statusCode: 404 })
</script>
<template><CalendarView :fixed-month="month" /></template>
