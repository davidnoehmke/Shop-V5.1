/**
 * Browser-only PDF entry point. Bundle this file INCLUDING pdf-lib as a single
 * Shopify theme asset, then dynamically import that explicit asset URL.
 * Never import this entry point statically from the initial calendar bundle.
 * Data is supplied by the calendar's existing validated Supabase read path.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type Locale = 'de' | 'en'
export type Category = 'vegetables' | 'herbs' | 'flowers' | 'fruit'
export type Phase = 'start_indoor' | 'sow_outdoors' | 'transplant_outdoors' | 'harvest_or_flowering'
export interface PdfCrop {
  readonly slug: string
  readonly names: Readonly<Record<Locale, string>>
  readonly category: Category
  readonly timing: Readonly<Record<Phase, readonly number[]>> & { readonly harvest_kind: 'harvest' | 'flowering' }
  readonly cultivation_note_de: string
  readonly cultivation_note_en: string
  readonly source_refs: readonly { readonly title: string; readonly url: string; readonly publisher: string }[]
  readonly updated_at: string
}
export interface PdfOptions {
  /** Absolute native Shopify detail URL, supplied by the component's router. */
  readonly detailUrl: string
}
export interface PreparedPdfDownload {
  readonly blob: Blob
  readonly url: string
  readonly filename: string
  /** Starts a download attempt; browsers may choose their PDF viewer instead. */
  download(): void
  /** Revoke only after every visible fallback link using this URL is removed. */
  dispose(): void
}

const phases: readonly Phase[] = ['start_indoor', 'sow_outdoors', 'transplant_outdoors', 'harvest_or_flowering']
const months: Record<Locale, readonly string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
const categoryLabels: Record<Locale, Record<Category, string>> = {
  de: { vegetables: 'Gemüse', herbs: 'Kräuter', flowers: 'Blumen', fruit: 'Obst' },
  en: { vegetables: 'Vegetables', herbs: 'Herbs', flowers: 'Flowers', fruit: 'Fruit' },
}

function phaseLabel(phase: Phase, locale: Locale, flowering = false): string {
  const labels = locale === 'de'
    ? ['Vorziehen', 'Direktsaat', 'Auspflanzen', flowering ? 'Blüte' : 'Ernte']
    : ['Start under cover', 'Direct sow', 'Plant out', flowering ? 'Flowering' : 'Harvest']
  return labels[phases.indexOf(phase)]!
}

function monthRange(values: readonly number[], locale: Locale): string {
  if (!values.length) return '—'
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  const groups: number[][] = []
  for (const month of sorted) {
    const group = groups[groups.length - 1]
    if (group && group[group.length - 1]! + 1 === month) group.push(month)
    else groups.push([month])
  }
  return groups.map(group => {
    const first = months[locale][group[0]! - 1]!.slice(0, 3)
    return group.length > 1 ? `${first}–${months[locale][group[group.length - 1]! - 1]!.slice(0, 3)}` : first
  }).join(', ')
}

/** Same WinAnsi/Helvetica text cleanup as the former Nuxt PDF route. */
export function cleanPdfText(value: string): string {
  return value.replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\u202f|\u00a0/g, ' ').replace(/\u2192|\u2197|\u2193/g, '>').replace(/[^\u0009\u000a\u000d\u0020-\u007e\u00a0-\u00ff]/g, '')
}

/** Pure renderer: no fetch, DOM, Node, Nuxt, environment variables or credentials. */
export async function createCropPdf(crop: PdfCrop, locale: Locale, options: PdfOptions): Promise<Uint8Array> {
  if (locale !== 'de' && locale !== 'en') throw new TypeError('Unsupported PDF language')
  if (!/^[a-z][a-z0-9-]{0,60}$/.test(crop.slug)) throw new TypeError('Invalid crop slug')
  const detailUrl = new URL(options.detailUrl)
  if (detailUrl.protocol !== 'https:') throw new TypeError('The growing plan requires an HTTPS detail URL')
  const de = locale === 'de'
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const olive = rgb(.27, .30, .24), muted = rgb(.40, .43, .37), cream = rgb(.96, .94, .90)
  const colors = [rgb(.69,.44,.32),rgb(.45,.53,.42),rgb(.22,.36,.29),rgb(.74,.58,.25)]
  document.setTitle(`${crop.names[locale]} - ${de ? 'Pflanzplan' : 'Growing plan'} | LEAFerservice`)
  document.setAuthor('LEAFerservice')
  document.setSubject(de ? 'Anbaukalender mit Kulturhinweisen und Fachquellen' : 'Growing calendar with cultivation notes and sources')
  document.setLanguage(locale)
  let page: PDFPage
  let y = 0
  const width = 595.28, height = 841.89, margin = 44, contentWidth = width - margin * 2
  function newPage() {
    page = document.addPage([width, height])
    page.drawRectangle({ x: 0, y: height - 14, width, height: 14, color: olive })
    page.drawText('LEAFerservice', { x: margin, y: height - 49, size: 12, font: bold, color: olive })
    page.drawText(de ? 'DEIN JAHR IM GRÜNEN' : 'YOUR YEAR IN GREEN', { x: width - 200, y: height - 48, size: 8, font: regular, color: muted })
    y = height - 90
  }
  function line(text: string, size = 10, font: PDFFont = regular, gap = 15) {
    if (y < 70) newPage()
    page.drawText(cleanPdfText(text), { x: margin, y, size, font, color: olive })
    y -= gap
  }
  function paragraph(text: string, size = 10, gap = 15, font: PDFFont = regular) {
    const words = cleanPdfText(text).split(/\s+/)
    let current = ''
    for (const word of words) {
      if (font.widthOfTextAtSize(word, size) > contentWidth) {
        if (current) { line(current,size,font,gap); current='' }
        let part = ''
        for (const char of word) {
          if (font.widthOfTextAtSize(part + char,size)>contentWidth) { line(part,size,font,gap);part='' }
          part += char
        }
        current = part
      } else if (font.widthOfTextAtSize(current ? `${current} ${word}` : word, size) > contentWidth) {
        line(current, size, font, gap); current = word
      } else current += `${current ? ' ' : ''}${word}`
    }
    if (current) line(current, size, font, gap)
    y -= 8
  }
  newPage()
  line(crop.names[locale], 34, bold, 39)
  line(`${categoryLabels[locale][crop.category]} | ${de ? 'Dein Pflanzplan' : 'Your growing plan'}`,11,regular,25)
  const top = y
  const firstColumn = 125, cellWidth = (contentWidth-firstColumn)/12
  page!.drawRectangle({ x: margin-8, y: top-164, width:contentWidth+16, height:180, color:cream })
  months[locale].forEach((month, i) => page!.drawText(cleanPdfText(month.slice(0,3)), { x:margin+firstColumn+i*cellWidth+4, y:top-8, font:regular, size:7, color:muted }))
  phases.forEach((phase, row) => {
    const baseline=top-35-row*29
    page!.drawText(cleanPdfText(phaseLabel(phase,locale,crop.timing.harvest_kind==='flowering')), { x:margin,y:baseline,size:9,font:regular,color:olive })
    for(let month=1;month<=12;month++) {
      const active=crop.timing[phase].includes(month)
      page!.drawRectangle({ x:margin+firstColumn+(month-1)*cellWidth+3,y:baseline-2,width:cellWidth-6,height:13,color:active?colors[row]!:rgb(.87,.87,.82) })
      if(active) page!.drawText(String(month), { x:margin+firstColumn+(month-1)*cellWidth+11-(month>=10?2:0),y:baseline+1,size:6.5,font:bold,color:rgb(1,1,1) })
    }
  })
  y=top-190
  for(const phase of phases) line(`${phaseLabel(phase,locale,crop.timing.harvest_kind==='flowering')}: ${monthRange(crop.timing[phase],locale)}`,9,regular,14)
  y-=14
  line(de ? 'So gelingt dein Start' : 'Give your plants a good start',15,bold,23)
  paragraph(de ? crop.cultivation_note_de : crop.cultivation_note_en)
  paragraph(de ? 'Richtwerte für gemäßigtes Mitteleuropa. Sorte, Standort, Bodenwärme und Wetter bestimmen den tatsächlichen Termin. Die Saatgutanleitung hat Vorrang. Frostempfindliche Pflanzen erst nach den letzten örtlichen Frösten auspflanzen. Ein Strich bedeutet: Diese Methode ist hier nicht vorgesehen. Bei Blumen ist die letzte Phase die Blüte.' : 'Approximate windows for temperate Central Europe. Variety, location, soil temperature and weather determine actual timing. Follow your seed packet. Plant tender crops out after local frost risk has passed. A dash means this method is not included. For flowers, the final phase is flowering.',8.5,12)
  y-=4
  if(y<170)newPage()
  line(de ? 'Fachquellen & aktueller Pflanzplan' : 'Sources & current growing plan',12,bold,20)
  for(const source of crop.source_refs) {
    paragraph(`${source.publisher}: ${source.title}`,8,11,bold)
    paragraph(source.url,7,10)
  }
  paragraph(detailUrl.href,8,11)
  const pages=document.getPages()
  pages.forEach((p,i)=>{
    p.drawLine({ start:{x:margin,y:48},end:{x:width-margin,y:48},color:rgb(.85,.85,.81),thickness:.5 })
    p.drawText(`leaferservice.com | ${de?'Stand':'Reviewed'} ${crop.updated_at.slice(0,10)}`,{x:margin,y:33,size:7,font:regular,color:muted})
    p.drawText(`${i+1} / ${pages.length}`,{x:width-margin-20,y:33,size:7,font:regular,color:muted})
  })
  return document.save()
}

/** Explicit ArrayBuffer copy avoids TS 5.9's Uint8Array<ArrayBufferLike>/BlobPart mismatch. */
export function cropPdfBlob(bytes: Uint8Array): Blob {
  const data = new Uint8Array(bytes.byteLength)
  data.set(bytes)
  return new Blob([data.buffer], { type: 'application/pdf' })
}

/**
 * Call ONLY inside the PDF button's click workflow, after the asset was loaded.
 * Before calling download(), expose url as a normal visible anchor with a
 * localized label. A real second tap then works even if automatic downloading
 * was ignored; Safari/iOS can show its PDF viewer and the native Save/Share UI.
 * Retain the Blob URL while this fallback is visible. No immediate revocation.
 */
export async function prepareCropPdfDownload(crop: PdfCrop, locale: Locale, options: PdfOptions): Promise<PreparedPdfDownload> {
  const bytes = await createCropPdf(crop, locale, options)
  const blob = cropPdfBlob(bytes)
  const url = URL.createObjectURL(blob)
  const filename = `leaferservice-${crop.slug}-${locale}.pdf`
  let disposed = false
  return {
    blob, url, filename,
    download() {
      if (disposed) throw new Error('PDF download URL has been disposed')
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.hidden = true
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
    },
    dispose() {
      if (!disposed) URL.revokeObjectURL(url)
      disposed = true
    },
  }
}
