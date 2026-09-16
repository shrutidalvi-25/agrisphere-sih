import { supabase } from '../../lib/supabaseClient'

export async function createComplaint({ complainantId, againstId, recordType, recordId, category, description }) {
  const { data, error } = await supabase
    .from('complaints')
    .insert({
      complainant_id: complainantId,
      against_id: againstId,
      record_type: recordType,
      record_id: recordId,
      category,
      description,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyComplaints(userId) {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('complainant_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// `status` undefined/null means "every complaint" — used by the admin's
// "All" tab.
export async function getComplaints(status) {
  let query = supabase.from('complaints').select('*').order('created_at', { ascending: true })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

// `paymentAction` (only meaningful when record_type is 'payment') optionally
// also flips the underlying payment's own status as part of resolving the
// complaint — 'pending' for a redo, 'received' if admin sides with the farmer.
export async function resolveComplaint(complaint, { status, resolutionNote, paymentAction }) {
  const isFinal = status === 'resolved' || status === 'rejected'
  const updates = { status, resolution_note: resolutionNote }
  if (isFinal) updates.resolved_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('complaints')
    .update(updates)
    .eq('id', complaint.id)
    .select()
    .single()
  if (error) throw error

  if (complaint.record_type === 'payment' && paymentAction) {
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status: paymentAction })
      .eq('id', complaint.record_id)
    if (paymentError) throw paymentError
  }

  return data
}

export async function markPaymentDisputed(paymentId) {
  const { error } = await supabase.from('payments').update({ status: 'disputed' }).eq('id', paymentId)
  if (error) throw error
}
