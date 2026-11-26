export type Locale = 'de' | 'en'
export type Category = 'vegetables' | 'herbs' | 'flowers' | 'fruit'
export type Phase = 'start_indoor' | 'sow_outdoors' | 'transplant_outdoors' | 'harvest_or_flowering'
export interface SourceRef { title: string; url: string; publisher: string; accessed_on?: string }
export interface Crop {
  slug: string
  names: Record<Locale, string>
  category: Category
  timing: Record<Phase, number[]> & {
    climate: 'temperate-central-europe'
    approximate: true
    harvest_kind: 'harvest' | 'flowering'
    botanical_name?: string
  }
  cultivation_note_de: string
  cultivation_note_en: string
  source_refs: SourceRef[]
  updated_at: string
}
export const phases: Phase[] = ['start_indoor', 'sow_outdoors', 'transplant_outdoors', 'harvest_or_flowering']
export const categories: Category[] = ['vegetables', 'herbs', 'flowers', 'fruit']
export const months = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
export const monthSlugs = ['januar', 'februar', 'maerz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember']
export const categoryLabels: Record<Locale, Record<Category, string>> = {
  de: { vegetables: 'Gemüse', herbs: 'Kräuter', flowers: 'Blumen', fruit: 'Obst' },
  en: { vegetables: 'Vegetables', herbs: 'Herbs', flowers: 'Flowers', fruit: 'Fruit' },
}
export function phaseLabel(phase: Phase, locale: Locale, flowering = false): string {
  const labels = locale === 'de'
    ? ['Vorziehen', 'Direktsaat', 'Auspflanzen', flowering ? 'Blüte' : 'Ernte']
    : ['Start under cover', 'Direct sow', 'Plant out', flowering ? 'Flowering' : 'Harvest']
  return labels[phases.indexOf(phase)]!
}
export function parseMonth(value: unknown): number {
  if (typeof value !== 'string' || !/^(?:[1-9]|1[0-2])$/.test(value)) return 0
  return Number(value)
}
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
export function filterCrops(crops: Crop[], options: { month: number; category: string; search: string; phase?: string }): Crop[] {
  const query = normalizeSearch(options.search)
  return crops.filter(crop => {
    const activePhases = phases.includes(options.phase as Phase) ? [options.phase as Phase] : phases
    return (!options.category || crop.category === options.category)
      && (!query || normalizeSearch(`${crop.names.de} ${crop.names.en}`).includes(query))
      && (!options.month || activePhases.some(phase => crop.timing[phase].includes(options.month)))
      && (!options.phase || activePhases.some(phase => crop.timing[phase].length > 0))
  })
}
export function monthRange(values: number[], locale: Locale): string {
  if (!values.length) return '—'
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  const groups: number[][] = []
  for (const month of sorted) {
    const group = groups.at(-1)
    if (group && group.at(-1)! + 1 === month) group.push(month)
    else groups.push([month])
  }
  return groups.map(group => {
    const first = months[locale][group[0]! - 1]!.slice(0, 3)
    return group.length > 1 ? `${first}–${months[locale][group.at(-1)! - 1]!.slice(0, 3)}` : first
  }).join(', ')
}
export function cropPath(slug: string, locale: Locale): string {
  return locale === 'de' ? `/pflanzen/${slug}` : `/en/plants/${slug}`
}
export function monthPath(month: number, locale: Locale): string {
  return locale === 'de' ? `/monate/${monthSlugs[month - 1]}` : `/en/months/${months.en[month - 1]!.toLowerCase()}`
}
export function safeCrop(raw: unknown): Crop | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, any>
  if (!/^[a-z][a-z0-9-]{0,60}$/.test(c.slug ?? '') || !categories.includes(c.category)) return null
  if (typeof c.names?.de !== 'string' || typeof c.names?.en !== 'string') return null
  if (!c.timing || c.timing.climate !== 'temperate-central-europe' || c.timing.approximate !== true) return null
  if (!['harvest', 'flowering'].includes(c.timing.harvest_kind)) return null
  for (const phase of phases) {
    if (!Array.isArray(c.timing[phase]) || c.timing[phase].some((n: unknown) => !Number.isInteger(n) || Number(n) < 1 || Number(n) > 12)) return null
  }
  if (typeof c.cultivation_note_de !== 'string' || typeof c.cultivation_note_en !== 'string') return null
  if (!Array.isArray(c.source_refs) || !c.source_refs.length) return null
  const sources = c.source_refs.filter((s: any) => {
    try { return typeof s.title === 'string' && typeof s.publisher === 'string' && new URL(s.url).protocol === 'https:' } catch { return false }
  }).map((s: any) => ({ title: s.title, publisher: s.publisher, url: s.url, accessed_on: s.accessed_on }))
  if (!sources.length) return null
  return {
    slug: c.slug, names: { de: c.names.de, en: c.names.en }, category: c.category,
    timing: {
      start_indoor: c.timing.start_indoor, sow_outdoors: c.timing.sow_outdoors,
      transplant_outdoors: c.timing.transplant_outdoors, harvest_or_flowering: c.timing.harvest_or_flowering,
      climate: 'temperate-central-europe', approximate: true, harvest_kind: c.timing.harvest_kind,
      ...(typeof c.timing.botanical_name === 'string' ? { botanical_name: c.timing.botanical_name } : {}),
    },
    cultivation_note_de: c.cultivation_note_de, cultivation_note_en: c.cultivation_note_en,
    source_refs: sources, updated_at: typeof c.updated_at === 'string' ? c.updated_at : '',
  }
}
