import { useCallback, useEffect, useRef, useState } from 'react'
import { getCustomerAccounts, getAccountPurchases } from '../services/api.js'

/**
 * Loads the signed-in account plus its purchases, newest first.
 * Returns { account, purchases, loading, error, reload }.
 */
export function useAccountData(customerId, accountId) {
  const [account, setAccount] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Only the newest request may write state, so a slow earlier response can't
  // overwrite fresher data after the ids change.
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestRef.current
    setLoading(true)
    setError('')
    try {
      const [accounts, buys] = await Promise.all([
        getCustomerAccounts(customerId),
        getAccountPurchases(accountId),
      ])
      if (id !== requestRef.current) return
      setAccount(accounts.find((a) => a._id === accountId) || accounts[0] || null)
      setPurchases(
        [...buys].sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
      )
    } catch (err) {
      if (id !== requestRef.current) return
      setError(err.message)
    } finally {
      if (id === requestRef.current) setLoading(false)
    }
  }, [customerId, accountId])

  useEffect(() => {
    load()
  }, [load])

  return { account, purchases, loading, error, reload: load }
}
