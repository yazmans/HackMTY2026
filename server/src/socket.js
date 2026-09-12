// Rooms are keyed by customerId so the server can push an event straight to
// "whoever is signed in as that customer" without tracking socket ids itself.
const roomFor = (customerId) => `customer:${customerId}`

/** Joins each connecting socket to its customerId's room. */
export function attachSocket(io) {
  io.on('connection', (socket) => {
    const { customerId } = socket.handshake.query
    if (typeof customerId === 'string' && customerId) {
      socket.join(roomFor(customerId))
    }
  })
}

/** Pushes `event` to every socket currently signed in as `customerId`. */
export function emitToCustomer(io, customerId, event, payload) {
  if (!customerId) return
  io.to(roomFor(customerId)).emit(event, payload)
}
