import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  PiggyBank,
  Receipt,
  Settings,
  TrendingUp,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { formatMoney, formatDate } from './Brand.jsx'
import EmergencyCallButton from './EmergencyCallButton.jsx'

/**
 * Sums purchase amounts per weekday (Mon-Sun) for the week containing the
 * most recent purchase, then scales each day to a 0-100 bar height relative
 * to that week's busiest day. A day with no purchases gets a 0 bar.
 */
function computeWeeklyBars(purchases) {
  const dates = purchases
    .map((p) => new Date(`${p.purchase_date}T00:00:00`))
    .filter((d) => !Number.isNaN(d.getTime()))
  if (!dates.length) return [0, 0, 0, 0, 0, 0, 0]

  const latest = dates.reduce((max, d) => (d > max ? d : max))
  // getDay(): 0=Sun..6=Sat. Re-index to Mon-first (0=Mon..6=Sun) to find that
  // day's week boundaries.
  const dow = (latest.getDay() + 6) % 7
  const sunday = new Date(latest)
  sunday.setDate(latest.getDate() + (6 - dow))
  const monday = new Date(sunday)
  monday.setDate(sunday.getDate() - 6)

  const totals = Array(7).fill(0)
  for (const p of purchases) {
    const d = new Date(`${p.purchase_date}T00:00:00`)
    if (Number.isNaN(d.getTime()) || d < monday || d > sunday) continue
    totals[(d.getDay() + 6) % 7] += Number(p.amount) || 0
  }

  const peak = Math.max(...totals, 1)
  return totals.map((t) => Math.round((t / peak) * 100))
}

// The bar row is a fixed h-24 (96px), but its flex children aren't stretched
// (items-end sizes them to content), so a CSS `height: X%` on the bar itself
// resolves against an "auto" parent and renders as 0px regardless of X —
// this is what made the chart look empty. Computing an explicit pixel height
// against a fixed track avoids that entirely, and the 6px floor keeps every
// day visibly non-zero even when its real total is 0.
const BAR_TRACK_PX = 72
function barHeightPx(percent) {
  return Math.max(6, Math.round((percent / 100) * BAR_TRACK_PX))
}

/** Promo card that opens the Eno Family handshake. Hidden once linked. */
export function EnoFamilyCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-white shadow-sm p-4 flex items-center gap-3 text-left border-l-4 border-[#D03027]"
    >
      <div className="h-11 w-11 rounded-full bg-[#003A6F] flex items-center justify-center shrink-0">
        <ShieldCheck size={22} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#003A6F] text-base leading-snug">Eno Family</p>
        <p className="text-sm text-gray-500">Protege a los tuyos</p>
      </div>
      <ChevronRight size={20} className="text-gray-400 shrink-0" />
    </button>
  )
}

/**
 * The conventional Capital One banking home screen.
 * `onOpenEnoFamily` is omitted once the account is linked.
 */
export default function StandardDashboard({
  firstName,
  account,
  purchases,
  loading,
  error,
  onReload,
  onTransfer,
  onSignOut,
  onOpenEnoFamily,
  showEmergencyCall = false,
}) {
  const bars = computeWeeklyBars(purchases)

  if (loading) {
    return <p className="p-6 text-sm text-gray-400">Cargando tu cuenta…</p>
  }

  if (error) {
    return (
      <div className="m-4 p-4 rounded-xl bg-red-50 border border-[#D03027]">
        <p className="text-sm font-semibold text-[#D03027]">
          No pudimos conectar con Nessie.
        </p>
        <p className="text-xs text-gray-600 mt-1 break-words">{error}</p>
        <button
          onClick={onReload}
          className="mt-3 h-12 px-5 rounded-full bg-[#003A6F] text-white font-semibold"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 pb-8 space-y-4">
      {firstName && (
        <div>
          <p className="text-sm text-gray-500">Hola,</p>
          <h1 className="text-2xl font-bold text-[#003A6F]">{firstName}</h1>
        </div>
      )}

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

      {onOpenEnoFamily && <EnoFamilyCard onClick={onOpenEnoFamily} />}

      {showEmergencyCall && <EmergencyCallButton />}

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
                style={{ height: `${barHeightPx(h)}px` }}
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
          {purchases.slice(0, 2).map((p) => (
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

      {onSignOut && (
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
      )}
    </div>
  )
}
