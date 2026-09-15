import { supabase } from '../../lib/supabaseClient'

// Lots that are listed (not yet sold/pooled) for a crop — what an FPO
// manager picks from when building a pool. Pooling isn't restricted to one
// farmer: the whole point is combining several farmers' small lots into one
// bigger, better-negotiated batch.
export async function getPoolableLots(crop) {
  const { data, error } = await supabase
    .from('lots')
    .select('*, profiles(name)')
    .eq('crop', crop)
    .eq('status', 'listed')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMyPools(fpoId) {
  const { data: pools, error } = await supabase
    .from('pooled_lots')
    .select('*, pooled_lot_members(*, lots(*))')
    .eq('fpo_id', fpoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return pools
}

export async function createPool({ fpoId, crop, lotIds }) {
  const { data: pool, error: poolError } = await supabase
    .from('pooled_lots')
    .insert({ fpo_id: fpoId, crop })
    .select()
    .single()
  if (poolError) throw poolError

  const members = lotIds.map((lotId) => ({ pooled_lot_id: pool.id, lot_id: lotId }))
  const { error: membersError } = await supabase.from('pooled_lot_members').insert(members)
  if (membersError) throw membersError

  const { error: statusError } = await supabase.from('lots').update({ status: 'pooled' }).in('id', lotIds)
  if (statusError) throw statusError

  return pool
}

export async function closePool(poolId) {
  const { data, error } = await supabase.from('pooled_lots').update({ status: 'closed' }).eq('id', poolId).select().single()
  if (error) throw error
  return data
}
