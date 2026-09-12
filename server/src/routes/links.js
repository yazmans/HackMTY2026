import { randomInt } from 'node:crypto'
import { Router } from 'express'
import { db } from '../db.js'
import { emitToCustomer } from '../socket.js'

const LINK_TTL_MINUTES = 10

const statements = {
  findActiveByCode: db.prepare(
    "SELECT id FROM links WHERE code = ? AND status = 'pending' AND expires_at > datetime('now')"
  ),
  insert: db.prepare(`
    INSERT INTO links (senior_customer_id, code, status, expires_at)
    VALUES (?, ?, 'pending', datetime('now', '+${LINK_TTL_MINUTES} minutes'))
  `),
  findById: db.prepare('SELECT * FROM links WHERE id = ?'),
  findPendingByCode: db.prepare(
    "SELECT * FROM links WHERE code = ? AND status = 'pending' ORDER BY id DESC LIMIT 1"
  ),
  markVerified: db.prepare(
    "UPDATE links SET status = 'verified', copilot_customer_id = ? WHERE id = ?"
  ),
  markConsented: db.prepare(
    "UPDATE links SET status = 'consented', permissions = ? WHERE id = ?"
  ),
  findConsentedForCustomer: db.prepare(
    `SELECT * FROM links
     WHERE (senior_customer_id = ? OR copilot_customer_id = ?) AND status = 'consented'
     ORDER BY id DESC LIMIT 1`
  ),
}

const generateSixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

// Retries on the rare chance a still-active code collides with a fresh one.
function generateUniqueCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSixDigitCode()
    if (!statements.findActiveByCode.get(code)) return code
  }
  throw new Error('No se pudo generar un código único, intenta de nuevo.')
}

const isExpired = (row) => row.expires_at <= db.prepare("SELECT datetime('now') AS now").get().now

export function createLinksRouter(io) {
  const router = Router()

  // Senior starts the handshake: server owns the code, not the client.
  router.post('/create', (req, res) => {
    const seniorCustomerId = String(req.body?.seniorCustomerId || '').trim()
    if (!seniorCustomerId) {
      return res.status(400).json({ error: 'Falta seniorCustomerId.' })
    }

    let code
    try {
      code = generateUniqueCode()
    } catch (err) {
      return res.status(503).json({ error: err.message })
    }

    const { lastInsertRowid } = statements.insert.run(seniorCustomerId, code)
    const row = statements.findById.get(lastInsertRowid)

    res.status(201).json({
      id: row.id,
      code: row.code,
      status: row.status,
      expiresAt: row.expires_at,
    })
  })

  // Copilot enters the code. Success only means "code checks out" — the
  // senior still has to consent via /authorize before the link is real.
  router.post('/verify', (req, res) => {
    const code = String(req.body?.code || '').trim()
    const copilotCustomerId = String(req.body?.copilotCustomerId || '').trim()
    if (!code || !copilotCustomerId) {
      return res.status(400).json({ error: 'Falta el código o el customerId del familiar.' })
    }

    const row = statements.findPendingByCode.get(code)
    if (!row) {
      return res.status(404).json({ error: 'Código inválido.' })
    }
    if (isExpired(row)) {
      return res.status(410).json({ error: 'El código expiró. Pide uno nuevo.' })
    }

    statements.markVerified.run(copilotCustomerId, row.id)

    emitToCustomer(io, row.senior_customer_id, 'link:verified', {
      linkId: row.id,
      copilotCustomerId,
    })

    res.json({ linkId: row.id, seniorCustomerId: row.senior_customer_id, status: 'verified' })
  })

  // Senior signs off with their NIP, granting the agreed permissions.
  router.post('/authorize', (req, res) => {
    const linkId = Number(req.body?.linkId)
    if (!Number.isInteger(linkId)) {
      return res.status(400).json({ error: 'Falta linkId.' })
    }

    const row = statements.findById.get(linkId)
    if (!row) {
      return res.status(404).json({ error: 'Vínculo no encontrado.' })
    }
    if (row.status !== 'verified') {
      return res
        .status(409)
        .json({ error: 'Este vínculo todavía no ha sido verificado por tu familiar.' })
    }

    const permissions = req.body?.permissions ?? {}
    statements.markConsented.run(JSON.stringify(permissions), linkId)

    emitToCustomer(io, row.copilot_customer_id, 'link:authorized', { linkId, permissions })

    res.json({ linkId, status: 'consented' })
  })

  // Restores link state on sign-in / page reload.
  router.get('/status/:customerId', (req, res) => {
    const customerId = String(req.params.customerId || '').trim()
    if (!customerId) {
      return res.status(400).json({ error: 'Falta customerId.' })
    }

    const row = statements.findConsentedForCustomer.get(customerId, customerId)
    if (!row) {
      return res.json({ linked: false, role: null })
    }

    const role = row.senior_customer_id === customerId ? 'senior' : 'copilot'
    res.json({ linked: true, role, linkId: row.id })
  })

  return router
}
