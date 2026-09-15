import { supabase } from '../../lib/supabaseClient'
import { createPaymentForOffer } from '../payments/paymentService'

// Counter-offers are capped so negotiation can't go back and forth
// indefinitely — round 1 is the buyer's opening price; rounds 2 and 3 can
// each be a counter from the other side. Whoever receives the round-3
// price can only accept or reject, not counter again.
export const MAX_NEGOTIATION_ROUNDS = 3

export async function getOffersForLot(lotId) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('lot_id', lotId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMyOffers(buyerId) {
  const { data, error } = await supabase
    .from('offers')
    .select('*, lots(*)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createOffer({ lotId, buyerId, pricePerQuintal, quantityQuintal }) {
  const { data, error } = await supabase
    .from('offers')
    .insert({
      lot_id: lotId,
      buyer_id: buyerId,
      price_per_quintal: pricePerQuintal,
      quantity_quintal: quantityQuintal,
      round: 1,
      last_actor: 'buyer',
      negotiation_history: [{ actor: 'buyer', price: pricePerQuintal, at: new Date().toISOString() }],
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// `actor` is whichever side is proposing this new price — the one who did
// NOT propose the current price_per_quintal (offerService/UI enforces this
// by only showing the counter control to that side). Throws once
// MAX_NEGOTIATION_ROUNDS is reached, so a negotiation can't run forever.
export async function counterOffer(offer, actor, newPricePerQuintal) {
  if (offer.round >= MAX_NEGOTIATION_ROUNDS) {
    throw new Error('Negotiation limit reached — accept or reject this price.')
  }

  const history = [
    ...(offer.negotiation_history || []),
    { actor, price: newPricePerQuintal, at: new Date().toISOString() },
  ]

  const { data, error } = await supabase
    .from('offers')
    .update({
      price_per_quintal: newPricePerQuintal,
      round: offer.round + 1,
      last_actor: actor,
      negotiation_history: history,
    })
    .eq('id', offer.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// `lockDays` freezes the price against market swings for that many days —
// the price-freeze feature from the original feature list. null means no lock.
export async function respondToOffer(offerId, status, lockDays = null) {
  const updates = { status }
  if (status === 'accepted' && lockDays) {
    const until = new Date()
    until.setDate(until.getDate() + lockDays)
    updates.price_locked_until = until.toISOString().slice(0, 10)
  }
  const { data, error } = await supabase.from('offers').update(updates).eq('id', offerId).select().single()
  if (error) throw error

  if (status === 'accepted') {
    await supabase.from('lots').update({ status: 'sold' }).eq('id', data.lot_id)
    await createPaymentForOffer(data)
  }
  return data
}
