export default defineNuxtConfig({
  compatibilityDate: '2026-11-26',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  runtimeConfig: {
    supabaseUrl: '',
    supabasePublishableKey: '',
    public: {
      siteUrl: 'https://leaferservice-grow-calendar.vercel.app',
      shopUrl: 'https://leaferservice.com',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      meta: [{ name: 'theme-color', content: '#F5F0E6' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "frame-ancestors 'self' https://leaferservice.com https://www.leaferservice.com; object-src 'none'; base-uri 'self'",
      },
    },
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex' } },
  },
})
