import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const port = Number(process.env.NATIVE_TEST_PORT || 3502)
const pages = JSON.parse(await readFile('.native-build/pages.json', 'utf8'))
const crops = JSON.parse(await readFile('.native-build/crops.json', 'utf8'))
createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`)
  if (url.pathname === '/health') return response.end('ok')
  if (url.pathname === '/rest/v1/grow_calendar_crops') {
    if (request.headers.apikey !== 'fixture-public-read' || url.searchParams.get('is_published') !== 'eq.true' || url.searchParams.get('review_status') !== 'eq.verified' || url.searchParams.get('select')?.includes('*')) { response.writeHead(400); return response.end('Invalid public query') }
    response.writeHead(200, { 'content-type': 'application/json' })
    return response.end(JSON.stringify(crops))
  }
  if (/^\/assets\/leaf-grow-calendar(?:-pdf|-data)?\.(?:js|css|json)$/.test(url.pathname)) {
    response.writeHead(200, { 'content-type': url.pathname.endsWith('.js') ? 'application/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'application/json' })
    return response.end(await readFile(resolve('../..', url.pathname.slice(1))))
  }
  const locale = url.pathname.startsWith('/en/') ? 'en' : 'de'
  const page = pages.find(item => url.pathname === `${locale === 'en' ? '/en' : ''}/pages/${item.handle}`)
  if (!page) { response.writeHead(404); return response.end('Not found') }
  const entry = page[locale]
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${entry.title}</title><meta name="description" content="${entry.description.replaceAll('"', '&quot;')}"><link rel="canonical" href="https://leaferservice.com${url.pathname}"><style>html{scroll-behavior:smooth;font-size:16px}body{margin:0;font:16px Arial;background:#f7f6ef}body>header{padding:28px 20px;border-bottom:1px solid #dce1d6}body>footer{padding:40px 20px}button{position:relative;text-transform:uppercase;letter-spacing:.1em}button:after{content:'';position:absolute;inset:0;box-shadow:0 0 0 1px}h1,h2{margin-block:1em}</style><link rel="stylesheet" href="/assets/leaf-grow-calendar.css"></head><body><header><a href="/">LEAFerservice</a> · Shopify</header><main><div data-grow-calendar-config data-supabase-url="http://127.0.0.1:${port}" data-publishable-key="fixture-public-read" data-snapshot-url="/assets/leaf-grow-calendar-data.json" data-pdf-url="/assets/leaf-grow-calendar-pdf.js" data-shop-url="https://leaferservice.com">${entry.body}</div></main><footer>LEAFerservice</footer><script defer src="/assets/leaf-grow-calendar.js"></script></body></html>`)
}).listen(port, '127.0.0.1')
