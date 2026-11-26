export default defineEventHandler(event => {
  setHeader(event,'Content-Type','text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${useRuntimeConfig().public.siteUrl}/sitemap.xml\n`
})
