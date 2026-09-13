import { useState } from 'react'
import { Phone } from 'lucide-react'
import CallingSupportModal from './CallingSupportModal.jsx'

/**
 * "Call support" action for the abuelito interface. No real call is placed
 * and no external service is contacted — it shows the same
 * CallingSupportModal pop-up as SupportCallButton, so both behave
 * identically. `big` renders the oversized Easy Mode treatment; otherwise it
 * matches the standard dashboard's button sizing.
 */
export default function EmergencyCallButton({ big = false }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Llamar al soporte"
        className={
          big
            ? 'flex items-center justify-center gap-3 w-full h-20 rounded-2xl bg-[#D03027] text-white font-extrabold text-2xl shadow-lg active:opacity-90'
            : 'flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-[#D03027] text-white font-bold text-base shadow-md active:opacity-90'
        }
      >
        <Phone size={big ? 32 : 20} />
        Llamar al soporte
      </button>

      {open && <CallingSupportModal onClose={() => setOpen(false)} />}
    </>
  )
}
