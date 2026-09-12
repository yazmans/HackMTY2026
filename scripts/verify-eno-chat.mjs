// Verifies the Eno chatbot -> senior approval -> virtual card handshake.
// Uses a deliberately odd category/limit so any hardcoded value would show up.
import { chromium } from 'playwright'

const URL = 'http://localhost:5199/'
const CUSTOMER = '3c44ce3b-f749-4da3-9eec-d3e048ba529d'
const ACCOUNT = '8af07e4b-1ec4-4b01-bca8-fc033ea2007c'

// Distinctive: not the placeholder (200.00), not the first category.
const LIMIT = '737'
const CATEGORY = 'Transporte'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

async function login() {
  await page.getByPlaceholder('Tu nombre').fill('User')
  await page.getByPlaceholder('5a8a1e....').fill(CUSTOMER)
  await page.getByPlaceholder('5a8a2f....').fill(ACCOUNT)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForTimeout(1500)
}

async function link(kind) {
  await page.getByRole('button', { name: /Eno Family/ }).first().click()
  if (kind === 'copilot') {
    await page.getByRole('button', { name: /Vincular a un familiar/ }).click()
    for (const d of ['8', '4', '9', '2', '0', '1'])
      await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: 'Verificar' }).click()
  } else {
    await page.getByRole('button', { name: /Vincular mi cuenta/ }).click()
    await page.getByRole('button', { name: /Simulate Code Entered/ }).click()
    for (const d of ['1', '2', '3', '4'])
      await page.getByRole('button', { name: d, exact: true }).click()
    await page.getByRole('button', { name: 'Firmar y Autorizar' }).click()
  }
  await page.waitForTimeout(1500)
}

// ---------- Copilot: run the Eno chat ----------
await page.goto(URL, { waitUntil: 'networkidle' })
await login()
await link('copilot')

check('FAB visible above bottom nav', await page.getByLabel('Abrir Eno').isVisible())
await page.getByLabel('Abrir Eno').click()
await page.waitForTimeout(500)

check('Chat header', await page.getByText('Eno - Asistente Inteligente').isVisible())
check('Step 0 greeting', await page.getByText(/no hay movimientos inusuales/).isVisible())
check(
  'Step 0 quick replies',
  (await page.getByRole('button', { name: 'Revisar suscripciones' }).isVisible()) &&
    (await page.getByRole('button', { name: /Generar Tarjeta Virtual/ }).isVisible())
)
await page.screenshot({ path: 'scripts/shots/eno-1-step0.png' })

await page.getByRole('button', { name: /Generar Tarjeta Virtual/ }).click()
await page.waitForTimeout(300)
check('Step 1 category prompt', await page.getByText(/categoría de comercios/).isVisible())
check('Prior user turn persists', await page.getByText('Generar Tarjeta Virtual Delegada').isVisible())

await page.getByRole('button', { name: CATEGORY, exact: true }).click()
await page.waitForTimeout(300)
check(`Step 2 echoes MCC ${CATEGORY}`, await page.getByText(new RegExp(`restringiremos el MCC a ${CATEGORY}`)).isVisible())
await page.screenshot({ path: 'scripts/shots/eno-2-step2.png' })

await page.getByPlaceholder('Límite de gasto (USD)').fill(LIMIT)
await page.locator('button[type="submit"][aria-label="Enviar"]').click()
await page.waitForTimeout(300)

const step3 = await page.locator('body').innerText()
check(
  'Step 3 authorization text has dynamic category + limit',
  step3.includes(`Tarjeta Virtual de ${CATEGORY}`) && step3.includes('$737.00'),
  step3.match(/Para emitir[^\n]*/)?.[0] || ''
)
await page.screenshot({ path: 'scripts/shots/eno-3-step3.png' })

await page.getByRole('button', { name: 'Enviar solicitud a Eleanor' }).click()
await page.waitForTimeout(800)

check('Toast shown', await page.getByText('Solicitud enviada a Eleanor').isVisible())
check('Chat closed', !(await page.getByText('Eno - Asistente Inteligente').isVisible().catch(() => false)))
check('Loader waiting for Eleanor', await page.getByText(/Esperando autorización de Eleanor/).isVisible())
const loaderText = await page.locator('body').innerText()
check('Loader shows dynamic values', loaderText.includes(CATEGORY) && loaderText.includes('$737.00'))
await page.screenshot({ path: 'scripts/shots/eno-4-waiting.png' })

// ---------- Senior: approve ----------
await page.getByLabel('Cerrar sesión').click()
await page.waitForTimeout(500)
await login()
await link('senior')

check('Approval modal auto-opened for senior', await page.getByText('Solicitud de autorización').isVisible())
const modalText = await page.locator('body').innerText()
check(
  'Modal uses exact dynamic template',
  /Marcus solicita crear una Tarjeta Virtual de\s+Transporte\s+con límite de\s+\$737\.00\.\s+Ingresa tu NIP para autorizar\./.test(
    modalText.replace(/\s+/g, ' ')
  ) ||
    (modalText.includes('Marcus solicita crear una Tarjeta Virtual de') &&
      modalText.includes(CATEGORY) &&
      modalText.includes('$737.00') &&
      modalText.includes('Ingresa tu NIP para autorizar')),
  modalText.match(/Marcus solicita[^]*?autorizar\./)?.[0]?.replace(/\s+/g, ' ') || ''
)
await page.screenshot({ path: 'scripts/shots/eno-5-approval.png' })

for (const d of ['9', '9', '9', '9'])
  await page.getByRole('button', { name: d, exact: true }).click()
await page.getByRole('button', { name: 'Autorizar' }).click()
await page.waitForTimeout(800)
check('Modal closed after approval', !(await page.getByText('Solicitud de autorización').isVisible().catch(() => false)))

// ---------- Copilot: see the issued card ----------
await page.getByRole('switch').click() // leave Easy Mode to reach sign out
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Cerrar sesión/ }).click()
await page.waitForTimeout(500)
await login()
await link('copilot')
await page.locator('nav').getByText('Eno Family').click()
await page.waitForTimeout(1200)

const cardText = await page.locator('body').innerText()
check('Loader gone after approval', !/Esperando autorización/.test(cardText))
check('Virtual card shows dynamic category', cardText.includes(CATEGORY))
check('Virtual card shows dynamic limit $737.00', cardText.includes('$737.00'))
check('Card marked authorized', /Autorizada por Eleanor/.test(cardText))
check('No stale placeholder $200 on card', !/\$200\.00/.test(cardText))
await page.screenshot({ path: 'scripts/shots/eno-6-card.png', fullPage: true })

check('No page errors', errors.length === 0, errors[0] || '')

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
