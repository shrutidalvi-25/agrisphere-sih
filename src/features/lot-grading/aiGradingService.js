// Calls the standalone Python AI grading microservice (app/main.py) — a
// separate FastAPI service, not a Supabase Edge Function. Not deployed
// anywhere yet, so this defaults to localhost for local dev/demo; set
// VITE_GRADING_API_URL once it's hosted somewhere reachable by farmers.
const GRADING_API_URL = import.meta.env.VITE_GRADING_API_URL || 'http://localhost:8000'

async function postToGradingService(form) {
  let res
  try {
    res = await fetch(`${GRADING_API_URL}/api/v1/grade/upload`, { method: 'POST', body: form })
  } catch {
    throw new Error('AI grading service is unreachable — make sure it is running.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'AI grading failed.')
  }
  return res.json()
}

export async function gradeCropPhoto({ photoFile, cropName, quantityQuintal, distanceKm, state, district }) {
  const form = new FormData()
  form.append('file', photoFile)
  if (cropName) form.append('crop_name', cropName)
  form.append('state', state || 'Maharashtra')
  if (district) form.append('district', district)
  form.append('quantity_kg', String((quantityQuintal || 1) * 100))
  form.append('distance_to_mandi_km', String(distanceKm || 15))
  return postToGradingService(form)
}

export async function gradeCropFromUrl({ photoUrl, ...rest }) {
  const blob = await fetch(photoUrl).then((r) => r.blob())
  const file = new File([blob], 'lot-photo.jpg', { type: blob.type || 'image/jpeg' })
  return gradeCropPhoto({ photoFile: file, ...rest })
}
