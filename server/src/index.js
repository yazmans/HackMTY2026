import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { createLinksRouter } from './routes/links.js'
import { createTransfersRouter } from './routes/transfers.js'
import { createCardRequestsRouter } from './routes/cardRequests.js'
import { attachSocket } from './socket.js'

// `dotenv/config`'s zero-arg form resolves .env against process.cwd(), which
// is wrong whenever this is launched from anywhere but server/ itself (e.g.
// `node server/src/index.js` from the repo root) — it then silently loads
// nothing and env-dependent code (like NESSIE_API_KEY) fails with a
// confusing "missing" error instead of an obviously-wrong path. Resolve
// against this file's own location instead, so it's correct regardless of cwd.
config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') })

const PORT = process.env.PORT || 4000
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

const app = express()
app.use(cors({ origin: CORS_ORIGIN }))
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: CORS_ORIGIN } })
attachSocket(io)

app.use('/api/links', createLinksRouter(io))
app.use('/api/transfers', createTransfersRouter(io))
app.use('/api/card-requests', createCardRequestsRouter(io))

app.get('/health', (req, res) => res.json({ ok: true }))

httpServer.listen(PORT, () => {
  console.log(`Kin links server listening on http://localhost:${PORT}`)
  // Loud on purpose: a missing key here otherwise only surfaces later, as a
  // confusing 502 the moment someone approves a high-value transfer — and a
  // process left running from before .env was fixed will never pick this up
  // without a real restart (editing .env does not hot-reload).
  console.log(
    process.env.NESSIE_API_KEY
      ? `NESSIE_API_KEY loaded (…${process.env.NESSIE_API_KEY.slice(-4)})`
      : 'NESSIE_API_KEY is NOT set — high-value transfer approval will fail. Check server/.env.'
  )
})
