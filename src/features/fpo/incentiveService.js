import { supabase } from '../../lib/supabaseClient'

// Tiers are computed from the FPO's own real pooling activity — total
// quintal pooled across all their pools, ever — not a separate stored
// score, so there's nothing to fake or drift out of sync with reality.
const TIERS = [
  { name: 'Gold', minQuintal: 150, className: 'bg-gold-500 text-white' },
  { name: 'Silver', minQuintal: 50, className: 'bg-gray-300 text-gray-800' },
  { name: 'Bronze', minQuintal: 1, className: 'bg-amber-100 text-amber-800' },
]

export async function getFpoIncentiveStatus(fpoId) {
  const { data: pools, error } = await supabase
    .from('pooled_lots')
    .select('id, pooled_lot_members(lots(quantity_quintal))')
    .eq('fpo_id', fpoId)
  if (error) throw error

  const totalQuintal = pools.reduce(
    (sum, pool) => sum + pool.pooled_lot_members.reduce((s, m) => s + Number(m.lots.quantity_quintal), 0),
    0
  )
  const poolCount = pools.length

  const tier = TIERS.find((t) => totalQuintal >= t.minQuintal) ?? null
  const nextTier = [...TIERS].reverse().find((t) => totalQuintal < t.minQuintal) ?? null

  return {
    totalQuintal,
    poolCount,
    tier,
    nextTier,
    quintalToNextTier: nextTier ? Math.max(0, nextTier.minQuintal - totalQuintal) : 0,
  }
}
