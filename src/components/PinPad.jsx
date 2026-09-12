import { Delete } from 'lucide-react'

/** Realistic banking pin-pad. Shared by the link consent and card approval flows. */
export default function PinPad({ value, onChange, maxLength }) {
  const press = (digit) => {
    if (value.length >= maxLength) return
    onChange(value + digit)
  }
  const backspace = () => onChange(value.slice(0, -1))

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((k) => (
        <PinKey key={k} onClick={() => press(k)}>
          {k}
        </PinKey>
      ))}
      <div />
      <PinKey onClick={() => press('0')}>0</PinKey>
      <button
        onClick={backspace}
        aria-label="Borrar"
        className="h-14 rounded-xl flex items-center justify-center text-[#003A6F] active:bg-gray-200"
      >
        <Delete size={22} />
      </button>
    </div>
  )
}

function PinKey({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-14 rounded-xl bg-white shadow-sm text-2xl font-semibold text-[#003A6F] active:bg-gray-100"
    >
      {children}
    </button>
  )
}

/** Masked NIP display: one box per digit. */
export function PinDots({ value, length = 4 }) {
  return (
    <div className="flex justify-center gap-4">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`h-14 w-14 rounded-xl bg-white border-2 flex items-center justify-center ${
            i === value.length ? 'border-[#003A6F]' : 'border-gray-300'
          }`}
        >
          <span className="text-3xl leading-none text-[#003A6F]">
            {value[i] ? '•' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
