// Real Capital One Nessie API service.
// Get a key at http://api.reimaginebanking.com and paste it below.
export const NESSIE_API_KEY = 'API_KEY_HERE'

const BASE_URL = 'http://api.reimaginebanking.com'

const withKey = (path) => `${BASE_URL}${path}?key=${NESSIE_API_KEY}`

async function handle(res) {
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Nessie ${res.status}: ${body || res.statusText}`)
  }
  return res.json()
}

export async function getCustomerAccounts(customerId) {
  const res = await fetch(withKey(`/customers/${customerId}/accounts`))
  return handle(res)
}

export async function getAccountPurchases(accountId) {
  const res = await fetch(withKey(`/accounts/${accountId}/purchases`))
  return handle(res)
}

export async function createTransfer(payerAccountId, payeeId, amount) {
  const res = await fetch(withKey(`/accounts/${payerAccountId}/transfers`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      medium: 'balance',
      payee_id: payeeId,
      amount: amount,
      transaction_date: '2026-09-12',
      description: 'Transfer',
    }),
  })
  return handle(res)
}

export async function getAccount(accountId) {
  const res = await fetch(withKey(`/accounts/${accountId}`))
  return handle(res)
}

export async function getMerchant(merchantId) {
  const res = await fetch(withKey(`/merchants/${merchantId}`))
  return handle(res)
}
