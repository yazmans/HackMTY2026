import { useEffect, useState } from 'react'
import {
  Home,
  ArrowLeftRight,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  LogOut,
} from 'lucide-react'
import { Header, formatMoney, formatDate } from './Brand.jsx'
import TransferModal from './TransferModal.jsx'
import CoPilotTab from './CoPilotTab.jsx'
import { useApp } from '../context/AppContext.jsx'
import { getCustomerAccounts, getAccountPurchases } from '../services/api.js'

const TABS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
  { key: 'copilot', label: 'Co-Piloto', icon: ShieldCheck },
]

export default function MarcusApp() {
  const { session, signOut } = useApp()
  const [tab, setTab] = useState('home')

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
        {tab === 'home' && <HomeTab session={session} />}
        {tab === 'transfers' && <TransfersTab session={session} />}
        {tab === 'copilot' && <CoPilotHost session={session} />}
      </div>

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
    </>
  )
}

function HomeTab({ session }) {
  const [account, setAccount] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getCustomerAccounts(session.customerId),
      getAccountPurchases(session.accountId),
    ])
      .then(([accounts, buys]) => {
        if (cancelled) return
        setAccount(accounts.find((a) => a._id === session.accountId) || accounts[0] || null)
        setPurchases(
          [...buys].sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
        )
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [session.customerId, session.accountId])

  const bars = [45, 68, 30, 74, 52, 61, 40]

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-sm text-gray-500">Hola,</p>
        <h1 className="text-2xl font-bold text-[#003A6F]">{session.firstName}</h1>
      </div>

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-[#D03027]">
          <p className="text-sm font-semibold text-[#D03027]">Error de Nessie</p>
          <p className="text-xs text-gray-600 break-words mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="rounded-2xl bg-[#003A6F] text-white p-5 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/90">{account?.nickname || 'Cuenta'}</p>
              <CreditCard size={20} className="text-white/80" />
            </div>
            <p className="mt-3 text-3xl font-bold">{formatMoney(account?.balance)}</p>
            <p className="text-xs text-white/70 mt-1">
              •••• {String(account?.account_number || '0000').slice(-4)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#003A6F]">Actividad</h3>
              <TrendingUp size={16} className="text-[#D03027]" />
            </div>
            <div className="flex items-end gap-2 h-20">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-[#003A6F]/80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold text-[#003A6F] px-4 pt-4 pb-2">
              Movimientos
            </h3>
            <ul className="divide-y divide-gray-100">
              {purchases.slice(0, 8).map((p) => (
                <li key={p._id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#003A6F] truncate">
                      {p.description || 'Compra'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(p.purchase_date)}</p>
                  </div>
                  <span className="text-sm font-bold text-[#D03027] shrink-0 ml-3">
                    −{formatMoney(p.amount)}
                  </span>
                </li>
              ))}
              {purchases.length === 0 && (
                <li className="px-4 py-6 text-sm text-gray-400">Sin movimientos.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function TransfersTab({ session }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-[#003A6F]">Transferencias</h1>
      <p className="text-sm text-gray-500">
        Envía dinero desde tu cuenta a cualquier cuenta Nessie.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="w-full h-14 rounded-xl bg-[#003A6F] text-white font-bold text-base shadow-md"
      >
        Nueva transferencia
      </button>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#003A6F] mb-2">Contactos frecuentes</h3>
        <ul className="divide-y divide-gray-100">
          {['Eleanor R.', 'Renta', 'Ahorro familiar'].map((name) => (
            <li key={name} className="py-3 flex items-center justify-between">
              <span className="text-sm text-[#003A6F] font-medium">{name}</span>
              <span className="text-xs text-gray-400">Nessie</span>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <TransferModal
          payerAccountId={session.accountId}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// Marcus monitors Eleanor's account. The login only captures one account id, so
// we default to it and let him retarget the dashboard at her account.
function CoPilotHost({ session }) {
  const [monitoredId, setMonitoredId] = useState(session.accountId)
  const [draft, setDraft] = useState(session.accountId)

  return (
    <div>
      <div className="px-4 pt-4">
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Cuenta monitoreada (Nessie Account ID de Eleanor)
        </label>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 h-12 px-3 rounded-xl border border-gray-300 text-sm text-[#003A6F] focus:outline-none focus:ring-2 focus:ring-[#003A6F]"
          />
          <button
            onClick={() => setMonitoredId(draft.trim())}
            className="h-12 px-4 rounded-xl bg-[#003A6F] text-white text-sm font-semibold"
          >
            Ver
          </button>
        </div>
      </div>
      <CoPilotTab monitoredAccountId={monitoredId} />
    </div>
  )
}
