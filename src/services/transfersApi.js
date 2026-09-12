// High-value transfer holds (see /server/src/routes/transfers.js) — the
// senior's over-threshold transfers land here instead of hitting Nessie
// directly, and wait for the linked copilot to approve or hold them.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function handle(res) {
  const body = await res.text().catch(() => '')
  let data = null
  try {
    data = body ? JSON.parse(body) : null
  } catch {
    /* non-JSON body, fall through with data = null */
  }
  if (!res.ok) {
    throw new Error(data?.error || `El servidor respondió con un error (${res.status}).`)
  }
  return data
}

async function request(path, options) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (err) {
    throw new Error(
      `No se pudo contactar al servidor (${API_URL}). Revisa tu conexión. [${err.message}]`
    )
  }
  return handle(res)
}

/** Senior's high-value transfer. Returns the created request row. */
export function requestHighValueTransfer({ seniorCustomerId, payerAccountId, payeeId, amount, concept }) {
  return request('/api/transfers/request', {
    method: 'POST',
    body: JSON.stringify({ seniorCustomerId, payerAccountId, payeeId, amount, concept }),
  })
}

/** Copilot's decision. Returns { id, status }. */
export function resolveTransferRequest(id, decision, copilotCustomerId) {
  return request(`/api/transfers/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ decision, copilotCustomerId }),
  })
}

/** Copilot's live pending-approval list. */
export function getPendingTransferRequests(copilotCustomerId) {
  return request(`/api/transfers/pending/${encodeURIComponent(copilotCustomerId)}`)
}
