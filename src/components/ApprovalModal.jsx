import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import PinPad, { PinDots } from './PinPad.jsx'
import { formatMoney } from './Brand.jsx'

/**
 * Pops over the senior's UI when the copilot has requested a virtual card.
 * High contrast and large targets to match Easy Mode accessibility.
 */
export default function ApprovalModal({ pendingCardRequest, onApprove, onReject }) {
  const [nip, setNip] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (nip.length !== 4) {
      setError('Tu NIP debe tener 4 dígitos.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onApprove()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const reject = async () => {
    setError('')
    setSubmitting(true)
    try {
      await onReject()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[90] bg-black/60 flex items-end">
      <div className="w-full bg-[#F4F6F8] rounded-t-3xl max-h-[95%] overflow-y-auto no-scrollbar">
        <div className="bg-[#003A6F] rounded-t-3xl px-5 py-4 flex items-center gap-2">
          <ShieldAlert size={24} className="text-white shrink-0" />
          <h2 className="text-white font-bold text-xl">Solicitud de autorización</h2>
        </div>

        <div className="p-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm border-l-4 border-[#D03027]">
            <p className="text-xl text-gray-800 leading-relaxed">
              Tu familiar solicita crear una Tarjeta Virtual de{' '}
              <span className="font-bold text-[#003A6F]">
                {pendingCardRequest.category}
              </span>{' '}
              con límite de{' '}
              <span className="font-bold text-[#D03027]">
                {formatMoney(pendingCardRequest.limit)}
              </span>
              . Ingresa tu NIP para autorizar.
            </p>
          </div>

          <div className="mt-5">
            <PinDots value={nip} />
          </div>

          {error && (
            <p className="mt-3 text-lg text-[#D03027] font-semibold text-center">
              {error}
            </p>
          )}

          <div className="mt-5">
            <PinPad
              value={nip}
              onChange={(v) => {
                setNip(v)
                setError('')
              }}
              maxLength={4}
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-5 w-full h-16 rounded-xl bg-[#D03027] text-white font-bold text-xl shadow-md disabled:opacity-60"
          >
            {submitting ? 'Procesando…' : 'Autorizar'}
          </button>
          <button
            onClick={reject}
            disabled={submitting}
            className="mt-3 w-full h-12 rounded-xl bg-white border-2 border-gray-300 text-[#003A6F] font-semibold text-lg disabled:opacity-60"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}
