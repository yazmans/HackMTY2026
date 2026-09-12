// Capital One Nessie API service.
//
// Host note: the old `api.reimaginebanking.com` hostname no longer resolves in
// DNS, which surfaces in the browser as a bare "Failed to fetch" (a network
// error, so there is no HTTP status to report). The live host is
// api.nessieisreal.com, over HTTPS.
//
// Key comes from .env as VITE_NESSIE_API_KEY.
export const NESSIE_API_KEY = import.meta.env.VITE_NESSIE_API_KEY ?? ''

const BASE_URL = 'https://api.nessieisreal.com'

const withKey = (path, params = {}) => {
  const qs = new URLSearchParams({ key: NESSIE_API_KEY, ...params })
  return `${BASE_URL}${path}?${qs}`
}

async function handle(res) {
  const body = await res.text().catch(() => '')
  if (!res.ok) {
    // Nessie returns validation failures as a JSON-encoded string.
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

async function request(url, options) {
  if (!NESSIE_API_KEY) {
    throw new Error(
      'Falta VITE_NESSIE_API_KEY. Agrégala en el archivo .env y reinicia el servidor.'
    )
  }
  let res
  try {
    res = await fetch(url, options)
  } catch (err) {
    // fetch only rejects on network-level failures (DNS, CORS, offline).
    throw new Error(
      `No se pudo contactar a Nessie (${BASE_URL}). Revisa tu conexión. [${err.message}]`
    )
  }
  return handle(res)
}

export async function getCustomerAccounts(customerId) {
  return request(withKey(`/customers/${customerId}/accounts`))
}

export async function getAccountPurchases(accountId) {
  return request(withKey(`/accounts/${accountId}/purchases`))
}

/**
 * Creates a transfer out of `payerAccountId`.
 *
 * This API's TransferCreate schema requires transaction_date/status/amount/
 * description and rejects `medium` and `payee_id` in the body, so the payee is
 * passed as a query param instead.
 */
export async function createTransfer(payerAccountId, payeeId, amount) {
  return request(
    withKey(`/accounts/${payerAccountId}/transfers`, { payee_id: payeeId }),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        amount: Number(amount),
        description: 'Transfer',
      }),
    }
  )
}

export async function getAccount(accountId) {
  return request(withKey(`/accounts/${accountId}`))
}

export async function getAccountTransfers(accountId) {
  return request(withKey(`/accounts/${accountId}/transfers`))
}

export async function getAccountBills(accountId) {
  return request(withKey(`/accounts/${accountId}/bills`))
}

export async function getMerchant(merchantId) {
  return request(withKey(`/merchants/${merchantId}`))
}

export async function getCustomers() {
  return request(withKey('/customers'))
}
