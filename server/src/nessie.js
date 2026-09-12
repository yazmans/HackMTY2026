// Minimal server-side Nessie client. The frontend's src/services/api.js
// can't be reused here — it reads its key from Vite's import.meta.env,
// which doesn't exist in this Node process — so this mirrors just the one
// call the backend needs: executing an approved high-value transfer.
const BASE_URL = 'https://api.nessieisreal.com'

async function handle(res) {
  const body = await res.text().catch(() => '')
  if (!res.ok) {
    let detail = body
    try {
      const parsed = JSON.parse(body)
      if (typeof parsed === 'string') detail = parsed
    } catch {
      /* keep raw text */
    }
    throw new Error(`Nessie ${res.status}: ${detail || res.statusText}`)
  }
  return body ? JSON.parse(body) : null
}

/** Same schema/behavior as src/services/api.js's createTransfer. */
export async function createTransfer(payerAccountId, payeeId, amount, description = 'Transfer') {
  const apiKey = process.env.NESSIE_API_KEY || ''
  if (!apiKey) {
    throw new Error('Falta NESSIE_API_KEY en server/.env.')
  }
  const qs = new URLSearchParams({ key: apiKey, payee_id: payeeId })
  let res
  try {
    res = await fetch(`${BASE_URL}/accounts/${payerAccountId}/transfers?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        amount: Number(amount),
        description,
      }),
    })
  } catch (err) {
    throw new Error(`No se pudo contactar a Nessie (${BASE_URL}). [${err.message}]`)
  }
  return handle(res)
}
