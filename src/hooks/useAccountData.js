import { useCallback, useEffect, useRef, useState } from 'react'
import { getCustomerAccounts } from '../services/api.js'
import { mockPurchases } from '../data/mockPurchases.js'

const byNewestFirst = (a, b) => new Date(b.purchase_date) - new Date(a.purchase_date)

/**
 * Loads the customer's primary account (balance/nickname) from Nessie.
 * Purchases are NOT fetched from Nessie — its sandbox purchases feed is
 * unreliable (see the corrupted-merchant_id issue this replaced) — so they
 * come from the hardcoded src/data/mockPurchases.js dataset instead, kept in
 * local state so a completed transfer can be appended immediately via
 * `addPurchase` without waiting on any refetch.
 *
 * Returns { account, purchases, loading, error, reload, addPurchase }.
 */
export function useAccountData(customerId) {
  const [account, setAccount] = useState(null)
  const [purchases, setPurchases] = useState(() => [...mockPurchases].sort(byNewestFirst))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Only the newest request may write state, so a slow earlier response can't
  // overwrite fresher data after the id changes.
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestRef.current
    setLoading(true)
    setError('')
    try {
      const accounts = await getCustomerAccounts(customerId)
      if (id !== requestRef.current) return
      setAccount(accounts[0] || null)
    } catch (err) {
      if (id !== requestRef.current) return
      setError(err.message)
    } finally {
      if (id === requestRef.current) setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    load()
  }, [load])

  // Injects a locally-created purchase (e.g. a just-sent transfer) and
  // optimistically debits the displayed balance. Deliberately doesn't touch
  // Nessie: `reload` only re-fetches the account, so it can't clobber this.
  const addPurchase = useCallback((purchase) => {
    setPurchases((prev) => [purchase, ...prev].sort(byNewestFirst))
    setAccount((prev) =>
      prev ? { ...prev, balance: Number(prev.balance) - Number(purchase.amount) } : prev
    )
  }, [])

  return { account, purchases, loading, error, reload: load, addPurchase }
}
