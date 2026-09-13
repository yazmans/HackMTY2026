// Verifies the real Eno Family linking flow end-to-end: two separate
// Playwright browser CONTEXTS (one per persona, like two different phones)
// talking to the real /server backend (SQLite + socket.io) — no simulate
// button, no polling, no stubbing of the links API. Nessie itself IS
// stubbed per context (like verify-flow.mjs) so each persona's dashboard
// renders instantly on a fake customerId, since only the linking backend is
// under test here.
//
// Prerequisites (both must already be running):
//   - Frontend: npm run dev -- --port 5199
//   - Backend:  cd server && npm run dev   (see server/.env for its PORT)
import { chromium } from 'playwright'

const URL = 'https://localhost:5199/'
const SENIOR_CUSTOMER_ID = 'link_test_senior'
const COPILOT_CUSTOMER_ID = 'link_test_copilot'

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

// Base `playwright` has no auto-retrying `expect()` — poll manually instead,
// since these checks depend on an event arriving asynchronously from the
// OTHER persona's browser context via the backend's socket.io.
async function waitVisible(locator, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await locator.isVisible().catch(() => false)) return true
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

const browser = await chromium.launch()

// Two isolated contexts = two different devices/users, sharing nothing.
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

// ---------------- Senior: create a real, server-issued code ----------------
await seniorPage.getByRole('button', { name: /Eno Family/ }).click()
await seniorPage.getByRole('button', { name: /Vincular mi cuenta/ }).click()
await seniorPage.waitForTimeout(800) // real POST /api/links/create round trip

check(
  'No [DEV] simulate button anywhere in the flow',
  !(await seniorPage.getByText('[DEV] Simulate Code Entered').isVisible().catch(() => false))
)

const codeText = await seniorPage.locator('.tabular-nums').innerText()
check('Senior received a real 6-digit code from the server', /^\d{3}-\d{3}$/.test(codeText.trim()), codeText.trim())
const code = codeText.replace('-', '').trim()
await seniorPage.screenshot({ path: 'scripts/shots/links-1-senior-code.png' })

// -------------- Copilot: verify the code against the real backend --------------
await copilotPage.getByRole('button', { name: /Eno Family/ }).click()
await copilotPage.getByRole('button', { name: /Vincular a un familiar/ }).click()

// Sanity check the error path first: a wrong code must be rejected with a
// clear message, not silently accepted.
for (const d of '000000') await copilotPage.getByRole('button', { name: d, exact: true }).click()
await copilotPage.getByRole('button', { name: 'Verificar' }).click()
await copilotPage.waitForTimeout(500)
check(
  'Wrong code is rejected with a clear error',
  await copilotPage.getByText(/Código inválido/).isVisible().catch(() => false)
)

// Clear the pad and enter the real code.
for (let i = 0; i < 6; i++) {
  await copilotPage.getByRole('button', { name: 'Borrar' }).click()
}
for (const d of code) await copilotPage.getByRole('button', { name: d, exact: true }).click()
await copilotPage.getByRole('button', { name: 'Verificar' }).click()

check(
  'Copilot waits for authorization after verifying (not instantly linked)',
  await waitVisible(copilotPage.getByText(/Esperando autorización/))
)
await copilotPage.screenshot({ path: 'scripts/shots/links-2-copilot-waiting.png' })

// The senior never clicked anything to get here — this is the socket.io
// "link:verified" event landing in real time.
check(
  'Senior auto-advanced to consent via socket.io (no button, no polling)',
  await waitVisible(seniorPage.getByText('Autorización'))
)
await seniorPage.screenshot({ path: 'scripts/shots/links-3-senior-consent.png' })

// -------------- Senior signs with their NIP to authorize --------------
for (const d of ['1', '2', '3', '4']) {
  await seniorPage.getByRole('button', { name: d, exact: true }).click()
}
await seniorPage.getByRole('button', { name: 'Firmar y Autorizar' }).click()

check('Senior unlocked after authorizing', await waitVisible(seniorPage.getByText('Easy Mode')))
await seniorPage.screenshot({ path: 'scripts/shots/links-4-senior-unlocked.png' })

// Again, the copilot never polled or clicked — this is the second socket.io
// event ("link:authorized") landing after the senior's own POST.
check(
  'Copilot auto-unlocked via socket.io once senior authorized (no polling)',
  await waitVisible(copilotPage.locator('nav').getByText('Eno Family'))
)
await copilotPage.screenshot({ path: 'scripts/shots/links-5-copilot-unlocked.png' })

// ---------------- Persistence: re-login restores the link from the server ----------------
await login(seniorPage, SENIOR_CUSTOMER_ID, 'Eleanor')
check(
  'Senior link restored on re-login (GET /api/links/status, real persistence)',
  await waitVisible(seniorPage.getByText('Easy Mode'))
)

await login(copilotPage, COPILOT_CUSTOMER_ID, 'Marcus')
check(
  'Copilot link restored on re-login (GET /api/links/status, real persistence)',
  await waitVisible(copilotPage.locator('nav').getByText('Eno Family'))
)

check('No console/page errors (senior)', seniorErrors.length === 0, seniorErrors[0] || '')
check('No console/page errors (copilot)', copilotErrors.length === 0, copilotErrors[0] || '')

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
