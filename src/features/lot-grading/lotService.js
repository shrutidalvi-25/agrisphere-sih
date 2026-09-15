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
