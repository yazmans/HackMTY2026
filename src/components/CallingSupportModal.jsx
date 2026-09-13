import { useEffect } from 'react'
import { Loader2, X } from 'lucide-react'

/**
 * Shared "calling support" pop-up. No real call is placed and no external
 * service is contacted — it just shows a spinner and closes itself (or can
 * be closed manually). Used by both SupportCallButton and
 * EmergencyCallButton so their behavior stays identical by construction.
 */
export default function CallingSupportModal({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-[95] bg-black/60 flex items-center justify-center p-6">
      <div className="w-full max-w-xs bg-white rounded-2xl p-6 text-center shadow-xl relative">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 h-9 w-9 flex items-center justify-center rounded-full text-gray-400"
        >
          <X size={18} />
        </button>
        <Loader2 size={40} className="mx-auto text-[#003A6F] animate-spin" />
        <p className="mt-4 text-lg font-bold text-[#003A6F]">Llamando a soporte…</p>
        <p className="mt-1 text-sm text-gray-500">Un agente te atenderá en breve.</p>
      </div>
    </div>
  )
}
