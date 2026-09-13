// Verifies the high-value transfer hold end-to-end: two Playwright browser
// CONTEXTS (senior + copilot) against the real /server backend — real link
// handshake, real transfer_requests row, real socket.io events both ways.
//
// Only the HELD decision is exercised here: it never calls Nessie, so this
// script has no side effects and is safe to run repeatedly / in CI. The
// APPROVED decision (which does call the real Nessie API to execute the
// transfer) was verified manually via curl — see the PR/commit notes — and
// isn't re-run automatically here to avoid creating real transfers on every run.
//
// Prerequisites (both must already be running):
//   - Frontend: npm run dev -- --port 5199
//   - Backend:  cd server && npm run dev
import { chromium } from 'playwright'

const URL = 'https://localhost:5199/'
// Links persist server-side, so reused IDs would already be linked on a
// second run and skip straight past UnlinkedApp — keep every run fresh.
const RUN_ID = Date.now()
const SENIOR_CUSTOMER_ID = `xfer_ui_senior_${RUN_ID}`
const COPILOT_CUSTOMER_ID = `xfer_ui_copilot_${RUN_ID}`
const HIGH_AMOUNT = '15000'
const CONCEPT = 'Reparación de techo'

const ACCOUNTS = [
  {
    _id: 'acc_1',
    nickname: 'Cuenta Principal',
    type: 'Checking',
    balance: 4820.55,
    account_number: '1234567890123456',
  },
]

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

async function waitVisible(locator, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await locator.isVisible().catch(() => false)) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

// For asserting something eventually goes away — NOT the same as
// `!(await waitVisible(...))`, which would report success from the instant
// before an element disappears, not after.
async function waitHidden(locator, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (!(await locator.isVisible().catch(() => true))) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

async function stubNessie(context) {
  await context.route('**/api.nessieisreal.com/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/accounts') && url.includes('/customers/')) {
      return route.fulfill({ json: ACCOUNTS })
    }
    if (url.includes('/transfers')) {
      return route.fulfill({ json: route.request().method() === 'POST' ? { code: 201 } : [] })
    }
    return route.fulfill({ json: {} })
  })
}

async function login(page, customerId, name) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('Tu nombre').fill(name)
  await page.getByPlaceholder('5a8a1e....').fill(customerId)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForTimeout(500)
}

async function linkAccounts(seniorPage, copilotPage) {
  await seniorPage.getByRole('button', { name: /Eno Family/ }).click()
  await seniorPage.getByRole('button', { name: /Vincular mi cuenta/ }).click()
  await seniorPage.waitForTimeout(800)
  const codeText = (await seniorPage.locator('.tabular-nums').innerText()).replace('-', '').trim()

  await copilotPage.getByRole('button', { name: /Eno Family/ }).click()
  await copilotPage.getByRole('button', { name: /Vincular a un familiar/ }).click()
  for (const d of codeText) await copilotPage.getByRole('button', { name: d, exact: true }).click()
  await copilotPage.getByRole('button', { name: 'Verificar' }).click()
  await waitVisible(seniorPage.getByText('Autorización'))

  for (const d of ['1', '2', '3', '4']) {
    await seniorPage.getByRole('button', { name: d, exact: true }).click()
  }
  await seniorPage.getByRole('button', { name: 'Firmar y Autorizar' }).click()
  await waitVisible(seniorPage.getByText('Easy Mode'))
  await waitVisible(copilotPage.locator('nav').getByText('Eno Family'))
}

const browser = await chromium.launch()
const seniorContext = await browser.newContext({ viewport: { width: 420, height: 900 } })
const copilotContext = await browser.newContext({ viewport: { width: 420, height: 900 } })
await stubNessie(seniorContext)
await stubNessie(copilotContext)

const seniorPage = await seniorContext.newPage()
const copilotPage = await copilotContext.newPage()

const seniorErrors = []
seniorPage.on('pageerror', (e) => seniorErrors.push(String(e)))
const copilotErrors = []
copilotPage.on('pageerror', (e) => copilotErrors.push(String(e)))

await login(seniorPage, SENIOR_CUSTOMER_ID, 'Eleanor')
await login(copilotPage, COPILOT_CUSTOMER_ID, 'Marcus')
await linkAccounts(seniorPage, copilotPage)

// -------- Senior sends a high-value transfer --------
await seniorPage.getByRole('button', { name: 'Enviar dinero' }).click()
await seniorPage.getByPlaceholder('Nessie Account ID').fill('6350084a-e83c-4d23-853f-034701c23917')
await seniorPage.getByPlaceholder('Renta, Regalo cumpleaños…').fill(CONCEPT)
await seniorPage.getByPlaceholder('100.00').fill(HIGH_AMOUNT)
await seniorPage.getByRole('button', { name: /Confirmar transferencia/ }).click()

check(
  'Senior sees the awaiting-approval screen, not the normal success screen',
  await waitVisible(seniorPage.getByText('Esperando aprobación de tu copiloto'))
)
check(
  'No "¡Transferencia enviada!" shown yet (nothing executed pre-approval)',
  !(await seniorPage.getByText('¡Transferencia enviada!').isVisible().catch(() => false))
)
await seniorPage.screenshot({ path: 'scripts/shots/hold-1-senior-waiting.png' })

// -------- Copilot sees the real request (not the old hardcoded $500 one) --------
await copilotPage.locator('nav').getByText('Eno Family').click()
check(
  'Copilot sees the real pending request with the actual amount and concept',
  await waitVisible(copilotPage.getByText(CONCEPT))
)
check(
  'No hardcoded $500.00 example left in the UI',
  !(await copilotPage.getByText('$500.00').isVisible().catch(() => false))
)
await copilotPage.screenshot({ path: 'scripts/shots/hold-2-copilot-pending.png' })

// -------- Copilot holds it --------
await copilotPage.getByRole('button', { name: /Retener/ }).click()
check(
  'Request disappears from the copilot pending list after resolving',
  await waitHidden(copilotPage.getByText(CONCEPT))
)

// -------- Senior finds out in real time --------
check(
  'Senior is notified their copilot held the transfer (socket.io, no polling)',
  await waitVisible(seniorPage.getByText('Tu copiloto detuvo esta transferencia'))
)
check(
  'Blocked-transaction screen offers a direct line to support (ElevenLabs button)',
  await seniorPage.getByRole('button', { name: /Contactar a soporte prioritario/ }).isVisible()
)
await seniorPage.screenshot({ path: 'scripts/shots/hold-3-senior-held.png' })

await seniorPage.getByRole('button', { name: 'Entendido' }).click()
await seniorPage.waitForTimeout(300)
const seniorHomeText = await seniorPage.locator('body').innerText()
check(
  'No purchase/balance change from a held transfer',
  !seniorHomeText.includes(CONCEPT) && /4,820\.55|\$4,820/.test(seniorHomeText)
)

// -------- Regression: transfers at/under the threshold are unaffected --------
await seniorPage.getByRole('button', { name: 'Enviar dinero' }).click()
await seniorPage.getByPlaceholder('Nessie Account ID').fill('6350084a-e83c-4d23-853f-034701c23917')
await seniorPage.getByPlaceholder('Renta, Regalo cumpleaños…').fill('Café')
await seniorPage.getByPlaceholder('100.00').fill('50')
await seniorPage.getByRole('button', { name: /Confirmar transferencia/ }).click()
check(
  'Transfers under the threshold still complete instantly (existing flow untouched)',
  await waitVisible(seniorPage.getByText('¡Transferencia enviada!'))
)
await seniorPage.getByRole('button', { name: 'Listo' }).click()
await seniorPage.waitForTimeout(300)
check(
  'Small transfer appears immediately in Últimos movimientos (optimistic addPurchase)',
  (await seniorPage.locator('body').innerText()).includes('Café')
)

check('No console/page errors (senior)', seniorErrors.length === 0, seniorErrors[0] || '')
check('No console/page errors (copilot)', copilotErrors.length === 0, copilotErrors[0] || '')

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
