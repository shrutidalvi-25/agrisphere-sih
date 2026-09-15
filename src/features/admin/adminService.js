import { supabase } from '../../lib/supabaseClient'

export async function getPendingProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'active')
    .neq('role', 'admin')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function setProfileStatus(userId, status) {
  const { data, error } = await supabase.from('profiles').update({ status }).eq('id', userId).select().single()
  if (error) throw error
  return data
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
