import { supabase } from '../../lib/supabaseClient'

// Explainable reliability score (0-100), same "no black box" rule as
// sell/hold and grading: completed deals (farmer confirmed payment
// received) as a share of all accepted offers on that farmer's lots.
// New farmers with no history yet get a neutral starting score rather than
// a punishing 0, so the score doesn't unfairly gate first-time sellers.
export async function getFarmerReliability(farmerId) {
  const { data: lots, error: lotsError } = await supabase.from('lots').select('id').eq('farmer_id', farmerId)
  if (lotsError) throw lotsError
  const lotIds = lots.map((l) => l.id)

  if (lotIds.length === 0) {
    return { score: 60, completedDeals: 0, totalDeals: 0, reason: 'No sales history yet — starting score.' }
  }

  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select('id, status, lot_id')
    .in('lot_id', lotIds)
    .eq('status', 'accepted')
  if (offersError) throw offersError

  if (offers.length === 0) {
    return { score: 60, completedDeals: 0, totalDeals: 0, reason: 'No completed deals yet — starting score.' }
  }

  const offerIds = offers.map((o) => o.id)
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('offer_id, status')
    .in('offer_id', offerIds)
  if (paymentsError) throw paymentsError

  const completed = payments.filter((p) => p.status === 'received').length
  const total = offers.length
  const score = Math.round((completed / total) * 100)

  return {
    score,
    completedDeals: completed,
    totalDeals: total,
    reason: `${completed} of ${total} accepted deals completed with confirmed payment.`,
  }
}

export function reliabilityTier(score) {
  if (score >= 80) return { label: 'Trusted', color: 'text-primary-700 bg-primary-100' }
  if (score >= 50) return { label: 'Building trust', color: 'text-gold-700 bg-gold-50' }
  return { label: 'New / low history', color: 'text-red-700 bg-red-50' }
}
