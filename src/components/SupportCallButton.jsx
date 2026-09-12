import { useState } from 'react'
import { PhoneCall, Loader2, Mic } from 'lucide-react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'

const AGENT_ID = 'agent_1201m2bqez1yfa98hfmtscvhzjq7'

const BASE_CLASS =
  'w-full h-16 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2'

function SupportCallButtonInner() {
  const [error, setError] = useState('')

  // startSession() doesn't throw / return a rejected promise here — a failed
  // connection (mic permission denied, network, agent unreachable) surfaces
  // through this onError callback instead, which is what we show below.
  const conversation = useConversation({
    onError: (message) => setError(message || 'No se pudo conectar la llamada.'),
    onDisconnect: () => setError(''),
  })

  const handleClick = () => {
    if (conversation.status === 'connected') {
      conversation.endSession()
      return
    }
    setError('')
    conversation.startSession({ agentId: AGENT_ID })
  }

  if (conversation.status === 'connecting') {
    return (
      <button
        type="button"
        disabled
        className={`${BASE_CLASS} bg-gray-400 cursor-not-allowed`}
      >
        <Loader2 size={22} className="animate-spin" />
        Conectando llamada...
      </button>
    )
  }

  if (conversation.status === 'connected') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`${BASE_CLASS} bg-[#10893E] active:opacity-90`}
      >
        <Mic size={22} className="animate-pulse" />
        En llamada - Toca para colgar
      </button>
    )
  }

  // 'disconnected' and 'error' both land here: the retry action is the same.
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        className={`${BASE_CLASS} bg-[#D03027] active:opacity-90`}
      >
        <PhoneCall size={22} />
        Contactar a soporte prioritario
      </button>
      {error && (
        <p className="text-sm text-[#D03027] font-semibold text-center">{error}</p>
      )}
    </div>
  )
}

/**
 * Drop-in "call support" button backed by a real-time ElevenLabs voice agent.
 * Self-contained — brings its own ConversationProvider — so it can be placed
 * in the Co-Pilot Tab, a blocked-transaction modal, or anywhere else without
 * the rest of the app needing to know about ElevenLabs.
 */
export default function SupportCallButton() {
  return (
    <ConversationProvider>
      <SupportCallButtonInner />
    </ConversationProvider>
  )
}
