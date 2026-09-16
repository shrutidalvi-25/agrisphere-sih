import { supabase } from '../../lib/supabaseClient'

// `status` undefined/null means "all non-admin accounts" — used by the
// reviewed-accounts tab so an admin can find and undo a past decision.
export async function getProfiles(status) {
  let query = supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: true })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPendingProfiles() {
  return getProfiles('active')
}

// `reason` is only meaningful for status 'flagged' — stored so the decision
// is auditable later. Moving a profile back to 'active' (undo/re-review)
// clears any old reason so it doesn't linger from a previous flag.
export async function setProfileStatus(userId, status, reason = null) {
  const updates = { status, flag_reason: status === 'flagged' ? reason : null }
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single()
  if (error) throw error
  return data
}

// A quick, honest activity signal for the expanded profile view — real
// counts from that person's own rows, not a computed "trust score". Lets
// an admin notice, for example, an unverified farmer who already has lots
// listed, which is worth a second look before approving.
export async function getProfileActivity(profileId, role) {
  if (role === 'farmer') {
    const { count, error } = await supabase.from('lots').select('id', { count: 'exact', head: true }).eq('farmer_id', profileId)
    if (error) throw error
    return { label: 'lots created', count: count ?? 0 }
  }
  if (role === 'buyer') {
    const { count, error } = await supabase.from('offers').select('id', { count: 'exact', head: true }).eq('buyer_id', profileId)
    if (error) throw error
    return { label: 'offers made', count: count ?? 0 }
  }
  if (role === 'fpo') {
    const { count, error } = await supabase.from('pooled_lots').select('id', { count: 'exact', head: true }).eq('fpo_id', profileId)
    if (error) throw error
    return { label: 'pools created', count: count ?? 0 }
  }
  return null
}

// Platform-wide counts for the admin dashboard — every number here is a
// direct read of real rows (no caching, no estimates), same "explainable,
// not a black box" principle as the rest of the app.
export async function getPlatformStats() {
  const [profiles, lots, offers, payments] = await Promise.all([
    supabase.from('profiles').select('role, status'),
    supabase.from('lots').select('status'),
    supabase.from('offers').select('status'),
    supabase.from('payments').select('status, amount'),
  ])
  if (profiles.error) throw profiles.error
  if (lots.error) throw lots.error
  if (offers.error) throw offers.error
  if (payments.error) throw payments.error

  const countBy = (rows, key) =>
    rows.reduce((acc, row) => {
      acc[row[key]] = (acc[row[key]] || 0) + 1
      return acc
    }, {})

  const roleCounts = countBy(profiles.data, 'role')
  const pendingVerification = profiles.data.filter((p) => p.status === 'active' && p.role !== 'admin').length
  const lotCounts = countBy(lots.data, 'status')
  const offerCounts = countBy(offers.data, 'status')
  const paymentCounts = countBy(payments.data, 'status')
  const totalTransactedValue = payments.data
    .filter((p) => p.status === 'received')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return {
    farmers: roleCounts.farmer || 0,
    buyers: roleCounts.buyer || 0,
    fpos: roleCounts.fpo || 0,
    pendingVerification,
    lotsListed: lotCounts.listed || 0,
    lotsSold: lotCounts.sold || 0,
    lotsPooled: lotCounts.pooled || 0,
    offersAccepted: offerCounts.accepted || 0,
    offersPending: offerCounts.pending || 0,
    paymentsPending: paymentCounts.pending || 0,
    paymentsPaid: paymentCounts.paid || 0,
    paymentsReceived: paymentCounts.received || 0,
    totalTransactedValue,
  }
}
