import { Router } from 'express'
import { db } from '../db.js'
import { emitToCustomer } from '../socket.js'

const statements = {
  findConsentedLinkForCopilot: db.prepare(
    "SELECT * FROM links WHERE copilot_customer_id = ? AND status = 'consented' ORDER BY id DESC LIMIT 1"
  ),
  insert: db.prepare(`
    INSERT INTO card_requests (senior_customer_id, copilot_customer_id, category, card_limit, status)
    VALUES (?, ?, ?, ?, 'pending')
  `),
  findById: db.prepare('SELECT * FROM card_requests WHERE id = ?'),
  updateStatus: db.prepare('UPDATE card_requests SET status = ? WHERE id = ?'),
  findLatestForCustomer: db.prepare(`
    SELECT * FROM card_requests
    WHERE senior_customer_id = ? OR copilot_customer_id = ?
    ORDER BY id DESC LIMIT 1
  `),
}

const serialize = (row) => ({
  id: row.id,
  category: row.category,
  limit: row.card_limit,
  status: row.status,
  createdAt: row.created_at,
})

export function createCardRequestsRouter(io) {
  const router = Router()

  // Copilot requests a virtual card for their linked senior — this is the
  // ONE path a card request can be created through; the old "direct" path
  // that skipped authorization entirely has been removed on the frontend.
  router.post('/', (req, res) => {
    const copilotCustomerId = String(req.body?.copilotCustomerId || '').trim()
    const category = String(req.body?.category || '').trim()
    const limit = Number(req.body?.limit)

    if (!copilotCustomerId || !category || !Number.isFinite(limit) || limit <= 0) {
      return res.status(400).json({ error: 'Datos de la tarjeta inválidos.' })
    }

    const link = statements.findConsentedLinkForCopilot.get(copilotCustomerId)
    if (!link) {
      return res
        .status(403)
        .json({ error: 'No tienes un familiar vinculado para solicitar una tarjeta.' })
    }

    const { lastInsertRowid } = statements.insert.run(
      link.senior_customer_id,
      copilotCustomerId,
      category,
      limit
    )
    const row = statements.findById.get(lastInsertRowid)

    emitToCustomer(io, link.senior_customer_id, 'card:requested', serialize(row))

    res.status(201).json(serialize(row))
  })

  // Senior's decision, signed with their NIP client-side before this call.
  router.post('/:id/resolve', (req, res) => {
    const id = Number(req.params.id)
    const decision = req.body?.decision
    const seniorCustomerId = String(req.body?.seniorCustomerId || '').trim()

    if (!Number.isInteger(id) || !['approved', 'rejected'].includes(decision) || !seniorCustomerId) {
      return res.status(400).json({ error: 'Datos inválidos.' })
    }

    const row = statements.findById.get(id)
    if (!row) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' })
    }
    if (row.senior_customer_id !== seniorCustomerId) {
      return res.status(403).json({ error: 'No autorizado para resolver esta solicitud.' })
    }
    if (row.status !== 'pending') {
      return res.status(409).json({ error: 'Esta solicitud ya fue resuelta.' })
    }

    statements.updateStatus.run(decision, id)

    emitToCustomer(
      io,
      row.copilot_customer_id,
      decision === 'approved' ? 'card:approved' : 'card:rejected',
      serialize({ ...row, status: decision })
    )

    res.json({ id, status: decision })
  })

  // Restores card-request state on sign-in, for either role, in any tab —
  // this is what replaces the old sessionStorage mirror.
  router.get('/latest/:customerId', (req, res) => {
    const customerId = String(req.params.customerId || '').trim()
    if (!customerId) {
      return res.status(400).json({ error: 'Falta customerId.' })
    }

    const row = statements.findLatestForCustomer.get(customerId, customerId)
    res.json({ request: row ? serialize(row) : null })
  })

  return router
}
