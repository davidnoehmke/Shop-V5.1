<script setup lang="ts">
import { months } from '../../../../shared/calendar'
const month = computed(() => months.en.map(m => m.toLowerCase()).indexOf(String(useRoute().params.month)) + 1)
if (!month.value) throw createError({ statusCode: 404 })
</script>
<template><CalendarView :fixed-month="month" /></template>
