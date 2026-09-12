export function CapitalOneLogo() {
  return (
    <div className="flex items-center font-bold text-[#003A6F] text-xl tracking-tighter">
      Capital One{' '}
      <span className="text-[#D03027] text-3xl leading-none ml-1 relative -top-1">›</span>
    </div>
  )
}

export function Header({ children }) {
  return (
    <header className="h-16 bg-white flex items-center justify-between px-4 shadow-sm z-50 shrink-0">
      <CapitalOneLogo />
      {children}
    </header>
  )
}

export function formatMoney(value) {
  const n = Number(value) || 0
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
