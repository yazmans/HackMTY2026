import { Wifi, CheckCircle2 } from 'lucide-react'
import { formatMoney } from './Brand.jsx'

/**
 * Simulated virtual card. Every value shown comes from what the user typed in
 * the Eno chat — nothing here is hardcoded.
 */
export default function VirtualCard({ category, limit, last4 = '4821' }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#003A6F] to-[#00254a] text-white p-5 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/70">
            Tarjeta Virtual
          </p>
          <p className="text-base font-bold mt-0.5">Eno Family</p>
        </div>
        <Wifi size={20} className="text-white/80 rotate-90" />
      </div>

      <p className="mt-6 text-xl font-semibold tracking-[0.2em] tabular-nums">
        •••• •••• •••• {last4}
      </p>

      {/* The Eno FAB floats over the lower-right of the frame, so keep the
          amount clear of it. */}
      <div className="mt-5 flex items-end justify-between gap-3 pr-16">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-white/60">
            Restringida a
          </p>
          <p className="text-base font-bold truncate">{category}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-white/60">Límite</p>
          <p className="text-xl font-extrabold whitespace-nowrap">
            {formatMoney(limit)}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-1.5">
        <CheckCircle2 size={14} className="text-green-400" />
        <p className="text-xs text-white/80">Autorizada</p>
      </div>
    </div>
  )
}
