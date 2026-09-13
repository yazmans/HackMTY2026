import { useCallback, useEffect, useState } from 'react'
import { X, CheckCircle2, Loader2, Pause } from 'lucide-react'
import { createTransfer, getAccountTransfers } from '../services/api.js'
import { requestHighValueTransfer } from '../services/transfersApi.js'
import { getSocket } from '../services/socket.js'
import { useApp } from '../context/AppContext.jsx'
import { formatMoney, formatDate } from './Brand.jsx'
import { MOST_RECENT_SUNDAY } from '../data/mockPurchases.js'
import SupportCallButton from './SupportCallButton.jsx'

// Above this, a senior's transfer is held for their copilot to approve
// instead of executing immediately — see server/src/routes/transfers.js.
const HIGH_VALUE_THRESHOLD = 10000

const buildOptimisticPurchase = (description, amount) => ({
  _id: `local_${Date.now()}`,
  merchant_id: 'mch_00000000000000transfer',
  description,
  amount,
  purchase_date: MOST_RECENT_SUNDAY,
})

/**
 * Simple transfer modal. `big` switches to Easy Mode sizing.
 * `addPurchase` (from useAccountData) is optional; when passed, a completed
 * transfer is also injected into the local purchases feed so the weekly
 * chart, "Movimientos recientes", and the displayed balance update at once.
 *
 * A senior sending more than HIGH_VALUE_THRESHOLD doesn't hit Nessie here at
 * all: it's held for their copilot to approve/hold (see CoPilotTab.jsx), and
 * this modal just waits on the matching socket.io event.
 */
export default function TransferModal({
  payerAccountId,
  onClose,
  onSuccess,
  addPurchase,
  big = false,
}) {
  const { session, enoFamilyRole } = useApp()
  const [payeeId, setPayeeId] = useState('')
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  // idle | sending | done | error | awaiting_approval | approved | held
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [pendingRequestId, setPendingRequestId] = useState(null)

  // Recent movements from this same account, reusing the Enviar transfer model.
  const [transfers, setTransfers] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  const loadHistory = useCallback(() => {
    setHistoryLoading(true)
    setHistoryError('')
    getAccountTransfers(payerAccountId)
      .then((data) =>
        setTransfers(
          [...data].sort(
            (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)
          )
        )
      )
      .catch((err) => {
        setTransfers([])
        setHistoryError(err.message)
      })
      .finally(() => setHistoryLoading(false))
  }, [payerAccountId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const label = big ? 'text-xl font-bold text-[#003A6F] mb-2' : 'text-sm font-semibold text-[#003A6F] mb-1'
  const input = big
    ? 'w-full h-14 px-4 rounded-xl border-2 border-gray-400 text-xl text-[#003A6F] focus:outline-none focus:ring-2 focus:ring-[#003A6F]'
    : 'w-full h-12 px-4 rounded-xl border border-gray-300 text-base text-[#003A6F] focus:outline-none focus:ring-2 focus:ring-[#003A6F]'

  const submit = async (e) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!payeeId.trim() || !concept.trim() || !Number.isFinite(value) || value <= 0) {
      setError('Escribe una cuenta destino, un concepto y un monto válido.')
      return
    }
    const trimmedPayeeId = payeeId.trim()
    const trimmedConcept = concept.trim()
    setError('')
    setStatus('sending')

    // enoFamilyRole is only 'senior' once isLinked is true (see AppContext),
    // so this alone confirms there's a copilot to hold the transfer for.
    if (enoFamilyRole === 'senior' && value > HIGH_VALUE_THRESHOLD) {
      try {
        const created = await requestHighValueTransfer({
          seniorCustomerId: session.customerId,
          payerAccountId,
          payeeId: trimmedPayeeId,
          amount: value,
          concept: trimmedConcept,
        })
        setPendingRequestId(created.id)
        setStatus('awaiting_approval')
      } catch (err) {
        setStatus('error')
        setError(err.message)
      }
      return
    }

    try {
      await createTransfer(payerAccountId, trimmedPayeeId, value, trimmedConcept)
      addPurchase?.(buildOptimisticPurchase(trimmedConcept, value))
      setStatus('done')
      loadHistory()
      onSuccess?.()
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  // Waiting on the copilot's decision: no polling, just the socket.io event
  // server/src/routes/transfers.js emits the moment /resolve is called.
  useEffect(() => {
    if (status !== 'awaiting_approval' || pendingRequestId == null) return
    const socket = getSocket()
    if (!socket) return
    const onResolved = (payload) => {
      if (payload.id !== pendingRequestId) return
      if (payload.decision === 'approved') {
        // No real Nessie call happens for this — the copilot's approval is
        // the signal, and this optimistic injection is what actually makes
        // it show up in the balance/chart/movements, exactly like a normal
        // instant transfer already does.
        addPurchase?.(buildOptimisticPurchase(payload.concept, payload.amount))
        loadHistory()
        onSuccess?.()
        setStatus('approved')
      } else {
        setStatus('held')
      }
    }
    socket.on('transfer:resolved', onResolved)
    return () => socket.off('transfer:resolved', onResolved)
  }, [status, pendingRequestId, addPurchase, onSuccess, loadHistory])

  return (
    <div className="absolute inset-0 z-[60] bg-black/50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl p-5 max-h-[85%] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className={big ? 'text-2xl font-bold text-[#003A6F]' : 'text-lg font-bold text-[#003A6F]'}>
            Enviar dinero
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="h-12 w-12 flex items-center justify-center rounded-full text-gray-500"
          >
            <X size={big ? 30 : 22} />
          </button>
        </div>

        {status === 'done' && (
          <div className="py-6 text-center">
            <CheckCircle2 size={big ? 72 : 56} className="mx-auto text-green-600" />
            <p className={big ? 'mt-4 text-2xl font-bold text-[#003A6F]' : 'mt-3 text-lg font-bold text-[#003A6F]'}>
              ¡Transferencia enviada!
            </p>
            <button
              onClick={onClose}
              className={`mt-6 w-full ${big ? 'h-16 text-xl' : 'h-12 text-base'} bg-[#003A6F] text-white font-bold rounded-xl`}
            >
              Listo
            </button>
          </div>
        )}

        {status === 'approved' && (
          <div className="py-6 text-center">
            <CheckCircle2 size={big ? 72 : 56} className="mx-auto text-green-600" />
            <p className={big ? 'mt-4 text-2xl font-bold text-[#003A6F]' : 'mt-3 text-lg font-bold text-[#003A6F]'}>
              ✓ Transferencia aprobada
            </p>
            <p className={`mt-2 text-gray-500 ${big ? 'text-lg' : 'text-sm'}`}>
              Tu copiloto autorizó este envío.
            </p>
            <button
              onClick={onClose}
              className={`mt-6 w-full ${big ? 'h-16 text-xl' : 'h-12 text-base'} bg-[#003A6F] text-white font-bold rounded-xl`}
            >
              Listo
            </button>
          </div>
        )}

        {status === 'awaiting_approval' && (
          <div className="py-6 text-center">
            <Loader2 size={big ? 72 : 56} className="mx-auto text-[#003A6F] animate-spin" />
            <p className={big ? 'mt-4 text-2xl font-bold text-[#003A6F]' : 'mt-3 text-lg font-bold text-[#003A6F]'}>
              Esperando aprobación de tu copiloto…
            </p>
            <p className={`mt-2 text-gray-500 ${big ? 'text-lg' : 'text-sm'}`}>
              Los montos mayores a {formatMoney(HIGH_VALUE_THRESHOLD)} necesitan su autorización.
            </p>
          </div>
        )}

        {status === 'held' && (
          <div className="py-6 text-center">
            <Pause size={big ? 72 : 56} className="mx-auto text-[#D03027]" />
            <p className={big ? 'mt-4 text-2xl font-bold text-[#003A6F]' : 'mt-3 text-lg font-bold text-[#003A6F]'}>
              Tu copiloto detuvo esta transferencia.
            </p>
            <p className={`mt-2 text-gray-500 ${big ? 'text-lg' : 'text-sm'}`}>
              No se realizó ningún cargo.
            </p>
            <button
              onClick={onClose}
              className={`mt-6 w-full ${big ? 'h-16 text-xl' : 'h-12 text-base'} bg-[#003A6F] text-white font-bold rounded-xl`}
            >
              Entendido
            </button>

            {/* If this was a mistake, get the senior straight to a human. */}
            <div className="mt-3">
              <SupportCallButton />
            </div>
          </div>
        )}

        {(status === 'idle' || status === 'sending' || status === 'error') && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={label}>Cuenta destino (Payee ID)</label>
              <input
                className={input}
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                placeholder="Nessie Account ID"
              />
            </div>
            <div>
              <label className={label}>Concepto</label>
              <input
                className={input}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Renta, Regalo cumpleaños…"
              />
            </div>
            <div>
              <label className={label}>Monto (USD)</label>
              <input
                className={input}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="100.00"
              />
            </div>

            {error && (
              <p className={`text-[#D03027] font-semibold ${big ? 'text-lg' : 'text-sm'}`}>{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className={`w-full ${big ? 'h-16 text-xl' : 'h-12 text-base'} bg-[#D03027] text-white font-bold rounded-xl disabled:opacity-60`}
            >
              {status === 'sending' ? 'Enviando…' : 'Confirmar transferencia'}
            </button>
          </form>
        )}

        {(status === 'idle' || status === 'sending' || status === 'error') && (
          <div className="mt-6">
            <h3 className={big ? 'text-xl font-bold text-[#003A6F] mb-3' : 'text-sm font-bold text-[#003A6F] mb-2'}>
              Envíos recientes
            </h3>
            {historyLoading ? (
              <p className={big ? 'text-lg text-gray-500' : 'text-sm text-gray-400'}>
                Cargando…
              </p>
            ) : historyError ? (
              <p className={`text-[#D03027] break-words ${big ? 'text-lg' : 'text-sm'}`}>
                No pudimos cargar tus envíos recientes. {historyError}
              </p>
            ) : transfers.length === 0 ? (
              <p className={big ? 'text-lg text-gray-500' : 'text-sm text-gray-400'}>
                Sin envíos recientes.
              </p>
            ) : big ? (
              <ul className="space-y-3">
                {transfers.slice(0, 5).map((t) => (
                  <li key={t._id} className="bg-[#F4F6F8] rounded-2xl px-4 py-4">
                    <p className="text-lg text-gray-700">{formatDate(t.transaction_date)}</p>
                    <p className="text-xl font-bold text-[#003A6F] leading-tight mt-1">
                      {t.description || 'Transferencia'}
                    </p>
                    <p className="text-2xl font-extrabold text-[#D03027] mt-1">
                      −{formatMoney(t.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-gray-100">
                {transfers.slice(0, 5).map((t) => (
                  <li key={t._id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#003A6F] truncate">
                        {t.description || 'Transferencia'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(t.transaction_date)}</p>
                    </div>
                    <span className="text-sm font-bold text-[#D03027] shrink-0 ml-3">
                      −{formatMoney(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
