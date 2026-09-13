// Virtual card requests (see /server/src/routes/cardRequests.js) — shared,
// server-persisted state instead of the old per-tab sessionStorage mirror,
// so any login as the senior's customerId sees a pending request in any
// tab or browser.
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

/** Copilot requests a virtual card. Returns { id, category, limit, status, createdAt }. */
export function createCardRequest({ copilotCustomerId, category, limit }) {
  return request('/api/card-requests', {
    method: 'POST',
    body: JSON.stringify({ copilotCustomerId, category, limit }),
  })
}

/** Senior's decision. Returns { id, status }. */
export function resolveCardRequest(id, decision, seniorCustomerId) {
  return request(`/api/card-requests/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ decision, seniorCustomerId }),
  })
}

/** Restores card-request state on sign-in. Returns { request: {...} | null }. */
export function getLatestCardRequest(customerId) {
  return request(`/api/card-requests/latest/${encodeURIComponent(customerId)}`)
}
