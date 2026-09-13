import { useEffect, useState } from 'react'
import {
  Home,
  ArrowLeftRight,
  ShieldCheck,
  LogOut,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react'
import { Header } from './Brand.jsx'
import StandardDashboard from './StandardDashboard.jsx'
import TransferModal from './TransferModal.jsx'
import CoPilotTab from './CoPilotTab.jsx'
import EnoChatbot from './EnoChatbot.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAccountData } from '../hooks/useAccountData.js'
import { getCustomerAccounts, getAccountBills } from '../services/api.js'

const TABS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
  { key: 'copilot', label: 'Eno Family', icon: ShieldCheck },
]

/** Unlocked for enoFamilyRole === 'copilot'. */
export default function CopilotApp() {
  const { session, signOut, linkedSeniorCustomerId } = useApp()
  const [tab, setTab] = useState('home')
  const [showTransfer, setShowTransfer] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [toast, setToast] = useState('')

  const { account, purchases, loading, error, reload, addPurchase } = useAccountData(
    session.customerId
  )

  // The monitored (senior) account — the real one from the Eno Family link,
  // never manually typed. Same "first account for this customerId" rule
  // useAccountData already uses for the signed-in user's own account.
  const seniorAccount = useSeniorAccount(linkedSeniorCustomerId)
  const monitored = useMonitoredBills(seniorAccount.account?._id)
  const subscriptions = monitored.bills

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const handleRequestSubmitted = () => {
    setTab('copilot')
    setToast('Solicitud enviada a tu familiar')
  }

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

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {tab === 'home' && (
          <StandardDashboard
            firstName={session.firstName}
            account={account}
            purchases={purchases}
            loading={loading}
            error={error}
            onReload={reload}
            onTransfer={() => setShowTransfer(true)}
            onSignOut={signOut}
          />
        )}

        {tab === 'transfers' && <TransfersTab onNew={() => setShowTransfer(true)} />}

        {tab === 'copilot' && (
          <CoPilotTab
            subscriptions={subscriptions}
            loading={seniorAccount.loading || monitored.loading}
            error={seniorAccount.error || monitored.error}
          />
        )}
      </div>

      {/* Eno FAB, floating above the bottom nav. */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          aria-label="Abrir Eno"
          className="absolute bottom-[96px] right-4 z-[55] h-14 w-14 rounded-full bg-[#D03027] text-white shadow-lg flex items-center justify-center active:opacity-90"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {toast && (
        <div className="absolute bottom-[176px] left-4 right-4 z-[85] rounded-xl bg-[#003A6F] text-white px-4 py-3 shadow-lg flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      )}

      <nav className="absolute bottom-0 w-full h-[80px] bg-white border-t flex justify-around items-center z-50 pb-4">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex flex-col items-center gap-1 w-24 h-12 justify-center"
            >
              <Icon size={22} className={active ? 'text-[#D03027]' : 'text-gray-400'} />
              <span
                className={`text-[11px] font-semibold ${
                  active ? 'text-[#D03027]' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {showTransfer && (
        <TransferModal
          payerAccountId={account?._id}
          addPurchase={addPurchase}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {showChat && (
        <EnoChatbot
          subscriptions={subscriptions}
          onClose={() => setShowChat(false)}
          onSubmitted={handleRequestSubmitted}
        />
      )}
    </>
  )
}

/**
 * The linked senior's real Nessie account — resolved from their customerId
 * (which comes from the established Eno Family link, see AppContext.jsx),
 * never a manually-entered account id. Mirrors how useAccountData.js picks
 * the signed-in user's own primary account.
 */
function useSeniorAccount(seniorCustomerId) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!seniorCustomerId) {
      setAccount(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    getCustomerAccounts(seniorCustomerId)
      .then((accounts) => !cancelled && setAccount(accounts[0] || null))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [seniorCustomerId])

  return { account, loading, error }
}

/**
 * Real Nessie bills for the monitored account — this is the "Fugas por
 * suscripción" data, kept separate from the copilot's own purchases.
 */
function useMonitoredBills(accountId) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accountId) {
      setBills([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    getAccountBills(accountId)
      .then((data) => !cancelled && setBills(Array.isArray(data) ? data : []))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [accountId])

  return { bills, loading, error }
}

function TransfersTab({ onNew }) {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-[#003A6F]">Transferencias</h1>
      <p className="text-sm text-gray-500">
        Envía dinero desde tu cuenta a cualquier cuenta Nessie.
      </p>
      <button
        onClick={onNew}
        className="w-full h-14 rounded-xl bg-[#003A6F] text-white font-bold text-base shadow-md"
      >
        Nueva transferencia
      </button>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#003A6F] mb-2">Contactos frecuentes</h3>
        <ul className="divide-y divide-gray-100">
          {['Familiar', 'Renta', 'Ahorro familiar'].map((name) => (
            <li key={name} className="py-3 flex items-center justify-between">
              <span className="text-sm text-[#003A6F] font-medium">{name}</span>
              <span className="text-xs text-gray-400">Nessie</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
