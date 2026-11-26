import type { MaybeRefOrGetter } from 'vue'
export function usePageSeo(title: MaybeRefOrGetter<string>, description: MaybeRefOrGetter<string>, root = false) {
  const route = useRoute()
  const config = useRuntimeConfig()
  const { locale, de, embedded, alternatePath } = useCalendar()
  const canonical = computed(() => root
    ? `${config.public.shopUrl}${de.value ? '' : '/en'}/pages/aussaatkalender`
    : `${config.public.siteUrl}${route.path}`)
  useSeoMeta({
    title: () => `${toValue(title)} | LEAFerservice`,
    description: () => toValue(description),
    ogTitle: () => toValue(title), ogDescription: () => toValue(description),
    ogType: 'website', ogUrl: () => canonical.value,
    ogImage: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/articles/1789062835.jpg?width=1200',
    twitterCard: 'summary_large_image',
    robots: () => embedded.value ? 'noindex,indexifembedded' : 'index,follow,max-image-preview:large',
  })
  useHead(() => ({ link: [
    { rel: 'canonical', href: canonical.value },
    { rel: 'alternate', hreflang: locale.value, href: canonical.value },
    { rel: 'alternate', hreflang: de.value ? 'en' : 'de', href: root
      ? `${config.public.shopUrl}${de.value ? '/en' : ''}/pages/aussaatkalender`
      : `${config.public.siteUrl}${alternatePath.value.split('?')[0]}` },
  ] }))
}
