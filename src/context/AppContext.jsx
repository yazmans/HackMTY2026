import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession] = useState(null) // { firstName, customerId, accountId }

  const signIn = (firstName, customerId, accountId) =>
    setSession({
      firstName: firstName.trim(),
      customerId: customerId.trim(),
      accountId: accountId.trim(),
    })

  const signOut = () => setSession(null)

  return (
    <AppContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside an AppProvider')
  return ctx
}
