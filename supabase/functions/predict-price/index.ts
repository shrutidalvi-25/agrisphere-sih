// Serves next-day price predictions from the Random Forest models trained
// in ml/train.py on real historical Agmarknet data (2023-2025, via a
// public archive — see ml/train.py's header comment for why: data.gov.in's
// live API has no historical query). Trees are stored as plain JSON in the
// `ml-models` Storage bucket (see ml/export_trees.py) and walked natively
// here rather than pulling in an ONNX runtime — Deno Edge Functions have no
// proven WASM ML runtime, and a Random Forest is just nested threshold
// comparisons, so a small native function replays the exact same math with
// zero runtime dependency risk.
//
// Only 4 of the app's 15 crops have real historical training data in the
// archive this was trained on: onion, potato, tomato, wheat. Any other
// crop gets a clear "not supported" response — the caller (PriceDashboard)
// falls back to the existing simple trend projection for those, same as
// it did before this function existed.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPPORTED_CROPS = ['onion', 'potato', 'tomato', 'wheat']

// Without these, the browser blocks the call with a CORS preflight
// failure — curl/cron calls work fine since they're not subject to
// browser CORS, but PriceDashboard.jsx calling this from the app itself
// needs it. Wildcard origin is fine here: this endpoint only reads
// (never writes) real government price data, nothing user-specific.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Same feature order as ml/train.py's FEATURE_COLUMNS — must match
// exactly, since the trees were trained on this exact column order.
const FEATURE_COLUMNS = ['lag_1', 'lag_3', 'lag_7', 'rolling_mean_7', 'rolling_mean_14', 'day_of_week', 'month', 'is_maharashtra']

// Lowered from 14 for the SIH hackathon demo (2026-09-16) — the daily
// Agmarknet pull only started 2026-09-13, so by demo day there are
// realistically ~3 real accumulated days, not 14. Below, lag_7/
// rolling_mean_14 gracefully degrade to shorter real windows via
// `series.slice()`/`?? last` when fewer real points exist — they don't
// error, they just average over what's actually there. Raise this back
// once 14+ real days have genuinely accumulated, so the features mean what
// their names say again.
const MIN_REAL_DAYS = 3

function predictTree(tree: { feature: number[]; threshold: number[]; left: number[]; right: number[]; value: number[] }, features: number[]): number {
  let node = 0
  while (tree.left[node] !== -1) {
    node = features[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node]
  }
  return tree.value[node]
}

function predictForest(forest: { trees: any[] }, features: number[]): number {
  const preds = forest.trees.map((tree) => predictTree(tree, features))
  return preds.reduce((a, b) => a + b, 0) / preds.length
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const crop = (url.searchParams.get('crop') || '').toLowerCase()

  if (!SUPPORTED_CROPS.includes(crop)) {
    return new Response(
      JSON.stringify({ supported: false, reason: `No trained model for "${crop}" — only onion, potato, tomato, wheat have real historical training data.` }),
      { status: 200, headers: CORS_HEADERS }
    )
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: rows, error } = await supabase
    .from('mandi_prices')
    .select('date, state, modal_price')
    .ilike('crop', crop)
    .order('date', { ascending: true })

  if (error) {
    return new Response(JSON.stringify({ supported: true, error: error.message }), { status: 500, headers: CORS_HEADERS })
  }

  const byDate: Record<string, number[]> = {}
  let sawMaharashtra = false
  for (const r of rows) {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(Number(r.modal_price))
    if (r.state === 'Maharashtra') sawMaharashtra = true
  }
  const dates = Object.keys(byDate).sort()

  if (dates.length < MIN_REAL_DAYS) {
    return new Response(
      JSON.stringify({
        supported: true,
        enoughData: false,
        realDays: dates.length,
        daysNeeded: MIN_REAL_DAYS,
        reason: `Only ${dates.length} real days of price history so far — needs ${MIN_REAL_DAYS} to make a trustworthy prediction.`,
      }),
      { status: 200, headers: CORS_HEADERS }
    )
  }

  const series = dates.map((d) => byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length)
  const latestDate = new Date(dates[dates.length - 1])
  const nextDate = new Date(latestDate)
  nextDate.setDate(nextDate.getDate() + 1)

  const last = series[series.length - 1]
  const last7 = series.slice(-7)
  const last14 = series.slice(-14)

  const features = [
    last, // lag_1
    series[series.length - 3] ?? last, // lag_3
    series[series.length - 7] ?? last, // lag_7
    last7.reduce((a, b) => a + b, 0) / last7.length, // rolling_mean_7
    last14.reduce((a, b) => a + b, 0) / last14.length, // rolling_mean_14
    nextDate.getDay(), // day_of_week
    nextDate.getMonth() + 1, // month
    sawMaharashtra ? 1 : 0, // is_maharashtra
  ]

  const { data: forestBytes, error: forestError } = await supabase.storage.from('ml-models').download(`${crop}.json`)
  if (forestError) {
    return new Response(JSON.stringify({ supported: true, error: `Could not load model: ${forestError.message}` }), { status: 500, headers: CORS_HEADERS })
  }
  const forest = JSON.parse(await forestBytes.text())

  const predictedPrice = predictForest(forest, features)
  const changePercent = ((predictedPrice - last) / last) * 100

  return new Response(
    JSON.stringify({
      supported: true,
      enoughData: true,
      crop,
      realDays: dates.length,
      latestKnownPrice: Math.round(last),
      predictedPrice: Math.round(predictedPrice),
      changePercent: Math.round(changePercent * 10) / 10,
      predictedForDate: nextDate.toISOString().slice(0, 10),
    }),
    { status: 200, headers: CORS_HEADERS }
  )
})
