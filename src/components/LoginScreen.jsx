import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Header } from './Brand.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function LoginScreen() {
  const { signIn } = useApp()
  const [firstName, setFirstName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!firstName.trim() || !customerId.trim()) {
      setError('Completa los dos campos para continuar.')
      return
    }
    setError('')
    signIn(firstName, customerId)
  }

  const inputClass =
    'w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base text-[#003A6F] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003A6F]'

  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
        <h1 className="text-2xl font-bold text-[#003A6F]">Bienvenido a Capital One</h1>
        <p className="mt-1 text-sm text-gray-500">
          Inicia sesión con tus datos.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#003A6F] mb-1">
              Ingresa tu nombre
            </label>
            <input
              className={inputClass}
              placeholder="Tu nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#003A6F] mb-1">
              Customer ID
            </label>
            <input
              className={inputClass}
              placeholder="5a8a1e...."
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-[#D03027] font-medium">{error}</p>}

          <button
            type="submit"
            className="bg-[#003A6F] text-white w-full h-12 rounded-full font-semibold text-base active:opacity-90"
          >
            Sign In
          </button>
        </form>

        <div className="mt-8 flex items-start gap-2 text-xs text-gray-500">
          <Lock size={14} className="mt-0.5 shrink-0" />
          <p>
            Prototipo conectado a la API real de Nessie. Tu rol se define al vincular tu
            cuenta con Eno Family desde el inicio.
          </p>
        </div>
      </div>
    </>
  )
}
