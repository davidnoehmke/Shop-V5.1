import { build } from 'esbuild'
import postcss from 'postcss'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const app = fileURLToPath(new URL('..', import.meta.url))
const root = resolve(app, '../..')
const check = process.argv.includes('--check')
const artifacts = new Map()
const browser = { bundle: true, minify: true, target: ['es2020'], platform: 'browser', sourcemap: false, write: false, logLevel: 'warning', absWorkingDir: app }
for (const [entry, filename, format] of [['native/calendar.ts', 'leaf-grow-calendar.js', 'iife'], ['native/pdf.ts', 'leaf-grow-calendar-pdf.js', 'esm']]) {
  const result = await build({ ...browser, entryPoints: [entry], format })
  artifacts.set(filename, result.outputFiles[0].text)
}

// Scope the existing, approved visual design; no global theme selectors survive.
const css = postcss.parse(await readFile(resolve(app, 'app/assets/css/main.css'), 'utf8'))
css.walkRules(rule => {
  const selectors = rule.selectors.filter(selector => !/\.site-header|\.site-footer|\.brand|\.language|\.skip-link|\.embedded/.test(selector))
  if (!selectors.length) { rule.remove(); return }
  rule.selectors = selectors.map(selector => {
    const native = selector.replaceAll('.month-picker button', '.month-picker a').replaceAll('aria-pressed', 'aria-current')
    return /^(?::root|body)$/.test(native) ? 'leaf-grow-calendar' : `leaf-grow-calendar ${native}`
  })
})
const nativeCss = css.toString() + `
leaf-grow-calendar{display:block;min-width:0;isolation:isolate}
leaf-grow-calendar [hidden]{display:none!important}
leaf-grow-calendar .month-picker a{text-decoration:none}
leaf-grow-calendar .button{position:static;box-shadow:none;text-transform:none;letter-spacing:normal}
leaf-grow-calendar .button:before,leaf-grow-calendar .button:after{content:none}
leaf-grow-calendar button:before,leaf-grow-calendar button:after{content:none;box-shadow:none}
leaf-grow-calendar button{margin:0;box-shadow:none;text-transform:none;letter-spacing:normal}
leaf-grow-calendar input,leaf-grow-calendar select{box-shadow:none;border-radius:0}
leaf-grow-calendar h1,leaf-grow-calendar h2,leaf-grow-calendar h3{color:var(--olive);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;text-transform:none}
leaf-grow-calendar .planner{scroll-margin-top:150px}
leaf-grow-calendar .native-data-status{padding-block:16px;background:#eeeede;font-size:.85rem}
leaf-grow-calendar .native-data-status p{margin-bottom:0}
leaf-grow-calendar [data-pdf-ready]{display:block;min-height:44px;line-height:1.5;padding-block:12px}
leaf-grow-calendar [data-pdf-message]:empty{display:none}
leaf-grow-calendar .filter-row [data-filter]{min-height:44px}
@media(max-width:480px){leaf-grow-calendar .rail{padding-inline:20px}}
`
const transformed = await build({ stdin: { contents: nativeCss, loader: 'css' }, minify: true, write: false })
artifacts.set('leaf-grow-calendar.css', transformed.outputFiles[0].text)

await mkdir(resolve(app, '.native-build'), { recursive: true })
await build({ entryPoints: ['native/render.ts', 'shared/calendar.ts'], outdir: '.native-build', absWorkingDir: app, bundle: true, platform: 'node', format: 'esm', target: 'node24', outExtension: { '.js': '.mjs' } })
const { safeCrop } = await import(resolve(app, '.native-build/shared/calendar.mjs'))
const { renderPage, pageHandle, pageMetadata } = await import(resolve(app, '.native-build/native/render.mjs'))
const reviewed = JSON.parse(await readFile(resolve(app, 'deployment/reviewed-crops.json'), 'utf8'))
const crops = reviewed.map(safeCrop)
if (crops.length !== 30 || crops.some(crop => !crop)) throw new Error('Expected 30 reviewed public crop records')
artifacts.set('leaf-grow-calendar-data.json', JSON.stringify(crops) + '\n')
const views = [{ kind: 'calendar' }, ...crops.map(crop => ({ kind: 'plant', slug: crop.slug })), ...Array.from({ length: 12 }, (_, index) => ({ kind: 'month', month: index + 1 }))]
const pages = views.map(view => ({ handle: pageHandle(view), view, de: { ...pageMetadata(crops, 'de', view), body: renderPage(crops, 'de', view) }, en: { ...pageMetadata(crops, 'en', view), body: renderPage(crops, 'en', view) } }))
await writeFile(resolve(app, '.native-build/pages.json'), JSON.stringify(pages))
await writeFile(resolve(app, '.native-build/crops.json'), JSON.stringify(crops))
for (const [filename, contents] of artifacts) {
  const path = resolve(root, 'assets', filename)
  if (check) {
    if (await readFile(path, 'utf8') !== contents) throw new Error(`Generated Shopify asset is stale: ${filename}`)
  } else await writeFile(path, contents)
  console.log(`${check ? 'Verified' : 'Built'} ${filename}: ${Buffer.byteLength(contents)} bytes`)
}
console.log(`Rendered ${pages.length} Shopify pages in DE/EN; maximum body: ${Math.max(...pages.flatMap(page => [page.de.body.length, page.en.body.length]))} characters`)
