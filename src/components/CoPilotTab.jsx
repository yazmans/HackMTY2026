import { useState } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Repeat,
  EyeOff,
  Check,
  Pause,
  Plus,
  Loader2,
} from 'lucide-react'
import { formatMoney } from './Brand.jsx'
import VirtualCard from './VirtualCard.jsx'
import SupportCallButton from './SupportCallButton.jsx'
import { useApp } from '../context/AppContext.jsx'

/**
 * Marcus's monitoring dashboard over Eleanor's account.
 * Subscriptions are computed by the parent so the Eno chat can read them too.
 */
export default function CoPilotTab({ subscriptions, loading, error }) {
  const { pendingCardRequest, cardRequestStatus, clearCardRequest } = useApp()

  const [alertState, setAlertState] = useState('pending') // pending | approved | held

  const [cardLimit, setCardLimit] = useState('')
  const [cardCategory, setCardCategory] = useState('Farmacia')
  const [issuedCards, setIssuedCards] = useState([])

  const issueCard = (e) => {
    e.preventDefault()
    const limit = parseFloat(cardLimit)
    if (!Number.isFinite(limit) || limit <= 0) return
    setIssuedCards((prev) => [
      {
        id: `vc_${Date.now()}`,
        limit,
        category: cardCategory,
        last4: String(Math.floor(1000 + Math.random() * 9000)),
      },
      ...prev,
    ])
    setCardLimit('')
  }

  return (
    <div className="p-4 space-y-4">
      {/* 1. Privacy header */}
      <div className="rounded-2xl bg-[#003A6F] text-white p-4 flex items-start gap-3 shadow-md">
        <ShieldCheck size={24} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-base leading-tight">Monitoreo Activo</p>
          <p className="text-sm text-white/80">Privacidad Protegida</p>
          <p className="text-xs text-white/70 mt-2 flex items-center gap-1">
            <EyeOff size={12} /> Ves alertas y patrones, no cada compra.
          </p>
        </div>
      </div>

      {/* 2. Suspicious activity */}
      <section className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4">
          <AlertTriangle size={18} className="text-[#D03027]" />
          <h3 className="font-bold text-[#003A6F]">Actividad sospechosa</h3>
        </div>
        <div className="px-4 pb-4 pt-2">
          <p className="text-sm text-gray-700">
            Transferencia de <span className="font-bold text-[#D03027]">$500.00</span> a
            un destinatario desconocido.
          </p>
          <p className="text-xs text-gray-400 mt-1">Hoy · 10:42 a.m. · Cuenta de Eleanor</p>

          {alertState === 'pending' ? (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setAlertState('approved')}
                className="flex-1 h-12 rounded-xl bg-[#003A6F] text-white font-semibold text-sm flex items-center justify-center gap-1"
              >
                <Check size={16} /> Aprobar
              </button>
              <button
                onClick={() => setAlertState('held')}
                className="flex-1 h-12 rounded-xl bg-[#D03027] text-white font-semibold text-sm flex items-center justify-center gap-1"
              >
                <Pause size={16} /> Retener
              </button>
            </div>
          ) : (
            <p
              className={`mt-3 text-sm font-bold ${
                alertState === 'approved' ? 'text-green-700' : 'text-[#D03027]'
              }`}
            >
              {alertState === 'approved'
                ? '✓ Transferencia aprobada'
                : '⏸ Transferencia retenida — soporte notificado'}
            </p>
          )}
        </div>
      </section>

      {/* 3. Virtual cards */}
      <section className="rounded-2xl bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={18} className="text-[#003A6F]" />
          <h3 className="font-bold text-[#003A6F]">Tarjetas Virtuales</h3>
        </div>

        {/* Card requested through the Eno chat: awaiting the senior's NIP. */}
        {cardRequestStatus === 'pending' && pendingCardRequest && (
          <div className="mb-3 rounded-xl bg-[#F4F6F8] border border-[#003A6F]/20 px-3 py-4 flex items-center gap-3">
            <Loader2 size={20} className="text-[#003A6F] animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#003A6F]">
                Esperando autorización de Eleanor...
              </p>
              <p className="text-xs text-gray-500 truncate">
                {pendingCardRequest.category} · {formatMoney(pendingCardRequest.limit)}
              </p>
            </div>
          </div>
        )}

        {/* Approved: render the card from the values typed in the chat. */}
        {cardRequestStatus === 'approved' && pendingCardRequest && (
          <div className="mb-3">
            <VirtualCard
              category={pendingCardRequest.category}
              limit={pendingCardRequest.limit}
            />
            <button
              onClick={clearCardRequest}
              className="mt-2 w-full h-12 rounded-xl border-2 border-gray-300 bg-white text-[#003A6F] text-sm font-semibold"
            >
              Listo
            </button>
          </div>
        )}

        <form onSubmit={issueCard} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Límite de monto (USD)
            </label>
            <input
              value={cardLimit}
              onChange={(e) => setCardLimit(e.target.value)}
              inputMode="decimal"
              placeholder="200.00"
              className="w-full h-12 px-3 rounded-xl border border-gray-300 text-sm text-[#003A6F] focus:outline-none focus:ring-2 focus:ring-[#003A6F]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Categoría
            </label>
            <select
              value={cardCategory}
              onChange={(e) => setCardCategory(e.target.value)}
              className="w-full h-12 px-3 rounded-xl border border-gray-300 text-sm text-[#003A6F] bg-white focus:outline-none focus:ring-2 focus:ring-[#003A6F]"
            >
              <option>Farmacia</option>
              <option>Supermercado</option>
              <option>Transporte</option>
              <option>Servicios médicos</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#003A6F] text-white font-semibold text-sm flex items-center justify-center gap-1"
          >
            <Plus size={16} /> Solicitar tarjeta temporal
          </button>
        </form>

        {issuedCards.length > 0 && (
          <ul className="mt-3 space-y-2">
            {issuedCards.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-dashed border-[#003A6F]/40 bg-[#F4F6F8] px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-[#003A6F]">•••• {c.last4}</p>
                  <p className="text-xs text-gray-500">{c.category}</p>
                </div>
                <span className="text-sm font-bold text-[#D03027]">
                  {formatMoney(c.limit)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Subscription leaks */}
      <section className="rounded-2xl bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Repeat size={18} className="text-[#003A6F]" />
          <h3 className="font-bold text-[#003A6F]">Fugas por suscripción</h3>
        </div>

        {loading && <p className="text-sm text-gray-400">Analizando movimientos…</p>}
        {error && !loading && (
          <p className="text-xs text-[#D03027] break-words">{error}</p>
        )}

        {!loading && !error && subscriptions.length === 0 && (
          <p className="text-sm text-gray-500">
            No detectamos cargos recurrentes en esta cuenta.
          </p>
        )}

        <ul className="space-y-2">
          {subscriptions.map((s) => (
            <li
              key={s.merchantId}
              className="rounded-xl bg-[#F4F6F8] px-3 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#003A6F] truncate">
                  {s.merchantName}
                </p>
                <p className="text-xs text-gray-500">
                  {s.count} cargos · cada ~{Math.round(s.avgIntervalDays)} días
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Confianza {(s.score * 100).toFixed(0)}%
                </p>
              </div>
              <span className="text-sm font-bold text-[#D03027] shrink-0">
                {formatMoney(s.avgAmount)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Emergency button */}
      <div className="mt-6">
        <SupportCallButton />
      </div>
    </div>
  )
}
