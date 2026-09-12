// Drives the Eno Family linking flow in a real browser.
// Nessie routes are stubbed so the test exercises UI state, not the network.
// Purchases are no longer fetched from Nessie at all (see useAccountData.js),
// so this imports the same hardcoded dataset the app itself renders, instead
// of keeping a separate (now-stale) local fixture.
import { chromium } from 'playwright'
import { mockPurchases } from '../src/data/mockPurchases.js'

const URL = 'http://localhost:5199/'
const OUT = 'scripts/shots'

const ACCOUNTS = [
  {
    _id: 'acc_1',
    nickname: 'Cuenta Principal',
    type: 'Checking',
    balance: 4820.55,
    account_number: '1234567890123456',
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

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } })

// The live host is api.nessieisreal.com (api.reimaginebanking.com no longer
// resolves — see services/api.js). Only account lookups hit the network now;
// purchases are bundled data, not fetched.
await page.route('**/api.nessieisreal.com/**', async (route) => {
  const req = route.request()
  const url = req.url()
  if (url.includes('/accounts') && url.includes('/customers/')) {
    return route.fulfill({ json: ACCOUNTS })
  }
  if (url.includes('/transfers')) {
    return route.fulfill({ json: req.method() === 'POST' ? { code: 201 } : [] })
  }
  return route.fulfill({ json: {} })
})

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

async function login() {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('Tu nombre').fill('Eleanor')
  await page.getByPlaceholder('5a8a1e....').fill('cust_1')
  await page.getByRole('button', { name: 'Sign In' }).click()
}

// ---------------- Senior branch ----------------
await login()
await page.waitForTimeout(600)

const enoCard = page.getByRole('button', { name: /Eno Family/ })
check('Unlinked dashboard shows Eno Family card', await enoCard.isVisible())
check(
  'Easy Mode hidden before linking',
  !(await page.getByText('Easy Mode').isVisible().catch(() => false))
)
await page.screenshot({ path: `${OUT}/1-unlinked.png` })

await enoCard.click()
await page.getByRole('button', { name: /Vincular mi cuenta/ }).click()
await page.waitForTimeout(300)

const codeText = await page.locator('.tabular-nums').innerText()
check('Senior code is 6 digits formatted NNN-NNN', /^\d{3}-\d{3}$/.test(codeText.trim()), codeText.trim())
check(
  'Waiting spinner text shown',
  await page.getByText(/Esperando a que tu familiar/).isVisible()
)
await page.screenshot({ path: `${OUT}/2-senior-code.png` })

await page.getByRole('button', { name: /Simulate Code Entered/ }).click()
await page.waitForTimeout(300)
check(
  'Consent notice shown',
  await page.getByText(/No podrá realizar transferencias sin tu permiso/).isVisible()
)

// NIP pad: 4 digits, masked.
for (const d of ['1', '2', '3', '4']) {
  await page.getByRole('button', { name: d, exact: true }).click()
}
const masked = await page.locator('div.h-14.w-14 span').allInnerTexts()
check('NIP masked as bullets', masked.join('') === '••••', masked.join(''))
await page.screenshot({ path: `${OUT}/3-consent.png` })

await page.getByRole('button', { name: 'Firmar y Autorizar' }).click()
await page.waitForTimeout(600)

check('Senior unlocked: Easy Mode toggle in header', await page.getByText('Easy Mode').isVisible())
check('Easy Mode balance rendered large', await page.locator('.text-5xl').first().isVisible())
check(
  'Easy Mode shows Últimos movimientos',
  await page.getByText('Últimos movimientos').isVisible()
)
await page.screenshot({ path: `${OUT}/4-senior-easy.png` })

// Toggle off -> standard dashboard, and the card must not reappear.
await page.getByRole('switch').click()
await page.waitForTimeout(400)
check('Standard mode reachable from senior', await page.getByText('Gasto semanal').isVisible())
check(
  'Eno Family card hidden after linking',
  !(await page.getByRole('button', { name: /^Eno Family/ }).isVisible().catch(() => false))
)

// Weekly chart: 7 day-bars computed from the real mock purchases, not the
// old hardcoded [38, 62, 24, 80, 45, 70, 33] array.
const barCount = await page.locator('div.h-24 > div.flex-1').count()
check('Weekly chart renders 7 day bars', barCount === 7, String(barCount))
const peakBarStyle = await page
  .locator('div.h-24 > div.flex-1')
  .first()
  .locator('div.rounded-t')
  .getAttribute('style')
check(
  "Weekly chart's Monday bar reflects real data (100% peak, not a stale hardcoded height)",
  /height:\s*100%/.test(peakBarStyle || ''),
  peakBarStyle || ''
)

// Movimientos recientes: trimmed to the 2 most recent mock purchases.
const movimientosCard = page.locator('div.overflow-hidden', { hasText: 'Movimientos recientes' })
const movimientosCount = await movimientosCard.locator('li').count()
check('Movimientos recientes shows exactly 2 items', movimientosCount === 2, String(movimientosCount))
const movimientosText = await movimientosCard.innerText()
check(
  'Movimientos recientes shows the 2 most recent mock purchases',
  movimientosText.includes(mostRecent.description) &&
    movimientosText.includes(secondMostRecent.description),
  movimientosText.replace(/\n/g, ' | ')
)
await page.screenshot({ path: `${OUT}/5-senior-standard.png` })

// ---------------- Copilot branch ----------------
await login()
await page.waitForTimeout(600)
await page.getByRole('button', { name: /Eno Family/ }).click()
await page.getByRole('button', { name: /Vincular a un familiar/ }).click()
await page.waitForTimeout(300)

for (const d of ['8', '4', '9', '2', '0', '1']) {
  await page.getByRole('button', { name: d, exact: true }).click()
}
await page.screenshot({ path: `${OUT}/6-copilot-code.png` })
await page.getByRole('button', { name: 'Verificar' }).click()
await page.waitForTimeout(600)

const navTab = page.locator('nav').getByText('Eno Family')
check('Copilot unlocked: Eno Family tab in bottom nav', await navTab.isVisible())
check(
  'Bottom nav pinned at frame bottom',
  await page.locator('nav.absolute.bottom-0').isVisible()
)

await navTab.click()
await page.waitForTimeout(800)
check('Caregiver: privacy header', await page.getByText('Monitoreo Activo').isVisible())
check('Caregiver: suspicious alert', await page.getByText('Actividad sospechosa').isVisible())
check('Caregiver: virtual cards', await page.getByText('Tarjetas Virtuales').isVisible())
check('Caregiver: subscription leaks', await page.getByText('Fugas por suscripción').isVisible())
check(
  'Caregiver: detector flagged the recurring mock charge (Spotify Premium)',
  await page.getByText('Spotify Premium').first().isVisible()
)
check(
  'Caregiver: emergency button',
  await page.getByRole('button', { name: /Contactar a soporte/ }).isVisible()
)
await page.screenshot({ path: `${OUT}/7-copilot-dashboard.png`, fullPage: true })

// Frame integrity
const frame = await page.locator('div.w-\\[390px\\]').boundingBox()
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
