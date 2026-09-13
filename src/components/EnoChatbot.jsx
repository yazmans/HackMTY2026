import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Send, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { formatMoney } from './Brand.jsx'

const CATEGORIES = ['Farmacia', 'Supermercado', 'Transporte']

/**
 * Deterministic Eno assistant. The conversation is a hardcoded decision tree
 * (no LLM) so the live demo is reproducible.
 *
 * chatStep: 0 greeting -> 1 category -> 2 limit -> 3 authorization
 */
export default function EnoChatbot({ onClose, onSubmitted, subscriptions = [] }) {
  const { requestVirtualCard } = useApp()
  const [chatStep, setChatStep] = useState(0)
  const [cardCategory, setCardCategory] = useState('')
  const [cardLimit, setCardLimit] = useState('')
  const [limitDraft, setLimitDraft] = useState('')
  const [limitError, setLimitError] = useState('')
  // Replies the user picked, so earlier turns stay visible as we advance.
  const [userTurns, setUserTurns] = useState([])
  const [subscriptionReply, setSubscriptionReply] = useState('')
  const [sendError, setSendError] = useState('')
  const [sending, setSending] = useState(false)

  const scrollRef = useRef(null)

  // The transcript is derived from the step, so history is never lost.
  const messages = useMemo(() => {
    const list = [
      {
        from: 'eno',
        text: 'Hola, soy Eno. He analizado tu cuenta y no hay movimientos inusuales. ¿En qué te puedo ayudar?',
      },
    ]
    if (userTurns[0]) list.push({ from: 'user', text: userTurns[0] })

    if (chatStep >= 1) {
      list.push({
        from: 'eno',
        text: 'Excelente. ¿Para qué categoría de comercios será esta tarjeta? Esto bloqueará compras no relacionadas.',
      })
    }
    if (userTurns[1]) list.push({ from: 'user', text: userTurns[1] })

    if (chatStep >= 2) {
      list.push({
        from: 'eno',
        text: `Perfecto, restringiremos el MCC a ${cardCategory}. ¿Cuál será el límite de gasto?`,
      })
    }
    if (userTurns[2]) list.push({ from: 'user', text: userTurns[2] })

    if (chatStep >= 3) {
      list.push({
        from: 'eno',
        text: `Entendido. Para emitir una Tarjeta Virtual de ${cardCategory} por ${formatMoney(
          cardLimit
        )}, necesito enviar una solicitud de autorización al dispositivo de tu familiar.`,
      })
    }
    return list
  }, [chatStep, cardCategory, cardLimit, userTurns])

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, chatStep])

  const chooseCardFlow = () => {
    setUserTurns(['Generar Tarjeta Virtual Delegada'])
    setChatStep(1)
  }

  const reviewSubscriptions = () => {
    const summary = subscriptions.length
      ? `Detecté ${subscriptions.length} cargo(s) recurrente(s): ${subscriptions
          .map((s) => s.payee)
          .join(', ')}. Puedes revisarlos en el panel de Co-Piloto.`
      : 'No detecté cargos recurrentes en la cuenta por ahora.'
    setUserTurns(['Revisar suscripciones'])
    // A leaf answer: show it without advancing the card flow.
    setSubscriptionReply(summary)
  }

  const chooseCategory = (cat) => {
    setCardCategory(cat)
    setUserTurns((t) => [t[0], cat])
    setChatStep(2)
  }

  const submitLimit = (e) => {
    e.preventDefault()
    const value = parseFloat(limitDraft)
    if (!Number.isFinite(value) || value <= 0) {
      setLimitError('Ingresa un monto válido.')
      return
    }
    setLimitError('')
    setCardLimit(value)
    setUserTurns((t) => [t[0], t[1], formatMoney(value)])
    setChatStep(3)
  }

  const sendRequest = async () => {
    setSendError('')
    setSending(true)
    try {
      await requestVirtualCard({ category: cardCategory, limit: cardLimit })
      onSubmitted?.()
      onClose()
    } catch (err) {
      setSendError(err.message)
      setSending(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[80] flex flex-col bg-[#F4F6F8] animate-[slideUp_240ms_ease-out]">
      <header className="h-16 bg-[#003A6F] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-white" />
          <span className="text-white font-bold text-base">
            Eno - Asistente Inteligente
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="h-12 w-12 flex items-center justify-center text-white"
        >
          <X size={22} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-[#F4F6F8]">
        {messages.map((m, i) => (
          <Bubble key={i} from={m.from} text={m.text} />
        ))}
        {subscriptionReply && <Bubble from="eno" text={subscriptionReply} />}
      </div>

      <div className="shrink-0 bg-white border-t p-3 space-y-2">
        {chatStep === 0 && (
          <>
            <QuickReply onClick={reviewSubscriptions}>Revisar suscripciones</QuickReply>
            <QuickReply primary onClick={chooseCardFlow}>
              Generar Tarjeta Virtual Delegada
            </QuickReply>
          </>
        )}

        {chatStep === 1 && (
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => chooseCategory(c)}
                className="flex-1 h-12 rounded-full border-2 border-[#003A6F] text-[#003A6F] font-semibold text-sm active:bg-[#003A6F] active:text-white"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {chatStep === 2 && (
          <form onSubmit={submitLimit} className="space-y-2">
            <div className="flex gap-2">
              <input
                autoFocus
                value={limitDraft}
                onChange={(e) => {
                  setLimitDraft(e.target.value)
                  setLimitError('')
                }}
                inputMode="decimal"
                placeholder="Límite de gasto (USD)"
                className="flex-1 h-12 px-4 rounded-full border border-gray-300 text-base text-[#003A6F] focus:outline-none focus:ring-2 focus:ring-[#003A6F]"
              />
              <button
                type="submit"
                aria-label="Enviar"
                className="h-12 px-5 rounded-full bg-[#003A6F] text-white font-semibold text-sm flex items-center gap-1"
              >
                <Send size={16} /> Enviar
              </button>
            </div>
            {limitError && (
              <p className="text-sm text-[#D03027] font-semibold px-2">{limitError}</p>
            )}
          </form>
        )}

        {chatStep === 3 && (
          <div className="space-y-2">
            <QuickReply primary onClick={sendRequest} disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar solicitud a tu familiar'}
            </QuickReply>
            {sendError && (
              <p className="text-sm text-[#D03027] font-semibold px-2">{sendError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Bubble({ from, text }) {
  if (from === 'eno') {
    return (
      <div className="flex">
        <div className="bg-white border text-gray-800 rounded-br-2xl rounded-tr-2xl rounded-tl-2xl p-3 shadow-sm max-w-[85%] text-sm leading-relaxed">
          {text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-end">
      <div className="bg-[#003A6F] text-white rounded-bl-2xl rounded-tr-2xl rounded-tl-2xl p-3 shadow-sm max-w-[85%] text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function QuickReply({ children, onClick, primary = false, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 rounded-full font-semibold text-sm disabled:opacity-60 ${
        primary
          ? 'bg-[#003A6F] text-white'
          : 'border-2 border-[#003A6F] text-[#003A6F] bg-white'
      }`}
    >
      {children}
    </button>
  )
}
