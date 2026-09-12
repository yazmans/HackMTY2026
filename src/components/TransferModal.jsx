import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { createTransfer } from '../services/api.js'

/**
 * Simple transfer modal. `big` switches to Easy Mode sizing.
 */
export default function TransferModal({ payerAccountId, onClose, onSuccess, big = false }) {
  const [payeeId, setPayeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [error, setError] = useState('')

  const label = big ? 'text-xl font-bold text-[#003A6F] mb-2' : 'text-sm font-semibold text-[#003A6F] mb-1'
  const input = big
    ? 'w-full h-14 px-4 rounded-xl border-2 border-gray-400 text-xl text-[#003A6F] focus:outline-none focus:ring-2 focus:ring-[#003A6F]'
    : 'w-full h-12 px-4 rounded-xl border border-gray-300 text-base text-[#003A6F] focus:outline-none focus:ring-2 focus:ring-[#003A6F]'

  const submit = async (e) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!payeeId.trim() || !Number.isFinite(value) || value <= 0) {
      setError('Escribe una cuenta destino y un monto válido.')
      return
    }
    setError('')
    setStatus('sending')
    try {
      await createTransfer(payerAccountId, payeeId.trim(), value)
      setStatus('done')
      onSuccess?.()
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

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

        {status === 'done' ? (
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
        ) : (
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
      </div>
    </div>
  )
}
