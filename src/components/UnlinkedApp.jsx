import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Header } from './Brand.jsx'
import StandardDashboard from './StandardDashboard.jsx'
import TransferModal from './TransferModal.jsx'
import EnoFamilyOnboarding from './EnoFamilyOnboarding.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAccountData } from '../hooks/useAccountData.js'

/**
 * What every user sees before the Eno Family handshake completes:
 * a standard banking dashboard with the linking card injected.
 */
export default function UnlinkedApp() {
  const { session, signOut } = useApp()
  const { account, purchases, loading, error, reload, addPurchase } = useAccountData(
    session.customerId
  )
  const [showTransfer, setShowTransfer] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  return (
    <>
      <Header>
        <button
          onClick={signOut}
          aria-label="Cerrar sesión"
          className="h-12 w-12 flex items-center justify-center text-[#003A6F]"
        >
          <LogOut size={20} />
        </button>
      </Header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <StandardDashboard
          firstName={session.firstName}
          account={account}
          purchases={purchases}
          loading={loading}
          error={error}
          onReload={reload}
          onTransfer={() => setShowTransfer(true)}
          onSignOut={signOut}
          onOpenEnoFamily={() => setShowOnboarding(true)}
        />
      </div>

      {showTransfer && (
        <TransferModal
          payerAccountId={account?._id}
          addPurchase={addPurchase}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {showOnboarding && (
        <EnoFamilyOnboarding onClose={() => setShowOnboarding(false)} />
      )}
    </>
  )
}
