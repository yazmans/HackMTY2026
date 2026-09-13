import { Router } from 'express'
import { db } from '../db.js'
import { emitToCustomer } from '../socket.js'
import { createTransfer as createNessieTransfer } from '../nessie.js'

const statements = {
  findConsentedLinkForSenior: db.prepare(
    "SELECT * FROM links WHERE senior_customer_id = ? AND status = 'consented' ORDER BY id DESC LIMIT 1"
  ),
  insert: db.prepare(`
    INSERT INTO transfer_requests (link_id, payer_account_id, payee_id, amount, concept, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `),
  findById: db.prepare('SELECT * FROM transfer_requests WHERE id = ?'),
  findLinkById: db.prepare('SELECT * FROM links WHERE id = ?'),
  updateStatus: db.prepare('UPDATE transfer_requests SET status = ? WHERE id = ?'),
  findPendingForCopilot: db.prepare(`
    SELECT tr.* FROM transfer_requests tr
    JOIN links l ON l.id = tr.link_id
    WHERE l.copilot_customer_id = ? AND tr.status = 'pending'
    ORDER BY tr.id DESC
  `),
}

const serialize = (row) => ({
  id: row.id,
  payerAccountId: row.payer_account_id,
  payeeId: row.payee_id,
  amount: row.amount,
  concept: row.concept,
  status: row.status,
  createdAt: row.created_at,
})

export function createTransfersRouter(io) {
  const router = Router()

  // Senior's high-value transfer lands here instead of hitting Nessie
  // directly — only allowed if they have a copilot who has actually consented.
  router.post('/request', (req, res) => {
    const seniorCustomerId = String(req.body?.seniorCustomerId || '').trim()
    const payerAccountId = String(req.body?.payerAccountId || '').trim()
    const payeeId = String(req.body?.payeeId || '').trim()
    const amount = Number(req.body?.amount)
    const concept = String(req.body?.concept || '').trim()

    if (!seniorCustomerId || !payerAccountId || !payeeId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Faltan datos de la transferencia.' })
    }

    const link = statements.findConsentedLinkForSenior.get(seniorCustomerId)
    if (!link) {
      return res
        .status(403)
        .json({ error: 'No tienes un copiloto vinculado para autorizar este monto.' })
    }

    const { lastInsertRowid } = statements.insert.run(
      link.id,
      payerAccountId,
      payeeId,
      amount,
      concept
    )
    const row = statements.findById.get(lastInsertRowid)

    emitToCustomer(io, link.copilot_customer_id, 'transfer:requested', serialize(row))

    res.status(201).json(serialize(row))
  })

  // Copilot's decision. Only the copilot on the request's own link may call this.
  router.post('/:id/resolve', async (req, res) => {
    const id = Number(req.params.id)
    const decision = req.body?.decision
    const copilotCustomerId = String(req.body?.copilotCustomerId || '').trim()

    if (!Number.isInteger(id) || !['approved', 'held'].includes(decision) || !copilotCustomerId) {
      return res.status(400).json({ error: 'Datos inválidos.' })
    }

    const row = statements.findById.get(id)
    if (!row) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' })
    }
    if (row.status !== 'pending') {
      return res.status(409).json({ error: 'Esta solicitud ya fue resuelta.' })
    }

    const link = statements.findLinkById.get(row.link_id)
    if (!link || link.copilot_customer_id !== copilotCustomerId) {
      return res.status(403).json({ error: 'No autorizado para resolver esta solicitud.' })
    }

    if (decision === 'approved') {
      try {
        await createNessieTransfer(row.payer_account_id, row.payee_id, row.amount, row.concept || 'Transfer')
      } catch (err) {
        const message = `No se pudo ejecutar la transferencia en Nessie: ${err.message}`
        // Server-side only — never sent to either client — so a real cause
        // (missing key, Nessie down, bad payload) is visible in the backend
        // terminal instead of only inferable from the generic client message.
        console.error(`[transfers] resolve(${id}) approved but Nessie call failed:`, err)

        // Leave the request 'pending' so the copilot can retry — but the
        // senior must not be left staring at a spinner forever just because
        // this side failed. Tell them right away, over the same channel
        // they're already listening on for the success case.
        emitToCustomer(io, link.senior_customer_id, 'transfer:resolved', {
          id,
          decision: 'failed',
          amount: row.amount,
          concept: row.concept,
          payeeId: row.payee_id,
          error: message,
        })

        return res.status(502).json({ error: message })
      }
    }

    statements.updateStatus.run(decision, id)

    emitToCustomer(io, link.senior_customer_id, 'transfer:resolved', {
      id,
      decision,
      amount: row.amount,
      concept: row.concept,
      payeeId: row.payee_id,
    })

    res.json({ id, status: decision })
  })

  // Live list for the copilot's pending-approval UI.
  router.get('/pending/:copilotCustomerId', (req, res) => {
    const copilotCustomerId = String(req.params.copilotCustomerId || '').trim()
    if (!copilotCustomerId) {
      return res.status(400).json({ error: 'Falta copilotCustomerId.' })
    }
    const rows = statements.findPendingForCopilot.all(copilotCustomerId)
    res.json(rows.map(serialize))
  })

  return router
}
