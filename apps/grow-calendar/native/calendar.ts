import { categories, monthSlugs, months, parseMonth, phases, safeCrop, type Crop, type Locale } from '../shared/calendar'
import { emptyFilters, pagePath, renderPlant, renderResults, resultCount, scopeClasses, selectedCrops, type Filters, type View } from './render'
import type { PreparedPdfDownload } from './pdf'

const PUBLIC_FIELDS = 'slug,names,category,timing,cultivation_note_de,cultivation_note_en,source_refs,updated_at'
type PdfModule = typeof import('./pdf')

class LeafGrowCalendar extends HTMLElement {
  private locale: Locale = 'de'
  private crops: Crop[] = []
  private filters: Filters = { ...emptyFilters }
  private controller?: AbortController
  private request?: AbortController
  private config?: HTMLElement
  private ready = false
  private loading = false
  private pdfLoading = false
  private pdfModule?: Promise<PdfModule>
  private pdfAttempts = 0
  private preparedPdf?: PreparedPdfDownload
  private announceFrame = 0

  connectedCallback() {
    if (this.controller) return
    this.id = 'leaf-grow-calendar'
    // Upgrade the one transitional page without exposing generic theme classes.
    this.querySelectorAll<HTMLElement>('[class]').forEach(element => {
      element.setAttribute('class', [...element.classList].map(name => name.startsWith('leaf-gc-') ? name : `leaf-gc-${name}`).join(' '))
    })
    this.locale = this.dataset.locale === 'en' ? 'en' : 'de'
    this.config = this.closest<HTMLElement>('[data-grow-calendar-config]') || undefined
    this.controller = new AbortController()
    const options = { signal: this.controller.signal }
    this.addEventListener('click', this.onClick, options)
    this.addEventListener('input', this.onInput, options)
    this.addEventListener('change', this.onChange, options)
    window.addEventListener('popstate', this.onNavigation, options)
    window.addEventListener('hashchange', this.onNavigation, options)
    // Old #maerz links must select the planner, not scroll to the footer index.
    this.querySelectorAll('.leaf-gc-month-links a[id]').forEach(link => link.removeAttribute('id'))
    this.readFilters()
    try {
      const raw: unknown = JSON.parse(this.config?.querySelector('[data-grow-calendar-snapshot]')?.textContent || 'null')
      if (!Array.isArray(raw)) throw new Error('Missing reviewed snapshot')
      const crops = raw.map(safeCrop)
      if (!crops.length || crops.some(crop => !crop)) throw new Error('Invalid reviewed snapshot')
      this.crops = crops as Crop[]
      this.applyData(true, true)
    } catch { /* Existing Shopify HTML remains useful if bootstrap data is unavailable. */ }
    void this.loadData()
  }
  disconnectedCallback() {
    this.controller?.abort()
    this.request?.abort()
    this.controller = undefined
    cancelAnimationFrame(this.announceFrame)
    this.preparedPdf?.dispose()
  }
  private text(de: string, en: string) { return this.locale === 'de' ? de : en }
  private view(): View {
    if (this.dataset.view === 'plant') return { kind: 'plant', slug: this.dataset.slug || '' }
    if (this.dataset.view === 'month') return { kind: 'month', month: parseMonth(this.dataset.month) }
    return { kind: 'calendar' }
  }
  private readFilters() {
    const url = new URL(location.href)
    const legacyMonth = monthSlugs.indexOf(url.hash.slice(1).toLowerCase()) + 1
    const category = url.searchParams.get('category') || ''
    const phase = url.searchParams.get('action') || ''
    this.filters = {
      month: this.dataset.view === 'month' ? parseMonth(this.dataset.month) : url.searchParams.has('month') ? parseMonth(url.searchParams.get('month')) : legacyMonth,
      category: categories.includes(category as any) ? category : '',
      phase: phases.includes(phase as any) ? phase : '',
      search: (url.searchParams.get('q') || '').slice(0, 80),
    }
  }
  private onNavigation = () => {
    this.readFilters()
    if (this.ready && this.view().kind !== 'plant') this.updateResults(true)
    if (monthSlugs.includes(location.hash.slice(1))) this.revealPlanner()
  }
  private updateUrl(replace = false) {
    const url = new URL(location.href)
    for (const [key, value] of Object.entries({ month: this.filters.month ? String(this.filters.month) : '', category: this.filters.category, action: this.filters.phase, q: this.filters.search })) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    if (monthSlugs.includes(url.hash.slice(1))) url.hash = 'pflanzen'
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url)
  }
  private onInput = (event: Event) => {
    const input = event.target
    if (!this.ready || !(input instanceof HTMLInputElement) || input.dataset.filter !== 'search') return
    this.filters.search = input.value.slice(0, 80)
    this.updateUrl(true)
    this.updateResults(true)
  }
  private onChange = (event: Event) => {
    const input = event.target
    if (!this.ready || !(input instanceof HTMLSelectElement)) return
    if (input.dataset.filter === 'category') this.filters.category = categories.includes(input.value as any) ? input.value : ''
    else if (input.dataset.filter === 'phase') this.filters.phase = phases.includes(input.value as any) ? input.value : ''
    else return
    this.updateUrl()
    this.updateResults(true)
  }
  private onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null
    if (!target || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (target.closest('[data-retry]')) { void this.loadData(); return }
    if (target.closest('[data-pdf]')) { void this.downloadPdf(); return }
    if (!this.ready || this.view().kind === 'plant') return
    const monthLink = target.closest<HTMLAnchorElement>('.leaf-gc-month-picker a[data-month]')
    const reset = target.closest('[data-reset]')
    const current = target.closest('[data-current-month]')
    if (!monthLink && !reset && !current) return
    if (this.view().kind === 'month') {
      if (monthLink) return // Real, crawlable month pages keep their own title and canonical.
      location.assign(`${pagePath(current ? { kind: 'month', month: this.currentMonth() } : { kind: 'calendar' }, this.locale)}#pflanzen`)
      return
    }
    event.preventDefault()
    if (reset) this.filters = { ...emptyFilters }
    else this.filters.month = current ? this.currentMonth() : parseMonth(monthLink?.dataset.month)
    this.updateUrl()
    this.updateResults(true)
    if (reset) this.querySelector<HTMLInputElement>('[data-filter="search"]')?.focus({ preventScroll: true })
  }
  private currentMonth() { return Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Europe/Berlin' }).format(new Date())) }
  private announce(message: string) {
    const region = this.querySelector<HTMLElement>('[data-announcer]')
    if (!region) return
    cancelAnimationFrame(this.announceFrame)
    region.textContent = ''
    this.announceFrame = requestAnimationFrame(() => { region.textContent = message })
  }
  private revealPlanner() {
    requestAnimationFrame(() => this.querySelector('#pflanzen')?.scrollIntoView({ block: 'start', behavior: 'instant' }))
  }
  private updateResults(announce = false) {
    const results = this.querySelector<HTMLElement>('[data-results]')
    if (!results) return
    const html = renderResults(this.crops, this.locale, this.filters)
    if (results.innerHTML !== html) {
      const focused = results.contains(document.activeElement) ? document.activeElement as HTMLElement : null
      const href = focused?.getAttribute('href')
      results.innerHTML = html
      if (focused) {
        const replacement = href ? [...results.querySelectorAll<HTMLAnchorElement>('a')].find(link => link.getAttribute('href') === href) : undefined
        const focusTarget = replacement || this.querySelector<HTMLInputElement>('[data-filter="search"]')
        focusTarget?.focus({ preventScroll: true })
      }
    }
    const count = resultCount(selectedCrops(this.crops, this.locale, this.filters).length, this.locale)
    const countNode = this.querySelector('[data-result-count]')
    if (countNode) countNode.textContent = count
    const title = this.querySelector('[data-result-title]')
    if (title) title.textContent = this.filters.month ? months[this.locale][this.filters.month - 1]! : this.text('Dein ganzes Gartenjahr', 'Your whole growing year')
    this.querySelectorAll<HTMLElement>('[data-month]').forEach(link => {
      if (Number(link.dataset.month) === this.filters.month) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    })
    this.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-filter]').forEach(input => {
      const value = this.filters[input.dataset.filter as 'search' | 'category' | 'phase']
      if (input.value !== value) input.value = value
    })
    const reset = this.querySelector<HTMLButtonElement>('.leaf-gc-results-heading [data-reset]')
    if (reset) reset.hidden = !Object.values(this.filters).some(Boolean)
    if (announce) this.announce(count)
  }
  private applyData(fallback: boolean, pending = false) {
    this.ready = true
    this.dataset.ready = 'true'
    this.dataset.source = fallback ? 'snapshot' : 'supabase'
    this.dataset.refreshing = String(pending)
    const status = this.querySelector<HTMLElement>('[data-data-status]')
    if (status) status.hidden = !fallback || pending
    const message = this.querySelector('[data-data-message]')
    if (message && fallback) message.textContent = this.text('Die Live-Aktualisierung ist gerade nicht erreichbar. Du siehst den zuletzt geprüften Datenstand.', 'Live updates are currently unavailable. You are viewing the last reviewed data.')
    if (this.view().kind === 'plant') {
      const crop = this.crops.find(item => item.slug === this.dataset.slug)
      const content = this.querySelector<HTMLElement>('[data-view-content]')
      if (content) {
        if (!crop) content.innerHTML = scopeClasses(`<div class="rail error-page"><h1>${this.text('Dieser Pflanzplan ist zurzeit nicht verfügbar.', 'This growing plan is currently unavailable.')}</h1><a class="button" href="${pagePath({ kind: 'calendar' }, this.locale)}">${this.text('Zum Kalender', 'Back to the calendar')}</a></div>`)
        else if (crop.updated_at !== this.dataset.revision) {
          // Preserve deliberate focus if a background refresh updates content.
          const focused = this.contains(document.activeElement) ? document.activeElement as HTMLElement : null
          const focusedHref = focused?.getAttribute('href')
          content.innerHTML = renderPlant(crop, this.crops, this.locale)
          if (focusedHref) [...content.querySelectorAll<HTMLAnchorElement>('a')].find(link => link.getAttribute('href') === focusedHref)?.focus({ preventScroll: true })
          this.dataset.revision = crop.updated_at
        }
      }
      this.querySelectorAll<HTMLElement>('[data-pdf]').forEach(button => { button.hidden = false })
    } else {
      this.querySelectorAll<HTMLElement>('[data-enhance]').forEach(element => { element.hidden = false })
      const current = this.querySelector<HTMLElement>('[data-current-month]')
      if (current) { current.hidden = false; current.textContent = `${this.text('Jetzt im', 'This')} ${months[this.locale][this.currentMonth() - 1]} →` }
      this.updateResults()
      if (monthSlugs.includes(location.hash.slice(1))) this.revealPlanner()
    }
  }
  private async fetchCrops(url: URL, headers: HeadersInit = {}): Promise<Crop[]> {
    this.request?.abort()
    const controller = new AbortController()
    this.request = controller
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(url, { headers, signal: controller.signal, priority: 'high', credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' })
      if (!response.ok) throw new Error('Calendar data unavailable')
      const raw: unknown = await response.json()
      if (!Array.isArray(raw)) throw new Error('Invalid calendar response')
      const crops = raw.map(safeCrop)
      if (crops.some(crop => !crop)) throw new Error('Invalid public crop')
      return crops as Crop[]
    } finally { clearTimeout(timer) }
  }
  private async loadData() {
    if (this.loading || !this.config) return
    this.loading = true
    if (!this.ready) this.setAttribute('aria-busy', 'true')
    const retry = this.querySelector<HTMLButtonElement>('[data-retry]')
    if (retry) retry.disabled = true
    let fallback = false
    try {
      try {
        const api = new URL(`${this.config.dataset.supabaseUrl}/rest/v1/grow_calendar_crops`)
        if (api.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(api.hostname)) throw new Error('Invalid data endpoint')
        api.search = new URLSearchParams({ select: PUBLIC_FIELDS, is_published: 'eq.true', review_status: 'eq.verified', order: 'slug.asc', limit: '100' }).toString()
        const key = this.config.dataset.publishableKey || ''
        if (!key) throw new Error('Missing public read configuration')
        this.crops = await this.fetchCrops(api, { apikey: key })
      } catch (error) {
        if (!this.isConnected) return
        fallback = true
        if (!this.ready) this.crops = await this.fetchCrops(new URL(this.config.dataset.snapshotUrl || '', location.href))
      }
      if (!this.isConnected) return
      this.applyData(fallback)
    } catch {
      if (!this.isConnected) return
      const status = this.querySelector<HTMLElement>('[data-data-status]')
      if (status) status.hidden = false
      const message = this.querySelector('[data-data-message]')
      if (message) message.textContent = this.text('Die Aktualisierung ist gerade nicht erreichbar. Die veröffentlichten Pflanzpläne bleiben unten lesbar.', 'Updates are currently unavailable. The published growing plans remain readable below.')
    } finally {
      this.loading = false
      this.removeAttribute('aria-busy')
      if (retry) retry.disabled = false
    }
  }
  private async downloadPdf() {
    if (!this.ready || this.pdfLoading || !this.config) return
    if (!this.crops.some(item => item.slug === this.dataset.slug)) return
    const message = this.querySelector<HTMLElement>('[data-pdf-message]')
    const buttons = [...this.querySelectorAll<HTMLButtonElement>('[data-pdf]')]
    this.pdfLoading = true
    this.dataset.pdfState = 'preparing'
    buttons.forEach(button => { button.disabled = true; button.setAttribute('aria-busy', 'true') })
    if (message) message.textContent = this.text('Dein PDF wird vorbereitet …', 'Preparing your PDF …')
    try {
      const asset = new URL(this.config.dataset.pdfUrl || '', location.href)
      if (!(asset.origin === location.origin || asset.hostname === 'cdn.shopify.com') || !asset.pathname.endsWith('/leaf-grow-calendar-pdf.js')) throw new Error('Invalid PDF asset')
      if (this.pdfAttempts) asset.searchParams.set('leaf_retry', String(this.pdfAttempts))
      this.pdfAttempts++
      this.pdfModule ||= import(/* @vite-ignore */ asset.href).catch(error => { this.pdfModule = undefined; throw error })
      const module = await this.pdfModule
      // Revalidation may replace or withdraw the initial snapshot while the
      // module loads. Only use the record still displayed when rendering starts.
      const crop = this.crops.find(item => item.slug === this.dataset.slug)
      if (!crop || !this.isConnected) return
      const detailUrl = new URL(pagePath({ kind: 'plant', slug: crop.slug }, this.locale), this.config.dataset.shopUrl || 'https://leaferservice.com').href
      const prepared = await module.prepareCropPdfDownload(crop, this.locale, { detailUrl })
      if (!this.isConnected) { prepared.dispose(); return }
      const current = this.crops.find(item => item.slug === crop.slug)
      if (!current || JSON.stringify(current) !== JSON.stringify(crop)) {
        prepared.dispose()
        const currentMessage = this.querySelector<HTMLElement>('[data-pdf-message]')
        if (currentMessage) currentMessage.textContent = this.text('Der Pflanzplan wurde gerade aktualisiert. Bitte starte den PDF-Download erneut.', 'This growing plan has just been updated. Please start the PDF download again.')
        return
      }
      this.preparedPdf?.dispose()
      this.preparedPdf = prepared
      const link = this.querySelector<HTMLAnchorElement>('[data-pdf-ready]')
      if (link) { link.href = prepared.url; link.download = prepared.filename; link.hidden = false }
      if (message) message.textContent = this.text('Dein PDF ist bereit. Falls der Download nicht startet, öffne es über den Link.', 'Your PDF is ready. If the download does not start, open it using the link.')
      prepared.download()
    } catch {
      if (message) message.textContent = this.text('Das PDF konnte gerade nicht erstellt werden. Bitte klicke erneut auf Herunterladen.', 'The PDF could not be created. Please try the download button again.')
    } finally {
      this.pdfLoading = false
      this.dataset.pdfState = 'idle'
      buttons.forEach(button => { button.disabled = false; button.removeAttribute('aria-busy') })
    }
  }
}
if (!customElements.get('leaf-grow-calendar')) customElements.define('leaf-grow-calendar', LeafGrowCalendar)
