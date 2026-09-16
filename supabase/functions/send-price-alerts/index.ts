// Sends a "sell now" / "hold" SMS alert to every farmer with a listed lot
// for a crop whose real price trend supports a recommendation. Runs as the
// last step of the nightly pipeline, after tonight's real prices have
// landed and the model has retrained — same "fetch -> validate -> store ->
// retrain -> alert" DAG described to the team.
//
// Uses Fast2SMS's "Quick SMS" route (route=q) — no DLT template
// registration required, which matters for a hackathon demo where there's
// no time to complete India's telecom DLT registration process. This route
// is meant for exactly this kind of testing/small-scale use, not real
// commercial bulk marketing campaigns.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CROPS = [
  'Onion', 'Tomato', 'Potato',
  'Soybean', 'Cotton', 'Tur', 'Gram', 'Wheat', 'Jowar', 'Bajra',
  'Groundnut', 'Grapes', 'Banana', 'Turmeric', 'Chilli',
]

// Same threshold and trend logic as sellHoldService.js on the client —
// kept in sync deliberately so the SMS never contradicts what the farmer
// sees in the app when they open it.
const MIN_REAL_DAYS = 3

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function computeSignal(series: number[]) {
  const windowSize = Math.min(7, Math.floor(series.length / 2))
  if (windowSize < 1) return null

  const lastWindow = series.slice(-windowSize)
  const prevWindow = series.slice(-2 * windowSize, -windowSize)
  const avgLast = lastWindow.reduce((a, b) => a + b, 0) / windowSize
  const avgPrev = prevWindow.reduce((a, b) => a + b, 0) / windowSize
  const changePercent = ((avgLast - avgPrev) / avgPrev) * 100

  return {
    recommendation: changePercent > 0.5 ? 'hold' : 'sell',
    changePercent,
  }
}

async function sendSms(apiKey: string, phone: string, message: string) {
  const url = new URL('https://www.fast2sms.com/dev/bulkV2')
  url.searchParams.set('authorization', apiKey)
  url.searchParams.set('route', 'q') // Quick SMS — no DLT template needed
  url.searchParams.set('message', message)
  url.searchParams.set('language', 'english')
  url.searchParams.set('flash', '0')
  url.searchParams.set('numbers', phone)

  const res = await fetch(url.toString())
  const json = await res.json()
  return { ok: res.ok && json.return === true, response: json }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const fast2smsKey = Deno.env.get('FAST2SMS_API_KEY')
  if (!fast2smsKey) {
    return new Response(JSON.stringify({ error: 'FAST2SMS_API_KEY not set' }), { status: 500, headers: CORS_HEADERS })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Optional: if a request body includes { testPhone: "91XXXXXXXXXX" },
  // every alert goes only to that number instead of real farmers — use
  // this to verify the whole pipeline before ever texting a real farmer.
  let testPhone: string | null = null
  try {
    const body = await req.json()
    testPhone = body?.testPhone ?? null
  } catch {
    // no body / not JSON — fine, testPhone stays null
  }

  const summary: Record<string, unknown> = {}
  let totalSent = 0

  for (const crop of CROPS) {
    const { data: rows, error } = await supabase
      .from('mandi_prices')
      .select('date, modal_price')
      .eq('crop', crop)
      .order('date', { ascending: true })

    if (error || !rows || rows.length === 0) {
      summary[crop] = 'no price data'
      continue
    }

    const byDate: Record<string, number[]> = {}
    for (const r of rows) {
      if (!byDate[r.date]) byDate[r.date] = []
      byDate[r.date].push(Number(r.modal_price))
    }
    const dates = Object.keys(byDate).sort()
    if (dates.length < MIN_REAL_DAYS) {
      summary[crop] = `only ${dates.length} real day(s), need ${MIN_REAL_DAYS}`
      continue
    }

    const series = dates.map((d) => byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length)
    const signal = computeSignal(series)
    if (!signal) {
      summary[crop] = 'not enough data for a trend window'
      continue
    }

    // Farmers with at least one currently-listed lot for this crop.
    const { data: lots, error: lotsError } = await supabase
      .from('lots')
      .select('farmer_id, profiles!inner(phone)')
      .eq('crop', crop)
      .eq('status', 'listed')

    if (lotsError || !lots || lots.length === 0) {
      summary[crop] = `signal computed (${signal.recommendation}) but no listed farmers`
      continue
    }

    const uniquePhones = [...new Set(lots.map((l: any) => l.profiles?.phone).filter(Boolean))]
    const pct = Math.abs(signal.changePercent).toFixed(1)
    const message =
      signal.recommendation === 'hold'
        ? `AgriSphere alert: ${crop} prices up ${pct}% this week. Consider holding before you sell.`
        : `AgriSphere alert: ${crop} prices down ${pct}% this week. Consider selling now.`

    let sentForCrop = 0
    for (const phone of uniquePhones) {
      const target = testPhone || phone
      const { ok } = await sendSms(fast2smsKey, target, message)
      if (ok) sentForCrop++
      if (testPhone) break // test mode: one message is enough to prove it works
    }
    totalSent += sentForCrop
    summary[crop] = `${signal.recommendation}, sent to ${sentForCrop} farmer(s)`
  }

  return new Response(JSON.stringify({ totalSent, summary }), { status: 200, headers: CORS_HEADERS })
})
