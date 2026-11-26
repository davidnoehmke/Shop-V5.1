import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { getCrops } from '../../../utils/crops'
import { categoryLabels, months, phaseLabel, phases, monthRange, cropPath, type Locale } from '../../../../shared/calendar'

export default defineEventHandler(async event => {
  const slug = getRouterParam(event, 'slug') || ''
  if (!/^[a-z][a-z0-9-]{0,60}$/.test(slug)) throw createError({ statusCode: 404 })
  const lang = getQuery(event).lang
  if (lang !== undefined && lang !== 'de' && lang !== 'en') throw createError({ statusCode: 400, statusMessage: 'Unsupported language' })
  const locale: Locale = lang === 'en' ? 'en' : 'de'
  const de = locale === 'de'
  const crop = (await getCrops()).find(c => c.slug === slug)
  if (!crop) throw createError({ statusCode: 404 })
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
  const clean = (value: string) => value.replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\u202f|\u00a0/g, ' ').replace(/\u2192|\u2197|\u2193/g, '>').replace(/[^\u0009\u000a\u000d\u0020-\u007e\u00a0-\u00ff]/g, '')
  function newPage() {
    page = document.addPage([width, height])
    page.drawRectangle({ x: 0, y: height - 14, width, height: 14, color: olive })
    page.drawText('LEAFerservice', { x: margin, y: height - 49, size: 12, font: bold, color: olive })
    page.drawText(de ? 'DEIN JAHR IM GRÜNEN' : 'YOUR YEAR IN GREEN', { x: width - 200, y: height - 48, size: 8, font: regular, color: muted })
    y = height - 90
  }
  function line(text: string, size = 10, font: PDFFont = regular, gap = 15) {
    if (y < 70) newPage()
    page.drawText(clean(text), { x: margin, y, size, font, color: olive })
    y -= gap
  }
  function paragraph(text: string, size = 10, gap = 15, font: PDFFont = regular) {
    const words = clean(text).split(/\s+/)
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
  months[locale].forEach((month, i) => page!.drawText(clean(month.slice(0,3)), { x:margin+firstColumn+i*cellWidth+4, y:top-8, font:regular, size:7, color:muted }))
  phases.forEach((phase, row) => {
    const baseline=top-35-row*29
    page!.drawText(clean(phaseLabel(phase,locale,crop.timing.harvest_kind==='flowering')), { x:margin,y:baseline,size:9,font:regular,color:olive })
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
  paragraph(`${useRuntimeConfig().public.siteUrl}${cropPath(slug,locale)}`,8,11)
  const pages=document.getPages()
  pages.forEach((p,i)=>{
    p.drawLine({ start:{x:margin,y:48},end:{x:width-margin,y:48},color:rgb(.85,.85,.81),thickness:.5 })
    p.drawText(`leaferservice.com | ${de?'Stand':'Reviewed'} ${crop.updated_at.slice(0,10)}`,{x:margin,y:33,size:7,font:regular,color:muted})
    p.drawText(`${i+1} / ${pages.length}`,{x:width-margin-20,y:33,size:7,font:regular,color:muted})
  })
  const bytes=await document.save()
  setHeader(event,'Content-Type','application/pdf')
  setHeader(event,'Content-Disposition',`attachment; filename="leaferservice-${slug}-${locale}.pdf"`)
  setHeader(event,'Cache-Control','public, max-age=0, s-maxage=300')
  return Buffer.from(bytes)
})
