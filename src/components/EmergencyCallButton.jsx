import { Phone } from 'lucide-react'

const EMERGENCY_NUMBER = '911'

/**
 * Click-to-call emergency action for the abuelito interface.
 * `big` renders the oversized Easy Mode treatment; otherwise it matches the
 * standard dashboard's button sizing.
 */
export default function EmergencyCallButton({ big = false }) {
  return (
    <a
      href={`tel:${EMERGENCY_NUMBER}`}
      aria-label="Llamada de emergencia"
      className={
        big
          ? 'flex items-center justify-center gap-3 w-full h-20 rounded-2xl bg-[#D03027] text-white font-extrabold text-2xl shadow-lg active:opacity-90'
          : 'flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-[#D03027] text-white font-bold text-base shadow-md active:opacity-90'
      }
    >
      <Phone size={big ? 32 : 20} />
      Llamada de emergencia
    </a>
  )
}
