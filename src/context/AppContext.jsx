import { createContext, useContext, useEffect, useState } from 'react'
import { getLinkStatus } from '../services/linksApi.js'
import { createCardRequest, resolveCardRequest, getLatestCardRequest } from '../services/cardRequestsApi.js'
import { connectSocket, disconnectSocket } from '../services/socket.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession] = useState(null) // { firstName, customerId }

  // Eno Family linking state — backed by the /server links API + socket.io,
  // not simulated. See services/linksApi.js and services/socket.js.
  const [enoFamilyRole, setEnoFamilyRole] = useState(null) // null | 'senior' | 'copilot'
  const [isLinked, setIsLinked] = useState(false)
  const [linkStatusLoading, setLinkStatusLoading] = useState(false)
  // The senior side's real customerId, from the link itself — never a
  // manually-typed value. Lets the copilot look up the senior's actual
  // Nessie account (see CopilotApp.jsx) instead of guessing/pasting one.
  const [linkedSeniorCustomerId, setLinkedSeniorCustomerId] = useState(null)

  // Virtual card request handshake — backed by /server/src/routes/cardRequests.js.
  // Previously mirrored to sessionStorage, which is per-TAB and never reached
  // the senior in a different tab/browser at all; this is real shared state.
  // pendingCardRequest: { id, category, limit } | null
  // cardRequestStatus:  'idle' | 'pending' | 'approved'
  const [pendingCardRequest, setPendingCardRequestState] = useState(null)
  const [cardRequestStatus, setCardRequestStatusState] = useState('idle')

  // One socket per signed-in customer, and a one-time restore of whatever
  // link / card-request state already exists server-side — real persistence,
  // works across tabs, browsers, and sign-outs.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    setLinkStatusLoading(true)
    const socket = connectSocket(session.customerId)

    getLinkStatus(session.customerId)
      .then((status) => {
        if (cancelled) return
        if (status.linked) completeLink(status.role, status.seniorCustomerId)
      })
      .catch(() => {
        /* backend unreachable — fall back to the unlinked flow */
      })
      .finally(() => {
        if (!cancelled) setLinkStatusLoading(false)
      })

    getLatestCardRequest(session.customerId)
      .then(({ request }) => {
        if (cancelled || !request) return
        if (request.status === 'pending' || request.status === 'approved') {
          setPendingCardRequestState(request)
          setCardRequestStatusState(request.status)
        }
      })
      .catch(() => {
        /* backend unreachable — no pending request to restore */
      })

    // Real-time: the senior finds out the moment the copilot asks (no
    // refresh needed, in any tab), and the copilot finds out the moment the
    // senior decides.
    const onRequested = (request) => {
      setPendingCardRequestState(request)
      setCardRequestStatusState('pending')
    }
    const onApproved = (request) => {
      setPendingCardRequestState(request)
      setCardRequestStatusState('approved')
    }
    const onRejected = () => {
      setPendingCardRequestState(null)
      setCardRequestStatusState('idle')
    }
    socket.on('card:requested', onRequested)
    socket.on('card:approved', onApproved)
    socket.on('card:rejected', onRejected)

    return () => {
      cancelled = true
      socket.off('card:requested', onRequested)
      socket.off('card:approved', onApproved)
      socket.off('card:rejected', onRejected)
      disconnectSocket()
    }
  }, [session])

  const signIn = (firstName, customerId) =>
    setSession({
      firstName: firstName.trim(),
      customerId: customerId.trim(),
    })

  const signOut = () => {
    setSession(null)
    resetLink()
    setPendingCardRequestState(null)
    setCardRequestStatusState('idle')
  }

  const completeLink = (role, seniorCustomerId = null) => {
    setEnoFamilyRole(role)
    setIsLinked(true)
    setLinkedSeniorCustomerId(seniorCustomerId)
  }

  const resetLink = () => {
    setEnoFamilyRole(null)
    setIsLinked(false)
    setLinkedSeniorCustomerId(null)
  }

  /** Copilot requests a virtual card — from the Eno chat OR the direct form;
   * both go through this same authorization-required path. */
  const requestVirtualCard = async ({ category, limit }) => {
    const created = await createCardRequest({
      copilotCustomerId: session.customerId,
      category,
      limit: Number(limit),
    })
    setPendingCardRequestState(created)
    setCardRequestStatusState('pending')
  }

  /** Senior authorizes it with their NIP. */
  const approveCardRequest = async () => {
    await resolveCardRequest(pendingCardRequest.id, 'approved', session.customerId)
    setCardRequestStatusState('approved')
  }

  /** Senior declines it. */
  const rejectCardRequest = async () => {
    await resolveCardRequest(pendingCardRequest.id, 'rejected', session.customerId)
    setPendingCardRequestState(null)
    setCardRequestStatusState('idle')
  }

  /** Copilot dismisses the approved-card view. Local only — the approval stands. */
  const dismissCardRequest = () => {
    setPendingCardRequestState(null)
    setCardRequestStatusState('idle')
  }

  return (
    <AppContext.Provider
      value={{
        session,
        signIn,
        signOut,
        enoFamilyRole,
        isLinked,
        linkStatusLoading,
        linkedSeniorCustomerId,
        completeLink,
        resetLink,
        pendingCardRequest,
        cardRequestStatus,
        requestVirtualCard,
        approveCardRequest,
        rejectCardRequest,
        dismissCardRequest,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside an AppProvider')
  return ctx
}
