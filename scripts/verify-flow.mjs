// Drives the Eno Family linking flow in a real browser, across two separate
// browser CONTEXTS (senior + copilot) against the real /server backend —
// same proven two-party pattern as verify-links.mjs. Nessie itself is
// stubbed per context so each persona's dashboard renders instantly on a
// fake customerId, since only the app's own UI/backend is under test here.
//
// (This used to be a single-page script relying on a "[DEV] Simulate Code
// Entered" button that no longer exists — the linking flow has required a
// real second party since it moved to a real backend. Restructured to match.)
//
// Prerequisites (both must already be running):
//   - Frontend: npm run dev -- --port 5199
//   - Backend:  cd server && npm run dev
import { chromium } from 'playwright'
import { mockPurchases } from '../src/data/mockPurchases.js'

const URL = 'http://localhost:5199/'
const OUT = 'scripts/shots'
const RUN_ID = Date.now()
const SENIOR_CUSTOMER_ID = `flow_senior_${RUN_ID}`
const COPILOT_CUSTOMER_ID = `flow_copilot_${RUN_ID}`

const ACCOUNTS = [
  {
    _id: 'acc_1',
    nickname: 'Cuenta Principal',
    type: 'Checking',
    balance: 4820.55,
    account_number: '1234567890123456',
  },
]

// Real Nessie /bills shape (payee/nickname/payment_amount/...), confirmed
// against the live API — "Fugas por suscripción" (both the senior's
// StandardDashboard and the copilot's CoPilotTab) now fetches this instead
// of deriving subscriptions from purchases.
const BILLS = [
  {
    _id: 'bill_1',
    status: 'pending',
    payee: 'Streamly Plus',
    nickname: 'Suscripción 1',
    payment_date: '2026-10-01',
    recurring_date: 1,
    upcoming_payment_date: '2026-10-01',
    payment_amount: 15.99,
    account_id: 'acc_1',
  },
]

// The 2 most recent mock purchases, newest first — what "Movimientos
// recientes" (StandardDashboard) should show now that it's trimmed to 2.
const sortedMockPurchases = [...mockPurchases].sort(
  (a, b) => new Date(b.purchase_date) - new Date(a.purchase_date)
)
const [mostRecent, secondMostRecent] = sortedMockPurchases

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

async function waitVisible(locator, timeout = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await locator.isVisible().catch(() => false)) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

async function stubNessie(context) {
  await context.route('**/api.nessieisreal.com/**', async (route) => {
    const req = route.request()
    const url = req.url()
    if (url.includes('/accounts') && url.includes('/customers/')) {
      return route.fulfill({ json: ACCOUNTS })
    }
    if (url.includes('/bills')) {
      return route.fulfill({ json: BILLS })
    }
    if (url.includes('/transfers')) {
      return route.fulfill({ json: req.method() === 'POST' ? { code: 201 } : [] })
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
const seniorContext = await browser.newContext({ viewport: { width: 900, height: 1000 } })
const copilotContext = await browser.newContext({ viewport: { width: 900, height: 1000 } })
await stubNessie(seniorContext)
await stubNessie(copilotContext)

const seniorPage = await seniorContext.newPage()
const copilotPage = await copilotContext.newPage()

const errors = []
for (const page of [seniorPage, copilotPage]) {
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
}

// ---------------- Senior: unlinked state + starts the handshake ----------------
await login(seniorPage, SENIOR_CUSTOMER_ID, 'Eleanor')

const enoCard = seniorPage.getByRole('button', { name: /Eno Family/ })
check('Unlinked dashboard shows Eno Family card', await enoCard.isVisible())
check(
  'Easy Mode hidden before linking',
  !(await seniorPage.getByText('Easy Mode').isVisible().catch(() => false))
)
await seniorPage.screenshot({ path: `${OUT}/1-unlinked.png` })

await enoCard.click()
await seniorPage.getByRole('button', { name: /Vincular mi cuenta/ }).click()
await seniorPage.waitForTimeout(800)

const codeText = await seniorPage.locator('.tabular-nums').innerText()
check('Senior code is 6 digits formatted NNN-NNN', /^\d{3}-\d{3}$/.test(codeText.trim()), codeText.trim())
check(
  'Waiting spinner text shown',
  await seniorPage.getByText(/Esperando a que tu familiar/).isVisible()
)
await seniorPage.screenshot({ path: `${OUT}/2-senior-code.png` })
const code = codeText.replace('-', '').trim()

// ---------------- Copilot: enters the senior's real code ----------------
await login(copilotPage, COPILOT_CUSTOMER_ID, 'Marcus')
await copilotPage.getByRole('button', { name: /Eno Family/ }).click()
await copilotPage.getByRole('button', { name: /Vincular a un familiar/ }).click()
await copilotPage.waitForTimeout(300)

for (const d of code) {
  await copilotPage.getByRole('button', { name: d, exact: true }).click()
}
await copilotPage.screenshot({ path: `${OUT}/6-copilot-code.png` })
await copilotPage.getByRole('button', { name: 'Verificar' }).click()

// The senior never clicks anything to get here — this is the real socket.io
// "link:verified" event, not a simulate button.
check(
  'Consent notice shown (senior auto-advanced via socket.io, no simulate button)',
  await waitVisible(seniorPage.getByText(/No podrá realizar transferencias sin tu permiso/))
)

// NIP pad: 4 digits, masked.
for (const d of ['1', '2', '3', '4']) {
  await seniorPage.getByRole('button', { name: d, exact: true }).click()
}
const masked = await seniorPage.locator('div.h-14.w-14 span').allInnerTexts()
check('NIP masked as bullets', masked.join('') === '••••', masked.join(''))
await seniorPage.screenshot({ path: `${OUT}/3-consent.png` })

await seniorPage.getByRole('button', { name: 'Firmar y Autorizar' }).click()
await waitVisible(seniorPage.getByText('Easy Mode'))

check('Senior unlocked: Easy Mode toggle in header', await seniorPage.getByText('Easy Mode').isVisible())
check('Easy Mode balance rendered large', await seniorPage.locator('.text-5xl').first().isVisible())
check(
  'Easy Mode shows Últimos movimientos',
  await seniorPage.getByText('Últimos movimientos').isVisible()
)
await seniorPage.screenshot({ path: `${OUT}/4-senior-easy.png` })

// Toggle off -> standard dashboard, and the card must not reappear.
await seniorPage.getByRole('switch').click()
await seniorPage.waitForTimeout(400)
check('Standard mode reachable from senior', await seniorPage.getByText('Gasto semanal').isVisible())
check(
  'Eno Family card hidden after linking',
  !(await seniorPage.getByRole('button', { name: /^Eno Family/ }).isVisible().catch(() => false))
)

// Weekly chart: 7 day-bars computed from the real mock purchases, not the
// old hardcoded [38, 62, 24, 80, 45, 70, 33] array.
const barCount = await seniorPage.locator('div.h-24 > div.flex-1').count()
check('Weekly chart renders 7 day bars', barCount === 7, String(barCount))
const peakBarStyle = await seniorPage
  .locator('div.h-24 > div.flex-1')
  .first()
  .locator('div.rounded-t')
  .getAttribute('style')
check(
  "Weekly chart's Monday bar reflects real data (peak = full 72px track, not a stale hardcoded height)",
  /height:\s*72px/.test(peakBarStyle || ''),
  peakBarStyle || ''
)

// Movimientos recientes: trimmed to the 2 most recent mock purchases.
// `.bg-white` disambiguates from the outer phone-frame div, which also has
// `overflow-hidden` and (being an ancestor of everything) would otherwise
// match too — harmless for .count() alone, but silently sums li's from both
// matches, and throws outright on .innerText() under strict mode.
const movimientosCard = seniorPage.locator('div.bg-white.overflow-hidden', { hasText: 'Movimientos recientes' })
const movimientosCount = await movimientosCard.locator('li').count()
check('Movimientos recientes shows exactly 2 items', movimientosCount === 2, String(movimientosCount))
const movimientosText = await movimientosCard.innerText()
check(
  'Movimientos recientes shows the 2 most recent mock purchases',
  movimientosText.includes(mostRecent.description) &&
    movimientosText.includes(secondMostRecent.description),
  movimientosText.replace(/\n/g, ' | ')
)

// Senior's own "Fugas por suscripción" (StandardDashboard), fetched from the
// stubbed /bills response — not derived from purchases anymore.
check(
  'Senior: subscription leaks section shown',
  await waitVisible(seniorPage.getByText('Fugas por suscripción'))
)
check(
  'Senior: subscription section shows the real bill payee name',
  await waitVisible(seniorPage.getByText(BILLS[0].payee))
)
await seniorPage.screenshot({ path: `${OUT}/5-senior-standard.png` })

// ---------------- Copilot: auto-unlocked via the second socket.io event ----------------
const navTab = copilotPage.locator('nav').getByText('Eno Family')
check(
  'Copilot unlocked: Eno Family tab in bottom nav (socket.io, no polling)',
  await waitVisible(navTab)
)
check(
  'Bottom nav pinned at frame bottom',
  await copilotPage.locator('nav.absolute.bottom-0').isVisible()
)

await navTab.click()
await copilotPage.waitForTimeout(800)
check('Caregiver: privacy header', await copilotPage.getByText('Monitoreo Activo').isVisible())
check('Caregiver: suspicious alert', await copilotPage.getByText('Actividad sospechosa').isVisible())
check('Caregiver: virtual cards', await copilotPage.getByText('Tarjetas Virtuales').isVisible())
check('Caregiver: subscription leaks', await copilotPage.getByText('Fugas por suscripción').isVisible())
check(
  'Caregiver: subscription section shows the real bill payee name (not derived from purchases)',
  await waitVisible(copilotPage.getByText(BILLS[0].payee).first())
)
check(
  'Caregiver: emergency button',
  await copilotPage.getByRole('button', { name: /Contactar a soporte/ }).isVisible()
)
await copilotPage.screenshot({ path: `${OUT}/7-copilot-dashboard.png`, fullPage: true })

// Frame integrity
const frame = await copilotPage.locator('div.w-\\[390px\\]').boundingBox()
check(
  'Phone frame is 390x844',
  Math.round(frame.width) === 390 && Math.round(frame.height) === 844,
  `${Math.round(frame.width)}x${Math.round(frame.height)}`
)

check('No console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
