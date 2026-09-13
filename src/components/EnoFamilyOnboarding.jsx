import { useEffect, useState } from 'react'
import { X, UserPlus, Users, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react'
import PinPad, { PinDots } from './PinPad.jsx'
import { useApp } from '../context/AppContext.jsx'
import { createLink, verifyLink, authorizeLink } from '../services/linksApi.js'
import { getSocket } from '../services/socket.js'

const STEPS = {
  CHOICE: 'choice',
  SENIOR_CODE: 'senior_code',
  COPILOT_CODE: 'copilot_code',
  COPILOT_WAITING: 'copilot_waiting',
  CONSENT: 'consent',
}

// Matches the consent copy below: monitoring only, no money movement.
const GRANTED_PERMISSIONS = {
  canMonitor: true,
  canTransfer: false,
  canViewFullBalance: false,
}

const formatCode = (raw) => `${raw.slice(0, 3)}-${raw.slice(3)}`

export default function EnoFamilyOnboarding({ onClose }) {
  const { session, completeLink } = useApp()
  const [step, setStep] = useState(STEPS.CHOICE)
  const [choiceError, setChoiceError] = useState('')
  const [creatingLink, setCreatingLink] = useState(false)

  // Senior's freshly-issued code, from the server.
  const [link, setLink] = useState(null) // { id, code, expiresAt }
  // Copilot's verified link, from the server — includes the senior's real
  // customerId, so CopilotApp.jsx can look up their actual account instead
  // of the copilot typing/pasting one in.
  const [verifiedLinkId, setVerifiedLinkId] = useState(null)
  const [verifiedSeniorCustomerId, setVerifiedSeniorCustomerId] = useState(null)

  const startSenior = async () => {
    setChoiceError('')
    setCreatingLink(true)
    try {
      const created = await createLink(session.customerId)
      setLink(created)
      setStep(STEPS.SENIOR_CODE)
    } catch (err) {
      setChoiceError(err.message)
    } finally {
      setCreatingLink(false)
    }
  }

  // Senior: the copilot verifying the code arrives as a socket event, not a
  // button click — advance to consent the moment it does.
  useEffect(() => {
    if (step !== STEPS.SENIOR_CODE || !link) return
    const socket = getSocket()
    if (!socket) return
    const onVerified = (payload) => {
      if (payload.linkId === link.id) setStep(STEPS.CONSENT)
    }
    socket.on('link:verified', onVerified)
    return () => socket.off('link:verified', onVerified)
  }, [step, link])

  const handleVerify = async (code) => {
    const verified = await verifyLink(code, session.customerId)
    setVerifiedLinkId(verified.linkId)
    setVerifiedSeniorCustomerId(verified.seniorCustomerId)
    setStep(STEPS.COPILOT_WAITING)
  }

  // Copilot: verifying the code isn't the end of it — the senior still has
  // to authorize. That arrives as a second socket event.
  useEffect(() => {
    if (step !== STEPS.COPILOT_WAITING || verifiedLinkId == null) return
    const socket = getSocket()
    if (!socket) return
    const onAuthorized = (payload) => {
      if (payload.linkId === verifiedLinkId) {
        completeLink('copilot', verifiedSeniorCustomerId)
        onClose()
      }
    }
    socket.on('link:authorized', onAuthorized)
    return () => socket.off('link:authorized', onAuthorized)
  }, [step, verifiedLinkId, verifiedSeniorCustomerId, completeLink, onClose])

  const handleAuthorize = async () => {
    await authorizeLink(link.id, GRANTED_PERMISSIONS)
    completeLink('senior', session.customerId)
    onClose()
  }

  return (
    <div className="absolute inset-0 z-[70] bg-[#F4F6F8] flex flex-col">
      <header className="h-16 bg-white flex items-center justify-between px-4 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          {step !== STEPS.CHOICE && step !== STEPS.CONSENT && (
            <button
              onClick={() => setStep(STEPS.CHOICE)}
              aria-label="Atrás"
              className="h-12 w-10 flex items-center justify-center text-[#003A6F]"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="font-bold text-[#003A6F] text-lg">Eno Family</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="h-12 w-12 flex items-center justify-center text-gray-500"
        >
          <X size={22} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {step === STEPS.CHOICE && (
          <ChoiceStep
            onSenior={startSenior}
            onCopilot={() => setStep(STEPS.COPILOT_CODE)}
            loading={creatingLink}
            error={choiceError}
          />
        )}
        {step === STEPS.SENIOR_CODE && <SeniorCodeStep code={link.code} />}
        {step === STEPS.COPILOT_CODE && <CopilotCodeStep onSubmit={handleVerify} />}
        {step === STEPS.COPILOT_WAITING && <CopilotWaitingStep />}
        {step === STEPS.CONSENT && <ConsentStep onAuthorize={handleAuthorize} />}
      </div>
    </div>
  )
}

/* ---------------------------- Step 1: choice ---------------------------- */

function ChoiceStep({ onSenior, onCopilot, loading, error }) {
  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold text-[#003A6F]">Protege a los tuyos</h1>
      <p className="mt-2 text-sm text-gray-600">
        Conecta tu cuenta con la de un familiar para cuidarse mutuamente.
      </p>

      <div className="mt-6 space-y-4">
        <button
          onClick={onSenior}
          disabled={loading}
          className="w-full bg-white rounded-2xl p-5 shadow-sm text-left border-2 border-transparent active:border-[#003A6F] disabled:opacity-60"
        >
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-[#003A6F] flex items-center justify-center shrink-0">
              {loading ? (
                <Loader2 size={22} className="text-white animate-spin" />
              ) : (
                <UserPlus size={22} className="text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-[#003A6F] text-base leading-snug">
                Vincular mi cuenta
              </p>
              <p className="text-sm text-gray-500">(Generar Código)</p>
              <p className="text-xs text-gray-400 mt-1">
                Quiero que un familiar cuide de mi seguridad.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={onCopilot}
          className="w-full bg-white rounded-2xl p-5 shadow-sm text-left border-2 border-transparent active:border-[#D03027]"
        >
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-[#D03027] flex items-center justify-center shrink-0">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[#003A6F] text-base leading-snug">
                Vincular a un familiar
              </p>
              <p className="text-sm text-gray-500">(Ingresar Código)</p>
              <p className="text-xs text-gray-400 mt-1">
                Quiero cuidar la seguridad de alguien más.
              </p>
            </div>
          </div>
        </button>

        {error && <p className="text-sm text-[#D03027] font-medium">{error}</p>}
      </div>
    </div>
  )
}

/* ------------------- Step 2A: senior's server-issued code ------------------- */

function SeniorCodeStep({ code }) {
  return (
    <div className="p-5 text-center">
      <h1 className="text-xl font-bold text-[#003A6F]">Tu código de vinculación</h1>
      <p className="mt-2 text-sm text-gray-600">
        Compártelo con tu familiar. Solo funciona una vez.
      </p>

      <div className="mt-8 bg-white rounded-2xl py-8 shadow-sm">
        <p className="text-5xl font-extrabold tracking-widest text-[#003A6F] tabular-nums">
          {formatCode(code)}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        <p className="text-sm">Esperando a que tu familiar ingrese el código…</p>
      </div>
    </div>
  )
}

/* -------------------- Step 2B: copilot enters a code -------------------- */

function CopilotCodeStep({ onSubmit }) {
  const [digits, setDigits] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const verify = async () => {
    if (digits.length !== 6) {
      setError('Ingresa los 6 dígitos del código.')
      return
    }
    setError('')
    setVerifying(true)
    try {
      await onSubmit(digits)
    } catch (err) {
      setError(err.message)
      setVerifying(false)
    }
  }

  return (
    <div className="p-5 flex flex-col h-full">
      <h1 className="text-xl font-bold text-[#003A6F]">Ingresa el código</h1>
      <p className="mt-2 text-sm text-gray-600">
        Pide a tu familiar el código de 6 dígitos que aparece en su teléfono.
      </p>

      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`h-14 w-11 rounded-xl bg-white border-2 flex items-center justify-center text-2xl font-bold text-[#003A6F] ${
              i === digits.length ? 'border-[#003A6F]' : 'border-gray-300'
            }`}
          >
            {digits[i] || ''}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-[#D03027] font-semibold text-center">{error}</p>
      )}

      <div className="mt-6">
        <PinPad
          value={digits}
          onChange={(v) => {
            setDigits(v)
            setError('')
          }}
          maxLength={6}
        />
      </div>

      <button
        onClick={verify}
        disabled={verifying}
        className="mt-6 w-full h-14 rounded-xl bg-[#003A6F] text-white font-bold text-base disabled:opacity-60"
      >
        {verifying ? 'Verificando…' : 'Verificar'}
      </button>
    </div>
  )
}

/* --------------- Step 2B-continued: waiting for the senior --------------- */

function CopilotWaitingStep() {
  return (
    <div className="p-5 text-center">
      <h1 className="text-xl font-bold text-[#003A6F]">Código verificado</h1>
      <p className="mt-2 text-sm text-gray-600">
        Ahora tu familiar debe autorizar la vinculación desde su teléfono.
      </p>

      <div className="mt-10 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        <p className="text-sm">Esperando autorización…</p>
      </div>
    </div>
  )
}

/* ------------------ Step 3: senior consent + NIP signing ---------------- */

function ConsentStep({ onAuthorize }) {
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
      await onAuthorize()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={22} className="text-[#003A6F]" />
        <h1 className="text-xl font-bold text-[#003A6F]">Autorización</h1>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border-l-4 border-[#003A6F]">
        <p className="text-sm text-gray-700 leading-relaxed">
          Autorizas a este usuario a monitorear tu seguridad. No podrá realizar
          transferencias sin tu permiso ni ver tu saldo total.
        </p>
      </div>

      <p className="mt-6 text-sm font-semibold text-[#003A6F]">
        Ingresa tu NIP para firmar
      </p>

      <div className="mt-3">
        <PinDots value={nip} />
      </div>

      {error && (
        <p className="mt-3 text-sm text-[#D03027] font-semibold text-center">{error}</p>
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
        className="mt-5 w-full h-14 rounded-xl bg-[#D03027] text-white font-bold text-base shadow-md disabled:opacity-60"
      >
        {submitting ? 'Firmando…' : 'Firmar y Autorizar'}
      </button>
    </div>
  )
}
