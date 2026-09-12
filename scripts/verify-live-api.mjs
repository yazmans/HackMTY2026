// Drives the app against the REAL Nessie API (no stubbing) to confirm the
// "Failed to fetch" problem is gone end-to-end.
import { chromium } from 'playwright'

const URL = 'http://localhost:5199/'
// Login is Customer ID only now — the app picks the customer's first account
// itself. (That first account's real purchases feed is corrupted on Nessie's
// side, but that no longer matters: purchases are mocked, not fetched.)
const CUSTOMER = '3c44ce3b-f749-4da3-9eec-d3e048ba529d'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } })

const failedRequests = []
page.on('requestfailed', (r) => {
  if (r.url().includes('nessie') || r.url().includes('reimagine')) {
    failedRequests.push(`${r.url()} :: ${r.failure()?.errorText}`)
  }
})
const apiCalls = []
page.on('response', (r) => {
  if (r.url().includes('nessieisreal')) apiCalls.push(`${r.status()} ${r.url().split('?')[0]}`)
})
const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push(String(e)))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.getByPlaceholder('Tu nombre').fill('Eleanor')
await page.getByPlaceholder('5a8a1e....').fill(CUSTOMER)
await page.getByRole('button', { name: 'Sign In' }).click()
await page.waitForTimeout(3000)

check('No failed network requests', failedRequests.length === 0, failedRequests[0] || '')
check('Nessie calls returned 200', apiCalls.length > 0 && apiCalls.every((c) => c.startsWith('200')), JSON.stringify(apiCalls))

const bodyText = await page.locator('body').innerText()
check('No "Failed to fetch" on screen', !/Failed to fetch|No pudimos conectar/i.test(bodyText))
check('Real balance rendered', /\$2,134/.test(bodyText), bodyText.match(/\$[\d,]+\.\d\d/)?.[0] || 'none')
await page.screenshot({ path: 'scripts/shots/live-1-dashboard.png' })

// Link as senior, then exercise a real transfer POST.
await page.getByRole('button', { name: /Eno Family/ }).click()
await page.getByRole('button', { name: /Vincular mi cuenta/ }).click()
await page.getByRole('button', { name: /Simulate Code Entered/ }).click()
for (const d of ['1', '2', '3', '4']) await page.getByRole('button', { name: d, exact: true }).click()
await page.getByRole('button', { name: 'Firmar y Autorizar' }).click()
await page.waitForTimeout(2000)
const easyModeText = await page.locator('body').innerText()
check('Senior Easy Mode shows real data', /2,134/.test(easyModeText))
// Nessie's real balance for this account isn't guaranteed to stay 2,134
// forever (repeated runs of this script each create a real transfer), so
// the post-transfer check below compares against whatever it is right now
// rather than a hardcoded figure.
const balanceBefore = parseFloat(
  (easyModeText.match(/\$([\d,]+\.\d\d)/)?.[1] || '0').replace(/,/g, '')
)
await page.screenshot({ path: 'scripts/shots/live-2-easy.png' })

const TRANSFER_AMOUNT = 1
await page.getByRole('button', { name: 'Enviar dinero' }).click()
await page.getByPlaceholder('Nessie Account ID').fill('6350084a-e83c-4d23-853f-034701c23917')
await page.getByPlaceholder('Renta, Regalo cumpleaños…').fill('Prueba automatizada')
await page.getByPlaceholder('100.00').fill(String(TRANSFER_AMOUNT))
await page.getByRole('button', { name: /Confirmar transferencia/ }).click()
await page.waitForTimeout(3000)

const afterTransfer = await page.locator('body').innerText()
check('Real transfer succeeded (201)', /Transferencia enviada/.test(afterTransfer), afterTransfer.match(/Nessie \d+:[^\n]*/)?.[0] || '')
await page.screenshot({ path: 'scripts/shots/live-3-transfer.png' })

await page.getByRole('button', { name: 'Listo' }).click()
await page.waitForTimeout(500)
const afterClose = await page.locator('body').innerText()
check(
  'Concept shows up in Últimos movimientos (optimistic addPurchase)',
  afterClose.includes('Prueba automatizada')
)
const balanceAfter = parseFloat(
  (afterClose.match(/\$([\d,]+\.\d\d)/)?.[1] || '0').replace(/,/g, '')
)
check(
  `Balance optimistically debited by the transferred amount ($${TRANSFER_AMOUNT.toFixed(2)})`,
  Math.abs(balanceBefore - balanceAfter - TRANSFER_AMOUNT) < 0.001,
  `${balanceBefore} -> ${balanceAfter}`
)
await page.screenshot({ path: 'scripts/shots/live-4-after-transfer.png' })

check('No page errors', consoleErrors.length === 0, consoleErrors[0] || '')

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
