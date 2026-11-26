import { safeCrop, type Crop } from '../../shared/calendar'

export const getCrops = defineCachedFunction(async (): Promise<Crop[]> => {
  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw createError({ statusCode: 503, statusMessage: 'Calendar is temporarily unavailable' })
  }
  try {
    const rows = await $fetch<unknown[]>(`${config.supabaseUrl}/rest/v1/grow_calendar_crops`, {
      headers: { apikey: config.supabasePublishableKey },
      query: {
        select: 'slug,names,category,timing,cultivation_note_de,cultivation_note_en,source_refs,updated_at',
        is_published: 'eq.true', review_status: 'eq.verified', order: 'slug.asc', limit: 100,
      },
      timeout: 8000, retry: 1,
    })
    const crops = rows.map(safeCrop).filter((crop): crop is Crop => crop !== null)
    if (!crops.length || crops.length !== rows.length) throw new Error('Invalid published calendar data')
    return crops
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Calendar is temporarily unavailable' })
  }
}, { maxAge: 300, swr: false, name: 'grow-calendar-crops-v1', getKey: () => 'published' })
