import 'dotenv/config'
import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { createLinksRouter } from './routes/links.js'
import { createTransfersRouter } from './routes/transfers.js'
import { attachSocket } from './socket.js'

const PORT = process.env.PORT || 4000
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5199')
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

app.get('/health', (req, res) => res.json({ ok: true }))

httpServer.listen(PORT, () => {
  console.log(`Kin links server listening on http://localhost:${PORT}`)
})
