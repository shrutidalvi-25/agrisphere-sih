// Calls the crop-advisor-agent Edge Function — combines the ML price
// forecast, the live trend signal, and the best current market price for
// a lot's crop into one plain-language recommendation. See
// supabase/functions/crop-advisor-agent/index.ts for the full logic.
export async function getCropAdvice(lotId) {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crop-advisor-agent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lotId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not get a recommendation right now.')
  return data
}
