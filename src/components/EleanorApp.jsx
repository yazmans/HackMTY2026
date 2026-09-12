import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  PiggyBank,
  Receipt,
  Settings,
  TrendingUp,
  LogOut,
} from 'lucide-react'
import { Header, formatMoney, formatDate } from './Brand.jsx'
import TransferModal from './TransferModal.jsx'
import { useApp } from '../context/AppContext.jsx'
import { getCustomerAccounts, getAccountPurchases } from '../services/api.js'

function EasyToggle({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-sm font-semibold text-[#003A6F]">Easy Mode</span>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative ${
          value ? 'bg-[#D03027]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 bg-white rounded-full shadow transition-all ${
            value ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export default function EleanorApp() {
  const { session, signOut } = useApp()
  const [isEasyMode, setIsEasyMode] = useState(true)
  const [account, setAccount] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTransfer, setShowTransfer] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [accounts, buys] = await Promise.all([
        getCustomerAccounts(session.customerId),
        getAccountPurchases(session.accountId),
      ])
      const match =
        accounts.find((a) => a._id === session.accountId) || accounts[0] || null
      setAccount(match)
      setPurchases(
        [...buys].sort(
          (a, b) => new Date(b.purchase_date) - new Date(a.purchase_date)
        )
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.customerId, session.accountId])

  return (
    <>
      <Header>
        <EasyToggle value={isEasyMode} onChange={setIsEasyMode} />
      </Header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading && (
          <p className={`p-6 text-gray-500 ${isEasyMode ? 'text-xl' : 'text-sm'}`}>
            Cargando tu cuenta…
          </p>
        )}
        {error && !loading && (
          <div className="m-4 p-4 rounded-xl bg-red-50 border border-[#D03027]">
            <p className={`text-[#D03027] font-semibold ${isEasyMode ? 'text-xl' : 'text-sm'}`}>
              No pudimos conectar con Nessie.
            </p>
            <p className="text-xs text-gray-600 mt-1 break-words">{error}</p>
            <button
              onClick={load}
              className="mt-3 h-12 px-5 rounded-full bg-[#003A6F] text-white font-semibold"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          isEasyMode ? (
            <EasyMode
              account={account}
              purchases={purchases}
              onTransfer={() => setShowTransfer(true)}
            />
          ) : (
            <StandardMode
              account={account}
              purchases={purchases}
              onTransfer={() => setShowTransfer(true)}
              onSignOut={signOut}
            />
          )
        )}
      </div>

      {showTransfer && (
        <TransferModal
          payerAccountId={session.accountId}
          big={isEasyMode}
          onClose={() => setShowTransfer(false)}
          onSuccess={load}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* EASY MODE — exactly three sections, oversized and high contrast.    */
/* ------------------------------------------------------------------ */

function EasyMode({ account, purchases, onTransfer }) {
  return (
    <div className="p-4 pb-8 space-y-6">
      {/* 1. Account balance */}
      <section className="bg-white rounded-2xl py-8 px-4 text-center shadow-sm">
        <p className="text-xl font-bold text-[#003A6F]">Tu saldo</p>
        <p className="mt-2 text-5xl font-extrabold text-[#003A6F] tracking-tight">
          {formatMoney(account?.balance)}
        </p>
        <p className="mt-2 text-xl text-gray-700">{account?.nickname || 'Cuenta'}</p>
      </section>

      {/* 2. Transfer money */}
      <button
        onClick={onTransfer}
        className="bg-[#D03027] h-16 w-full text-white font-bold rounded-xl text-2xl shadow-md active:opacity-90"
      >
        Enviar dinero
      </button>

      {/* 3. Recent transactions */}
      <section>
        <h2 className="text-2xl font-bold text-[#003A6F] mb-3">Últimos movimientos</h2>
        {purchases.length === 0 ? (
          <p className="text-xl text-gray-600">No hay movimientos recientes.</p>
        ) : (
          <ul className="space-y-3">
            {purchases.slice(0, 15).map((p) => (
              <li
                key={p._id}
                className="bg-white rounded-2xl px-4 py-4 shadow-sm min-h-[48px]"
              >
                <p className="text-xl text-gray-700">{formatDate(p.purchase_date)}</p>
                <p className="text-2xl font-bold text-[#003A6F] leading-tight mt-1">
                  {p.description || 'Compra'}
                </p>
                <p className="text-3xl font-extrabold text-[#D03027] mt-1">
                  −{formatMoney(p.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* STANDARD MODE — a conventional banking UI.                          */
/* ------------------------------------------------------------------ */

function StandardMode({ account, purchases, onTransfer, onSignOut }) {
  // Dummy 7-day spend series for the sparkline chart.
  const bars = [38, 62, 24, 80, 45, 70, 33]

  return (
    <div className="p-4 pb-8 space-y-4">
      <div className="rounded-2xl bg-[#003A6F] text-white p-5 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">
              {account?.type || 'Checking'}
            </p>
            <p className="text-sm text-white/90">{account?.nickname || 'Cuenta'}</p>
          </div>
          <CreditCard size={22} className="text-white/80" />
        </div>
        <p className="mt-4 text-3xl font-bold">{formatMoney(account?.balance)}</p>
        <p className="text-xs text-white/70 mt-1">
          •••• {String(account?.account_number || '0000').slice(-4)}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: ArrowUpRight, label: 'Enviar', action: onTransfer },
          { icon: ArrowDownLeft, label: 'Depositar' },
          { icon: Receipt, label: 'Pagar' },
          { icon: PiggyBank, label: 'Ahorro' },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className="bg-white rounded-xl py-3 flex flex-col items-center gap-1 shadow-sm h-[72px] justify-center"
          >
            <Icon size={20} className="text-[#003A6F]" />
            <span className="text-[11px] font-semibold text-[#003A6F]">{label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#003A6F]">Gasto semanal</h3>
          <TrendingUp size={16} className="text-[#D03027]" />
        </div>
        <div className="flex items-end gap-2 h-24">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[#003A6F]/80"
                style={{ height: `${h}%` }}
              />
              <span className="text-[10px] text-gray-400">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-[#003A6F] px-4 pt-4 pb-2">
          Movimientos recientes
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

      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        <button className="w-full flex items-center gap-3 px-4 py-4 text-sm font-semibold text-[#003A6F]">
          <Settings size={18} /> Configuración
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 text-sm font-semibold text-[#D03027]"
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
