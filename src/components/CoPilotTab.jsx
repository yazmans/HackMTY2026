import { useEffect, useState } from 'react'
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
import { getPendingTransferRequests, resolveTransferRequest } from '../services/transfersApi.js'
import { getSocket } from '../services/socket.js'

const formatRequestTime = (createdAt) => {
  const d = new Date(`${createdAt.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return createdAt
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Marcus's monitoring dashboard over Eleanor's account.
 * Subscriptions are computed by the parent so the Eno chat can read them too.
 */
export default function CoPilotTab({ subscriptions, loading, error }) {
  const { session, pendingCardRequest, cardRequestStatus, clearCardRequest } = useApp()
  const copilotCustomerId = session?.customerId

  // Pending high-value transfers awaiting this copilot's decision — real
  // requests from TransferModal.jsx, not the old hardcoded $500 example.
  const [pendingTransfers, setPendingTransfers] = useState([])
  const [transfersLoading, setTransfersLoading] = useState(true)
  const [transfersError, setTransfersError] = useState('')
  const [resolvingId, setResolvingId] = useState(null)
  const [resolveError, setResolveError] = useState('')

  useEffect(() => {
    if (!copilotCustomerId) return
    let cancelled = false
    getPendingTransferRequests(copilotCustomerId)
      .then((rows) => !cancelled && setPendingTransfers(rows))
      .catch((err) => !cancelled && setTransfersError(err.message))
      .finally(() => !cancelled && setTransfersLoading(false))
    return () => {
      cancelled = true
    }
  }, [copilotCustomerId])

  // New requests arrive in real time — no polling.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const onRequested = (payload) => {
      setPendingTransfers((prev) => [payload, ...prev])
    }
    socket.on('transfer:requested', onRequested)
    return () => socket.off('transfer:requested', onRequested)
  }, [])

  const resolve = async (id, decision) => {
    setResolveError('')
    setResolvingId(id)
    try {
      await resolveTransferRequest(id, decision, copilotCustomerId)
      setPendingTransfers((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setResolveError(err.message)
    } finally {
      setResolvingId(null)
    }
  }

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

      {/* 2. High-value transfers awaiting approval */}
      <section className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4">
          <AlertTriangle size={18} className="text-[#D03027]" />
          <h3 className="font-bold text-[#003A6F]">Actividad sospechosa</h3>
        </div>
        <div className="px-4 pb-4 pt-2">
          {transfersLoading && (
            <p className="text-sm text-gray-400">Buscando transferencias pendientes…</p>
          )}
          {transfersError && !transfersLoading && (
            <p className="text-xs text-[#D03027] break-words">{transfersError}</p>
          )}
          {!transfersLoading && !transfersError && pendingTransfers.length === 0 && (
            <p className="text-sm text-gray-500">
              No hay transferencias pendientes de aprobación.
            </p>
          )}

          {resolveError && (
            <p className="text-xs text-[#D03027] font-semibold mb-2">{resolveError}</p>
          )}

          <ul className="space-y-3">
            {pendingTransfers.map((t) => (
              <li key={t.id} className={pendingTransfers[0] === t ? '' : 'pt-3 border-t border-gray-100'}>
                <p className="text-sm text-gray-700">
                  Transferencia de{' '}
                  <span className="font-bold text-[#D03027]">{formatMoney(t.amount)}</span>
                  {t.concept ? ` — ${t.concept}` : ''}
                </p>
                <p className="text-xs text-gray-400 mt-1">{formatRequestTime(t.createdAt)}</p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => resolve(t.id, 'approved')}
                    disabled={resolvingId === t.id}
                    className="flex-1 h-12 rounded-xl bg-[#003A6F] text-white font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <Check size={16} /> Aprobar
                  </button>
                  <button
                    onClick={() => resolve(t.id, 'held')}
                    disabled={resolvingId === t.id}
                    className="flex-1 h-12 rounded-xl bg-[#D03027] text-white font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <Pause size={16} /> Retener
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
