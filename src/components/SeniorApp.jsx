import { useEffect, useState } from 'react'
import { Header, formatMoney, formatDate } from './Brand.jsx'
import StandardDashboard from './StandardDashboard.jsx'
import TransferModal from './TransferModal.jsx'
import ApprovalModal from './ApprovalModal.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAccountData } from '../hooks/useAccountData.js'

function EasyToggle({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-sm font-semibold text-[#003A6F]">Easy Mode</span>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative ${
          value ? 'bg-[#D03027]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 bg-white rounded-full shadow transition-all ${
            value ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

/** Unlocked for enoFamilyRole === 'senior'. */
export default function SeniorApp() {
  const {
    session,
    signOut,
    pendingCardRequest,
    cardRequestStatus,
    approveCardRequest,
    clearCardRequest,
  } = useApp()
  const [isEasyMode, setIsEasyMode] = useState(true)
  const [showTransfer, setShowTransfer] = useState(false)
  const { account, purchases, loading, error, reload } = useAccountData(
    session.customerId,
    session.accountId
  )

  // Stands in for a real-time cloud listener (Vultr/Firebase): whenever a
  // pending request appears in shared state, surface the approval modal.
  const [showApproval, setShowApproval] = useState(false)
  useEffect(() => {
    setShowApproval(cardRequestStatus === 'pending' && !!pendingCardRequest)
  }, [cardRequestStatus, pendingCardRequest])

  return (
    <>
      <Header>
        <EasyToggle value={isEasyMode} onChange={setIsEasyMode} />
      </Header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isEasyMode ? (
          loading ? (
            <p className="p-6 text-xl text-gray-500">Cargando tu cuenta…</p>
          ) : error ? (
            <div className="m-4 p-4 rounded-xl bg-red-50 border border-[#D03027]">
              <p className="text-xl text-[#D03027] font-semibold">
                No pudimos conectar con Nessie.
              </p>
              <p className="text-xs text-gray-600 mt-1 break-words">{error}</p>
              <button
                onClick={reload}
                className="mt-3 h-12 px-5 rounded-full bg-[#003A6F] text-white font-semibold"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <EasyMode
              account={account}
              purchases={purchases}
              onTransfer={() => setShowTransfer(true)}
            />
          )
        ) : (
          <StandardDashboard
            firstName={session.firstName}
            account={account}
            purchases={purchases}
            loading={loading}
            error={error}
            onReload={reload}
            onTransfer={() => setShowTransfer(true)}
            onSignOut={signOut}
          />
        )}
      </div>

      {showTransfer && (
        <TransferModal
          payerAccountId={session.accountId}
          big={isEasyMode}
          onClose={() => setShowTransfer(false)}
          onSuccess={reload}
        />
      )}

      {showApproval && pendingCardRequest && (
        <ApprovalModal
          pendingCardRequest={pendingCardRequest}
          onApprove={approveCardRequest}
          onReject={clearCardRequest}
        />
      )}
    </>
  )
}

/* Easy Mode: exactly three sections, oversized and high contrast. */
function EasyMode({ account, purchases, onTransfer }) {
  return (
    <div className="p-4 pb-8 space-y-6">
      <section className="bg-white rounded-2xl py-8 px-4 text-center shadow-sm">
        <p className="text-xl font-bold text-[#003A6F]">Tu saldo</p>
        <p className="mt-2 text-5xl font-extrabold text-[#003A6F] tracking-tight">
          {formatMoney(account?.balance)}
        </p>
        <p className="mt-2 text-xl text-gray-700">{account?.nickname || 'Cuenta'}</p>
      </section>

      <button
        onClick={onTransfer}
        className="bg-[#D03027] h-16 w-full text-white font-bold rounded-xl text-2xl shadow-md active:opacity-90"
      >
        Enviar dinero
      </button>

      <section>
        <h2 className="text-2xl font-bold text-[#003A6F] mb-3">Últimos movimientos</h2>
        {purchases.length === 0 ? (
          <p className="text-xl text-gray-600">No hay movimientos recientes.</p>
        ) : (
          <ul className="space-y-3">
            {purchases.slice(0, 15).map((p) => (
              <li
                key={p._id}
                className="bg-white rounded-2xl px-4 py-4 shadow-sm min-h-[48px]"
              >
                <p className="text-xl text-gray-700">{formatDate(p.purchase_date)}</p>
                <p className="text-2xl font-bold text-[#003A6F] leading-tight mt-1">
                  {p.description || 'Compra'}
                </p>
                <p className="text-3xl font-extrabold text-[#D03027] mt-1">
                  −{formatMoney(p.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
