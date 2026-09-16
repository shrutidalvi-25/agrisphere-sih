import { supabase } from '../../lib/supabaseClient'
import { gradeLot } from './gradingService'
import { translateToEnglish } from '../../lib/translate'

// Uploads a photo (if given) to the public `lot-photos` bucket and returns
// its public URL, or null if no photo was provided.
async function uploadPhoto(farmerId, file) {
  if (!file) return null
  const path = `${farmerId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lot-photos').upload(path, file)
  if (error) {
    console.error('Photo upload failed:', error.message)
    return null
  }
  const { data } = supabase.storage.from('lot-photos').getPublicUrl(path)
  return data.publicUrl
}

// `language` is the farmer's current app language (from i18n) — if it's not
// English and there are notes (typed or voice-captured), we translate them
// to English for storage while keeping the farmer's own words in
// notes_original, since that's what the farmer themself can read back and
// verify. Buyers/FPOs browsing lots see the English `notes`.
export async function createLot({ farmerId, crop, quantityQuintal, notes, photoFile, lat, lng, language = 'en' }) {
  const photoUrl = await uploadPhoto(farmerId, photoFile)
  const { grade, reasonKey } = gradeLot({ quantityQuintal, hasPhoto: !!photoUrl, notes })

  const hasTranslatableNotes = notes && notes.trim() && language !== 'en'
  const englishNotes = hasTranslatableNotes ? await translateToEnglish(notes, language) : notes

  const { data, error } = await supabase
    .from('lots')
    .insert({
      farmer_id: farmerId,
      crop,
      quantity_quintal: quantityQuintal,
      notes: englishNotes,
      notes_original: hasTranslatableNotes ? notes : null,
      notes_language: hasTranslatableNotes ? language : null,
      photo_url: photoUrl,
      lat,
      lng,
      grade,
      grade_reason: reasonKey,
      status: 'listed',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMyLots(farmerId) {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getListedLots({ crop } = {}) {
  let query = supabase.from('lots').select('*, profiles(name)').eq('status', 'listed').order('created_at', { ascending: false })
  if (crop) query = query.eq('crop', crop)
  const { data, error } = await query
  if (error) throw error
  return data
}

// Summary numbers for the farmer home screen — every value is a direct
// read of this farmer's own rows, no estimates. Three round trips (lots ->
// offers -> payments) since each depends on the previous one's ids.
export async function getFarmerStats(farmerId) {
  const { data: lots, error: lotsError } = await supabase.from('lots').select('id, status').eq('farmer_id', farmerId)
  if (lotsError) throw lotsError

  const lotsListed = lots.filter((l) => l.status === 'listed').length
  const lotIds = lots.map((l) => l.id)
  if (lotIds.length === 0) return { lotsListed, offersPending: 0, earningsThisMonth: 0 }

  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select('id, status')
    .in('lot_id', lotIds)
  if (offersError) throw offersError
  const offersPending = offers.filter((o) => o.status === 'pending').length

  const offerIds = offers.map((o) => o.id)
  if (offerIds.length === 0) return { lotsListed, offersPending, earningsThisMonth: 0 }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount, status, farmer_confirmed_at')
    .in('offer_id', offerIds)
    .eq('status', 'received')
    .gte('farmer_confirmed_at', startOfMonth.toISOString())
  if (paymentsError) throw paymentsError

  const earningsThisMonth = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  return { lotsListed, offersPending, earningsThisMonth }
}

// Just the farmer ID number for the profile sidebar — never the Aadhaar
// number itself, even to its own owner, since there's no legitimate UI
// reason to redisplay it once entered at signup.
export async function getMyFarmerIdNumber(farmerId) {
  const { data, error } = await supabase
    .from('farmer_kyc')
    .select('farmer_id_number')
    .eq('profile_id', farmerId)
    .maybeSingle()
  if (error) throw error
  return data?.farmer_id_number ?? null
}
