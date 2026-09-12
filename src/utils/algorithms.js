// Subscription "leak" detector.
//
// A recurring subscription looks like a merchant you pay on a steady cadence
// for a steady amount. Both of those are low-variance signals, so we score a
// merchant by how little its intervals and amounts vary.

const DAY_MS = 1000 * 60 * 60 * 24

export function mean(values) {
  if (!values.length) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// Population standard deviation.
export function stdDev(values) {
  if (!values.length) return 0
  const mu = mean(values)
  const variance = mean(values.map((v) => (v - mu) ** 2))
  return Math.sqrt(variance)
}

// Coefficient of variation. A mean of 0 has no meaningful spread ratio, so we
// report 0 variation rather than dividing by zero.
export function coefficientOfVariation(values) {
  const mu = mean(values)
  if (mu === 0) return 0
  return stdDev(values) / Math.abs(mu)
}

export function groupByMerchant(purchases) {
  const groups = new Map()
  for (const p of purchases || []) {
    const id = p.merchant_id
    if (!id) continue
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(p)
  }
  return groups
}

/**
 * @param {Array} purchases Nessie purchase objects
 * @param {number} threshold minimum score to flag (default 0.65)
 * @returns {Array} flagged merchants, highest score first
 */
export function detectSubscriptions(purchases, threshold = 0.65) {
  const groups = groupByMerchant(purchases)
  const flagged = []

  for (const [merchantId, txns] of groups) {
    if (txns.length < 2) continue

    const dates = txns
      .map((t) => new Date(t.purchase_date).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b)
    if (dates.length < 2) continue

    const intervals = []
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i - 1]) / DAY_MS)
    }

    const amounts = txns.map((t) => Number(t.amount) || 0)

    const cvInterval = coefficientOfVariation(intervals)
    const cvAmount = coefficientOfVariation(amounts)
    const score = 0.5 * (1 - cvInterval) + 0.5 * (1 - cvAmount)

    if (score > threshold) {
      flagged.push({
        merchantId,
        merchantName: txns[0].description || `Merchant ${merchantId.slice(-6)}`,
        transactions: txns,
        count: txns.length,
        score,
        cvInterval,
        cvAmount,
        avgAmount: mean(amounts),
        avgIntervalDays: mean(intervals),
        lastDate: new Date(dates[dates.length - 1]).toISOString().slice(0, 10),
      })
    }
  }

  return flagged.sort((a, b) => b.score - a.score)
}
