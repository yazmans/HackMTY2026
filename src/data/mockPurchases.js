// Hardcoded stand-in for the Nessie purchases feed (see useAccountData.js).
// Nessie's sandbox purchases are unreliable (some accounts 400 on GET, see
// the corrupted-merchant_id issue this file was introduced to work around),
// so the weekly spending chart and "Movimientos recientes" read from this
// fixed dataset instead. Subscriptions/"Fugas por suscripción" no longer
// derive from these purchases — see CopilotApp.jsx and StandardDashboard.jsx,
// both of which now fetch real bills via getAccountBills().
//
// Anchored on a fixed "today" (not `new Date()`) so the data is
// deterministic: the most recent Sunday is 2026-09-06, and the dataset spans
// exactly the 4 Mon-Sun weeks ending on it (2026-08-10 through 2026-09-06).
export const MOST_RECENT_SUNDAY = '2026-09-06'

// "Spotify Premium" recurs every 7 days at a near-constant amount — just
// realistic-looking recurring spend for the chart/movements now, not fed
// into any subscription detector.
export const mockPurchases = [
  // ---- Week 1: 2026-08-10 (Mon) - 2026-08-16 (Sun) ----
  { _id: 'mp_001', merchant_id: 'mch_000000000000000000101', description: 'Renta', amount: 8500.0, purchase_date: '2026-08-10' },
  { _id: 'mp_002', merchant_id: 'mch_000000000000000000102', description: 'Ropa', amount: 450.0, purchase_date: '2026-08-11' },
  { _id: 'mp_003', merchant_id: 'mch_00000000000000spotify', description: 'Spotify Premium', amount: 149.0, purchase_date: '2026-08-12' },
  { _id: 'mp_004', merchant_id: 'mch_000000000000000000103', description: 'Supermercado', amount: 850.32, purchase_date: '2026-08-13' },
  { _id: 'mp_005', merchant_id: 'mch_000000000000000000104', description: 'Gasolina', amount: 620.0, purchase_date: '2026-08-15' },
  { _id: 'mp_006', merchant_id: 'mch_000000000000000000105', description: 'Restaurante', amount: 340.5, purchase_date: '2026-08-16' },

  // ---- Week 2: 2026-08-17 (Mon) - 2026-08-23 (Sun) ----
  { _id: 'mp_007', merchant_id: 'mch_000000000000000000106', description: 'Luz CFE', amount: 480.75, purchase_date: '2026-08-17' },
  { _id: 'mp_008', merchant_id: 'mch_000000000000000000107', description: 'Farmacia', amount: 215.0, purchase_date: '2026-08-18' },
  { _id: 'mp_009', merchant_id: 'mch_00000000000000spotify', description: 'Spotify Premium', amount: 152.0, purchase_date: '2026-08-19' },
  { _id: 'mp_010', merchant_id: 'mch_000000000000000000108', description: 'Supermercado', amount: 920.15, purchase_date: '2026-08-20' },
  { _id: 'mp_011', merchant_id: 'mch_000000000000000000109', description: 'Cine', amount: 180.0, purchase_date: '2026-08-22' },
  { _id: 'mp_012', merchant_id: 'mch_000000000000000000110', description: 'Café', amount: 95.5, purchase_date: '2026-08-23' },

  // ---- Week 3: 2026-08-24 (Mon) - 2026-08-30 (Sun) ----
  { _id: 'mp_013', merchant_id: 'mch_000000000000000000111', description: 'Seguro médico', amount: 1250.0, purchase_date: '2026-08-24' },
  { _id: 'mp_014', merchant_id: 'mch_000000000000000000112', description: 'Gasolina', amount: 600.0, purchase_date: '2026-08-25' },
  { _id: 'mp_015', merchant_id: 'mch_00000000000000spotify', description: 'Spotify Premium', amount: 146.0, purchase_date: '2026-08-26' },
  { _id: 'mp_016', merchant_id: 'mch_000000000000000000113', description: 'Internet Telmex', amount: 599.0, purchase_date: '2026-08-27' },
  { _id: 'mp_017', merchant_id: 'mch_000000000000000000114', description: 'Café', amount: 88.0, purchase_date: '2026-08-28' },
  { _id: 'mp_018', merchant_id: 'mch_000000000000000000115', description: 'Restaurante', amount: 410.0, purchase_date: '2026-08-29' },
  { _id: 'mp_019', merchant_id: 'mch_000000000000000000116', description: 'Supermercado', amount: 780.9, purchase_date: '2026-08-30' },

  // ---- Week 4 (most recent): 2026-08-31 (Mon) - 2026-09-06 (Sun) ----
  // Every day of this week has at least one purchase, for the weekly chart.
  { _id: 'mp_020', merchant_id: 'mch_000000000000000000117', description: 'Renta', amount: 8500.0, purchase_date: '2026-08-31' },
  { _id: 'mp_021', merchant_id: 'mch_000000000000000000118', description: 'Farmacia', amount: 180.25, purchase_date: '2026-09-01' },
  { _id: 'mp_022', merchant_id: 'mch_00000000000000spotify', description: 'Spotify Premium', amount: 150.0, purchase_date: '2026-09-02' },
  { _id: 'mp_023', merchant_id: 'mch_000000000000000000119', description: 'Agua', amount: 210.0, purchase_date: '2026-09-03' },
  { _id: 'mp_024', merchant_id: 'mch_000000000000000000120', description: 'Gasolina', amount: 640.0, purchase_date: '2026-09-04' },
  { _id: 'mp_025', merchant_id: 'mch_000000000000000000121', description: 'Supermercado', amount: 890.4, purchase_date: '2026-09-05' },
  { _id: 'mp_026', merchant_id: 'mch_000000000000000000122', description: 'Cine', amount: 210.0, purchase_date: '2026-09-05' },
  { _id: 'mp_027', merchant_id: 'mch_000000000000000000123', description: 'Restaurante', amount: 375.6, purchase_date: '2026-09-06' },
]
