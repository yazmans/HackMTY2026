// Eno Family linking backend (see /server) — issues and verifies the
// senior<->copilot pairing code server-side instead of simulating it here.
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

/** Senior starts the handshake. Returns { id, code, status, expiresAt }. */
export function createLink(seniorCustomerId) {
  return request('/api/links/create', {
    method: 'POST',
    body: JSON.stringify({ seniorCustomerId }),
  })
}

/** Copilot enters the code. Returns { linkId, seniorCustomerId, status }. */
export function verifyLink(code, copilotCustomerId) {
  return request('/api/links/verify', {
    method: 'POST',
    body: JSON.stringify({ code, copilotCustomerId }),
  })
}

/** Senior signs off with their NIP. Returns { linkId, status }. */
export function authorizeLink(linkId, permissions) {
  return request('/api/links/authorize', {
    method: 'POST',
    body: JSON.stringify({ linkId, permissions }),
  })
}

/** Restores link state on sign-in. Returns { linked, role, linkId? }. */
export function getLinkStatus(customerId) {
  return request(`/api/links/status/${encodeURIComponent(customerId)}`)
}
