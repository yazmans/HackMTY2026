import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession] = useState(null) // { firstName, customerId, accountId }

  // Eno Family linking state.
  const [enoFamilyRole, setEnoFamilyRole] = useState(null) // null | 'senior' | 'copilot'
  const [linkCode, setLinkCode] = useState('')
  const [isLinked, setIsLinked] = useState(false)

  const signIn = (firstName, customerId, accountId) =>
    setSession({
      firstName: firstName.trim(),
      customerId: customerId.trim(),
      accountId: accountId.trim(),
    })

  const signOut = () => {
    setSession(null)
    resetLink()
  }

  // Completes the handshake for whichever side finished it.
  const completeLink = (role) => {
    setEnoFamilyRole(role)
    setIsLinked(true)
  }

  const resetLink = () => {
    setEnoFamilyRole(null)
    setLinkCode('')
    setIsLinked(false)
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
