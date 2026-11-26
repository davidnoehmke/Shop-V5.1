import { cropPath, monthPath } from '../../shared/calendar'
import { getCrops } from '../utils/crops'
export default defineEventHandler(async event => {
  const base = useRuntimeConfig().public.siteUrl
  const crops = await getCrops()
  const paths = (['de','en'] as const).flatMap(locale => [
    ...crops.map(crop=>cropPath(crop.slug,locale)),
    ...Array.from({length:12},(_,i)=>monthPath(i+1,locale)),
  ])
  setHeader(event,'Content-Type','application/xml; charset=utf-8')
  setHeader(event,'Cache-Control','public, max-age=0, s-maxage=300')
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>`<url><loc>${base}${path}</loc></url>`).join('')+'</urlset>'
})
