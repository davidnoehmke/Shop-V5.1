import { cropPath, monthPath, months, monthSlugs, type Locale } from '../../shared/calendar'

export function useCalendar() {
  const route = useRoute()
  const config = useRuntimeConfig()
  const locale = computed<Locale>(() => route.path === '/en' || route.path.startsWith('/en/') ? 'en' : 'de')
  const de = computed(() => locale.value === 'de')
  const embedded = computed(() => route.query.embedded === '1')
  const localPath = (path: string) => embedded.value ? `${path}?embedded=1` : path
  const homePath = computed(() => localPath(de.value ? '/' : '/en'))
  const shopLink = (path = '/') => `${config.public.shopUrl}${de.value ? '' : '/en'}${path}`
  const alternatePath = computed(() => {
    const next: Locale = de.value ? 'en' : 'de'
    if (route.params.slug) return localPath(cropPath(String(route.params.slug), next))
    if (route.params.month) {
      const value = String(route.params.month)
      const number = de.value ? monthSlugs.indexOf(value) + 1 : months.en.map(m => m.toLowerCase()).indexOf(value) + 1
      if (number) return localPath(monthPath(number, next))
    }
    return localPath(de.value ? '/en' : '/')
  })
  return { locale, de, embedded, localPath, homePath, shopLink, alternatePath }
}
