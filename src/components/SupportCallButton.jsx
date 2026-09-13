import { useState } from 'react'
import { PhoneCall } from 'lucide-react'
import CallingSupportModal from './CallingSupportModal.jsx'

const BASE_CLASS =
  'w-full h-16 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2'

/**
 * Drop-in "call support" button. No real call is placed and no external
 * service is contacted — pressing it just shows the shared CallingSupportModal.
 */
export default function SupportCallButton() {
  const [open, setOpen] = useState(false)

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

      {open && <CallingSupportModal onClose={() => setOpen(false)} />}
    </>
  )
}
