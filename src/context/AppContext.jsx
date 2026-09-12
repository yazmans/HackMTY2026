import { createContext, useContext, useEffect, useState } from 'react'

const AppContext = createContext(null)

// The senior and the copilot are separate sessions. In this prototype they are
// demoed one after the other in the same tab, so the card request is mirrored
// into sessionStorage: signing out to switch personas must not lose it. This is
// the seam a real Vultr/Firebase listener would replace.
const STORE_KEY = 'eno.cardRequest'

function readStore() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStore(value) {
  try {
    if (value) sessionStorage.setItem(STORE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(STORE_KEY)
  } catch {
    /* storage unavailable; in-memory state still works */
  }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null) // { firstName, customerId, accountId }

  // Eno Family linking state.
  const [enoFamilyRole, setEnoFamilyRole] = useState(null) // null | 'senior' | 'copilot'
  const [linkCode, setLinkCode] = useState('')
  const [isLinked, setIsLinked] = useState(false)

  // Virtual card request handshake.
  // pendingCardRequest: { category, limit } | null
  // cardRequestStatus:  'idle' | 'pending' | 'approved'
  const initial = readStore()
  const [pendingCardRequest, setPendingCardRequestState] = useState(
    initial?.request ?? null
  )
  const [cardRequestStatus, setCardRequestStatusState] = useState(
    initial?.status ?? 'idle'
  )

  // Mirror the handshake to sessionStorage on every change.
  useEffect(() => {
    if (!pendingCardRequest && cardRequestStatus === 'idle') writeStore(null)
    else writeStore({ request: pendingCardRequest, status: cardRequestStatus })
  }, [pendingCardRequest, cardRequestStatus])

  // Pick up changes made by the other persona (other tab, or a later mount).
  useEffect(() => {
    const sync = () => {
      const stored = readStore()
      setPendingCardRequestState(stored?.request ?? null)
      setCardRequestStatusState(stored?.status ?? 'idle')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const signIn = (firstName, customerId, accountId) =>
    setSession({
      firstName: firstName.trim(),
      customerId: customerId.trim(),
      accountId: accountId.trim(),
    })

  // Note: the card request deliberately survives sign-out so the senior can log
  // in and approve what the copilot requested.
  const signOut = () => {
    setSession(null)
    resetLink()
  }

  const completeLink = (role) => {
    setEnoFamilyRole(role)
    setIsLinked(true)
  }

  const resetLink = () => {
    setEnoFamilyRole(null)
    setLinkCode('')
    setIsLinked(false)
  }

  /** Copilot submits a card request from the Eno chat. */
  const requestVirtualCard = ({ category, limit }) => {
    setPendingCardRequestState({ category, limit: Number(limit) })
    setCardRequestStatusState('pending')
  }

  /** Senior authorizes it with their NIP. */
  const approveCardRequest = () => setCardRequestStatusState('approved')

  const clearCardRequest = () => {
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
        setEnoFamilyRole,
        linkCode,
        setLinkCode,
        isLinked,
        setIsLinked,
        completeLink,
        resetLink,
        pendingCardRequest,
        cardRequestStatus,
        requestVirtualCard,
        approveCardRequest,
        clearCardRequest,
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
