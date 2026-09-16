// Crop Advisor Agent — orchestrates several independent tools into one
// reasoned, farmer-facing recommendation, instead of a single black-box
// number.
//
//   Live data + farmer context
//     -> Tool 1: ML next-day price forecast (existing predict-price function)
//     -> Tool 2: live trend signal (same math as sellHoldService.js, re-run
//                server-side against real mandi_prices rows)
//     -> Tool 3: best current market (highest live modal price for the crop)
//   -> Orchestration/reasoning: plain code combines all tool outputs into
//      one coherent, explainable recommendation sentence
//
// No LLM call — the synthesis step is deterministic rule-based logic over
// the same real numbers, not a paid API. Every number traces back to a
// real row in the database or a real model output.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIN_REAL_DAYS = 3

function computeTrendSignal(series: number[]) {
  const windowSize = Math.min(7, Math.floor(series.length / 2))
  if (windowSize < 1) return null
  const lastWindow = series.slice(-windowSize)
  const prevWindow = series.slice(-2 * windowSize, -windowSize)
  const avgLast = lastWindow.reduce((a, b) => a + b, 0) / windowSize
  const avgPrev = prevWindow.reduce((a, b) => a + b, 0) / windowSize
  const changePercent = ((avgLast - avgPrev) / avgPrev) * 100
  return { recommendation: changePercent > 0.5 ? 'hold' : 'sell', changePercent: Math.round(changePercent * 10) / 10 }
}

// Deterministic, rule-based synthesis — this replaces the LLM reasoning
// step with plain code over the same real tool outputs, so the agent
// works with zero external API cost.
function buildRecommendation(
  lot: { crop: string; grade: string | null },
  trend: { recommendation: string; changePercent: number } | null,
  forecast: Record<string, unknown>,
  bestMandi: { mandiName: string; price: number } | null,
  realDays: number
) {
  const sentences: string[] = []

  if (lot.grade) {
    sentences.push(`This ${lot.crop} lot is graded ${lot.grade} based on quantity and listing details.`)
  }

  if (trend) {
    const direction = trend.changePercent > 0 ? 'risen' : 'fallen'
    sentences.push(
      `Real mandi prices for ${lot.crop} have ${direction} ${Math.abs(trend.changePercent)}% recently, so the data suggests you should ${trend.recommendation === 'hold' ? 'hold and wait for a better price' : 'sell now while conditions are favourable'}.`
    )
  } else {
    sentences.push(
      `Only ${realDays} real day(s) of price history have been tracked so far for ${lot.crop} (need ${MIN_REAL_DAYS}) — not enough yet for a confident trend-based recommendation.`
    )
  }

  if ((forecast as any).enoughData) {
    const fChange = (forecast as any).changePercent
    sentences.push(
      `The price model predicts tomorrow's price at ₹${(forecast as any).predictedPrice}/quintal, a ${fChange > 0 ? 'rise' : 'drop'} of ${Math.abs(fChange)}% from today.`
    )
  } else if ((forecast as any).supported === false) {
    sentences.push(`No trained price-prediction model is available for ${lot.crop} yet.`)
  }

  if (bestMandi) {
    sentences.push(`The best price currently found is at ${bestMandi.mandiName} mandi, at ₹${bestMandi.price}/quintal.`)
  }

  return sentences.join(' ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const { lotId } = await req.json().catch(() => ({}))
  if (!lotId) {
    return new Response(JSON.stringify({ error: 'lotId is required' }), { status: 400, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: lot, error: lotError } = await supabase.from('lots').select('*').eq('id', lotId).single()
  if (lotError || !lot) {
    return new Response(JSON.stringify({ error: 'Lot not found', debug: lotError }), { status: 404, headers: CORS_HEADERS })
  }

  const { data: priceRows } = await supabase
    .from('mandi_prices')
    .select('date, mandi_name, modal_price')
    .ilike('crop', lot.crop)
    .order('date', { ascending: true })

  const byDate: Record<string, number[]> = {}
  for (const r of priceRows ?? []) {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(Number(r.modal_price))
  }
  const dates = Object.keys(byDate).sort()
  const series = dates.map((d) => byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length)
  const trend = dates.length >= MIN_REAL_DAYS ? computeTrendSignal(series) : null

  let bestMandi: { mandiName: string; price: number } | null = null
  if (dates.length > 0) {
    const latestDate = dates[dates.length - 1]
    const { data: latestRows } = await supabase
      .from('mandi_prices')
      .select('mandi_name, modal_price')
      .ilike('crop', lot.crop)
      .eq('date', latestDate)
      .order('modal_price', { ascending: false })
      .limit(1)
    if (latestRows && latestRows.length > 0) {
      bestMandi = { mandiName: latestRows[0].mandi_name, price: Number(latestRows[0].modal_price) }
    }
  }

  let forecast: Record<string, unknown> = { supported: false }
  try {
    const forecastRes = await fetch(`${supabaseUrl}/functions/v1/predict-price?crop=${encodeURIComponent(lot.crop.toLowerCase())}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
    })
    forecast = await forecastRes.json()
  } catch (err) {
    forecast = { supported: false, error: (err as Error).message }
  }

  const recommendation = buildRecommendation(lot, trend, forecast, bestMandi, dates.length)

  return new Response(
    JSON.stringify({
      lotId,
      crop: lot.crop,
      grade: lot.grade,
      trend,
      forecast,
      bestMandi,
      recommendation,
    }),
    { status: 200, headers: CORS_HEADERS }
  )
})
