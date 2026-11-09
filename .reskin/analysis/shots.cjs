const { chromium } = require('E:/workspace/chuangye/ROBIN/710/website/.reskin/tools/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1247/chrome-win64/chrome.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const out = '.reskin/analysis'
  await page.goto('http://127.0.0.1:4331/', { waitUntil: 'networkidle' })
  await page.locator('.ab-glyph', { hasText: 'Release studio' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/studio-modal.png` })
  await page.locator('.ab-sheet-x').click()
  await page.waitForTimeout(300)
  await page.locator('.ab-sound-open').first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/demo-modal.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.ab-burger').click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/mobile-menu.png` })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  console.log(JSON.stringify({ errors, title: await page.title() }))
  await browser.close()
})().catch((error) => { console.error(error); process.exit(1) })

