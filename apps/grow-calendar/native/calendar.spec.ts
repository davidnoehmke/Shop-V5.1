import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
const root = '/pages/aussaatkalender'
async function ready(page: any) { await expect(page.locator('leaf-grow-calendar')).toHaveAttribute('data-ready', 'true') }

test('native filters are local, combinable, focus-preserving and represented in URL history', async ({ page }) => {
  const apiRequests: string[] = []
  const pdfRequests: string[] = []
  page.on('request', request => { if (request.url().includes('/rest/')) apiRequests.push(request.url()); if (request.url().includes('-pdf.js')) pdfRequests.push(request.url()) })
  await page.goto(root)
  await ready(page)
  await expect(page.locator('[data-results] .crop-card')).toHaveCount(30)
  expect(await page.locator('iframe').count()).toBe(0)
  expect(pdfRequests).toHaveLength(0)
  const search = page.getByRole('searchbox', { name: 'Pflanze suchen' })
  await search.fill('Tomate')
  await expect(search).toBeFocused()
  await page.locator('[data-filter="category"]').selectOption('vegetables')
  await page.locator('[data-filter="phase"]').selectOption('start_indoor')
  await page.getByRole('link', { name: 'März', exact: true }).first().click()
  await expect(page.locator('[data-results] .crop-card')).toHaveCount(1)
  await expect(page.locator('[data-result-count]')).toHaveText('1 Pflanze passt zu deiner Auswahl')
  await expect(page).toHaveURL(/month=3/)
  await expect(page).toHaveURL(/q=Tomate/)
  await page.getByRole('link', { name: 'November', exact: true }).first().click()
  await expect(page.locator('.empty-state')).toBeVisible()
  await page.goBack()
  await expect(page.locator('[data-results] .crop-card')).toHaveCount(1)
  expect(apiRequests).toHaveLength(1)
  await page.locator('.results-heading [data-reset]').click()
  await expect(page.locator('[data-results] .crop-card')).toHaveCount(30)
  expect(apiRequests).toHaveLength(1)
})

for (const locale of ['de', 'en']) {
  const prefix = locale === 'en' ? '/en' : ''
  test(`${locale}: real native plant page and lazy PDF download`, async ({ page }) => {
    let pdfRequested = false
    page.on('request', request => { if (request.url().includes('-pdf.js')) pdfRequested = true })
    await page.goto(`${prefix}${root}-tomate`)
    await ready(page)
    await expect(page.locator('h1')).toHaveText(locale === 'de' ? 'Tomate' : 'Tomato')
    expect(pdfRequested).toBe(false)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://leaferservice.com${prefix}${root}-tomate`)
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-pdf]').first().click()
    const download = await downloadPromise
    expect(await download.failure()).toBeNull()
    expect(download.suggestedFilename()).toBe(`leaferservice-tomate-${locale}.pdf`)
    const bytes = await readFile((await download.path())!)
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(1)
    expect(pdf.getTitle()).toContain(locale === 'de' ? 'Tomate' : 'Tomato')
    expect(pdfRequested).toBe(true)
    await expect(page.locator('[data-pdf-ready]')).toHaveAttribute('href', /^blob:/)
    await expect(page.locator('[data-pdf]')).toHaveCount(2)
    await expect(page.locator('[data-pdf]').first()).toBeEnabled()
    const second = page.waitForEvent('download')
    await page.locator('[data-pdf-ready]').click()
    expect(await (await second).failure()).toBeNull()
  })
}

test('PDF load failure leaves a real retry path', async ({ page }) => {
  await page.route('**/assets/leaf-grow-calendar-pdf.js*', async route => {
    if (!route.request().url().includes('leaf_retry=')) return route.fulfill({ status: 503, body: 'Unavailable' })
    return route.continue()
  })
  await page.goto(`${root}-tomate`)
  await ready(page)
  await page.locator('[data-pdf]').first().click()
  await expect(page.locator('[data-pdf-message]')).toContainText('Bitte klicke erneut')
  await expect(page.locator('[data-pdf]').first()).toBeEnabled()
  const download = page.waitForEvent('download')
  await page.locator('[data-pdf]').first().click()
  expect(await (await download).failure()).toBeNull()
})

test('reviewed snapshot preserves useful UI when live data fails', async ({ page }) => {
  await page.route('**/rest/v1/grow_calendar_crops*', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto(root)
  await ready(page)
  await expect(page.locator('leaf-grow-calendar')).toHaveAttribute('data-source', 'snapshot')
  await expect(page.locator('[data-data-message]')).toContainText('zuletzt geprüften Datenstand')
  await page.getByRole('searchbox').fill('Basilikum')
  await expect(page.locator('[data-results] .crop-card')).toHaveCount(1)
  await expect(page.locator('[data-retry]')).toBeEnabled()
})

test('published withdrawal is reflected in the detail and disables PDF', async ({ page }) => {
  await page.route('**/rest/v1/grow_calendar_crops*', route => route.fulfill({ json: [] }))
  await page.goto(`${root}-tomate`)
  await ready(page)
  await expect(page.locator('h1')).toContainText('zurzeit nicht verfügbar')
  await expect(page.locator('[data-pdf]')).toHaveCount(0)
})

test('legacy month fragments select and reveal the planner', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${root}#maerz`)
  await ready(page)
  await expect(page.locator('.month-picker [data-month="3"]')).toHaveAttribute('aria-current', 'true')
  await expect.poll(() => page.locator('#pflanzen').evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(250)
  await expect(page.locator('[data-result-title]')).toHaveText('März')
})

test('stored Shopify HTML remains complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } })
  const page = await context.newPage()
  await page.goto(`http://127.0.0.1:3502${root}`)
  await expect(page.locator('.crop-card')).toHaveCount(30)
  await expect(page.locator('.month-links a')).toHaveCount(12)
  await page.locator('[data-crop="tomate"] .card-link').click()
  await expect(page.locator('h1')).toHaveText('Tomate')
  await expect(page.locator('.timeline tbody tr')).toHaveCount(4)
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /^https:/)
  await context.close()
})

test('keyboard focus survives background loading and both reset paths', async ({ page }) => {
  let release: (() => void) | undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/rest/v1/grow_calendar_crops*', async route => { await gate; await route.continue() })
  await page.goto(root)
  const basil = page.locator('[data-crop="basilikum"] .card-link')
  await basil.focus()
  release!()
  await ready(page)
  await expect(basil).toBeFocused()
  const search = page.getByRole('searchbox')
  await search.fill('Tomate')
  const reset = page.locator('.results-heading [data-reset]')
  await reset.focus()
  await page.keyboard.press('Enter')
  await expect(search).toBeFocused()
  await search.fill('zzzz-no-match')
  await page.locator('.empty-state [data-reset]').focus()
  await page.keyboard.press('Enter')
  await expect(search).toBeFocused()
  await expect(page.locator('[data-results] .crop-card')).toHaveCount(30)
})

test('a month page keeps its month-specific content and links despite contradictory query input', async ({ page }) => {
  await page.goto(`${root}-maerz?month=11`)
  await ready(page)
  await expect(page.locator('h1')).toContainText('März')
  await expect(page.locator('[data-result-title]')).toHaveText('März')
  await expect(page.locator('.month-picker [data-month="3"]')).toHaveAttribute('aria-current', 'true')
  await page.locator('.month-picker [data-month="11"]').click()
  await ready(page)
  await expect(page).toHaveURL(/aussaatkalender-november/)
  await expect(page.locator('h1')).toContainText('November')
})

test('ordinary links and inputs keep native navigation without changing the selected month', async ({ page }) => {
  await page.goto(root)
  await ready(page)
  await page.getByRole('link', { name: 'Gartenjahr planen' }).click()
  await expect(page).toHaveURL(/#pflanzen$/)
  await page.locator('.month-picker [data-month="3"]').click()
  const search = page.getByRole('searchbox')
  await search.click()
  await search.fill('Tomate')
  await expect(page.locator('[data-result-title]')).toHaveText('März')
  await page.locator('[data-crop="tomate"] .card-link').click()
  await expect(page).toHaveURL(/aussaatkalender-tomate$/)
  await expect(page.locator('h1')).toHaveText('Tomate')
  await page.goBack()
  await ready(page)
  await expect(page.locator('[data-result-title]')).toHaveText('März')
  await expect(search).toHaveValue('Tomate')
})

test('mobile and desktop native pages remain inside the viewport', async ({ page }) => {
  for (const width of [320, 375, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of [root, `${root}-kapuzinerkresse`, `/en${root}-maerz`]) {
      await page.goto(path)
      await ready(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path} at ${width}`).toBe(true)
      expect(await page.locator('h1').count()).toBe(1)
    }
  }
})
