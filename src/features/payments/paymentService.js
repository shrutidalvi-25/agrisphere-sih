import { supabase } from '../../lib/supabaseClient'
import { anchorHash } from './blockchainService'

// A tamper-evident hash chain over each payment's key facts — computed
// client-side with the Web Crypto API. This is NOT a real blockchain (no
// distributed ledger, no consensus); it's the same "explainable, checkable"
// spirit as the rest of the app: anyone can recompute the hash from the
// payment's own fields and confirm it matches, which catches tampering with
// the stored record even though there's no network of nodes behind it.
async function computeHash(previousHash, fields) {
  const payload = `${previousHash ?? ''}|${JSON.stringify(fields)}`
  const bytes = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createPaymentForOffer(offer) {
  const amount = Number(offer.price_per_quintal) * Number(offer.quantity_quintal)
  const { data, error } = await supabase
    .from('payments')
    .insert({ offer_id: offer.id, amount, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markPaid(payment) {
  const tx_hash = await computeHash(payment.tx_hash, {
    paymentId: payment.id,
    amount: payment.amount,
    step: 'buyer_marked_paid',
    at: new Date().toISOString(),
  })
  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'paid', buyer_marked_paid_at: new Date().toISOString(), tx_hash })
    .eq('id', payment.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function confirmReceived(payment) {
  const tx_hash = await computeHash(payment.tx_hash, {
    paymentId: payment.id,
    amount: payment.amount,
    step: 'farmer_confirmed_received',
    at: new Date().toISOString(),
  })
  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'received', farmer_confirmed_at: new Date().toISOString(), tx_hash })
    .eq('id', payment.id)
    .select()
    .single()
  if (error) throw error

  // Anchor the final hash to Bitcoin via OpenTimestamps so it's
  // independently verifiable, not just internally consistent in our own
  // database. Best-effort: a deal is still validly "received" even if
  // every calendar server is briefly unreachable — anchoring failure
  // shouldn't block the underlying business action.
  try {
    const anchor = await anchorHash(tx_hash)
    if (anchor) {
      const { data: anchored, error: anchorError } = await supabase
        .from('payments')
        .update({
          anchor_calendar_url: anchor.calendarUrl,
          anchor_proof: anchor.proofBase64,
          anchor_submitted_at: anchor.submittedAt,
        })
        .eq('id', payment.id)
        .select()
        .single()
      if (!anchorError) return anchored
    }
  } catch (err) {
    console.error('Blockchain anchoring failed (non-fatal):', err.message)
  }

  return data
}

// Payments relevant to this user — as the buyer (via their offers) or as
// the farmer (via offers on their lots). Two round trips instead of one
// deep join, since PostgREST embedding two hops back (payments -> offers ->
// lots) filtered by farmer_id needs an explicit foreign-table filter that's
// simpler to express this way.
export async function getMyPayments(userId, role) {
  if (role === 'buyer') {
    const { data: offers, error: offersError } = await supabase.from('offers').select('id').eq('buyer_id', userId)
    if (offersError) throw offersError
    if (offers.length === 0) return []
    const { data, error } = await supabase
      .from('payments')
      .select('*, offers(*, lots(*))')
      .in('offer_id', offers.map((o) => o.id))
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  const { data: lots, error: lotsError } = await supabase.from('lots').select('id').eq('farmer_id', userId)
  if (lotsError) throw lotsError
  if (lots.length === 0) return []
  const { data: offers, error: offersError } = await supabase.from('offers').select('id').in('lot_id', lots.map((l) => l.id))
  if (offersError) throw offersError
  if (offers.length === 0) return []
  const { data, error } = await supabase
    .from('payments')
    .select('*, offers(*, lots(*))')
    .in('offer_id', offers.map((o) => o.id))
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
