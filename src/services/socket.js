// One socket.io connection per signed-in customer. The server joins it to a
// room keyed by customerId (see server/src/socket.js) so it can push linking
// events straight to "whoever is signed in as that customer" in real time —
// no polling, no simulate button.
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

let socket = null

export function connectSocket(customerId) {
  if (socket) socket.disconnect()
  socket = io(API_URL, { query: { customerId } })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

/** The active socket, or null if nobody is signed in. */
export function getSocket() {
  return socket
}
