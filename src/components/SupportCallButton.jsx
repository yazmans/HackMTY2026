import { useEffect, useState } from 'react'
import { PhoneCall, Loader2, X } from 'lucide-react'

const BASE_CLASS =
  'w-full h-16 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2'

/**
 * Drop-in "call support" button. No real call is placed and no external
 * service is contacted — pressing it just shows a "calling" pop-up that
 * closes itself (or can be closed manually).
 */
export default function SupportCallButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setOpen(false), 3000)
    return () => clearTimeout(t)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${BASE_CLASS} bg-[#D03027] active:opacity-90`}
      >
        <PhoneCall size={22} />
        Contactar a soporte prioritario
      </button>

      {open && (
        <div className="absolute inset-0 z-[95] bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-xs bg-white rounded-2xl p-6 text-center shadow-xl relative">
            <button
              onClick={() => setOpen(false)}
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
      )}
    </>
  )
}
