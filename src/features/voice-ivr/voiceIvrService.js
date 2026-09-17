import { supabase } from '../../lib/supabaseClient'

// Same buyer-lookup logic as supabase/functions/ivr-webhook/index.ts —
// deliberately no ranking/scoring, just existence — kept here as a
// client-side twin so this in-browser voice demo and the real phone-call
// backend produce the same result for the same crop.
export async function getBuyersForCrop(crop) {
  const { data: activeBuyers } = await supabase
    .from('offers')
    .select('lots!inner(crop), profiles!offers_buyer_id_profiles_fkey(name, phone)')
    .eq('lots.crop', crop)
    .limit(3)

  let buyers = (activeBuyers ?? []).map((o) => o.profiles).filter(Boolean)

  if (buyers.length === 0) {
    const { data: anyBuyers } = await supabase.from('profiles').select('name, phone').eq('role', 'buyer').limit(3)
    buyers = anyBuyers ?? []
  }

  return buyers
}
