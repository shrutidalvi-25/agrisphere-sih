import { supabase } from '../../lib/supabaseClient'
import { SAMPLE_TREND } from './sampleTrend'

// Lowered from 10 for the SIH hackathon demo (2026-09-16) — the daily
// Agmarknet pull only started 2026-09-13, so by demo day there are
// realistically only ~3 real accumulated days, not 10+. The comparison
// window below is sized dynamically to whatever real depth exists rather
// than assuming a fixed 7-day window, so a thin real series still
// produces a genuine (if short-window) real-data comparison instead of
// silently falling back to sample data. Raise this back once enough real
// history has accumulated that a 7+ day window is reliably available.
const MIN_REAL_DAYS = 3

// Only these 4 of the app's 15 crops have a real trained model — see
// ml/train.py's header comment for why (the Kaggle historical archive
// used to bootstrap real training depth only covers 5 commodities, one of
// which — Rice — isn't a crop this app tracks at all).
const MODEL_SUPPORTED_CROPS = ['Onion', 'Potato', 'Tomato', 'Wheat']

// Calls the predict-price Edge Function (native TS walk of a Random
// Forest trained on 2 years of real historical Agmarknet prices — see
// ml/train.py). Returns null for any crop without a trained model, or
// when our own live daily pull hasn't yet accumulated the 14 real days
// the model needs — the caller falls back to the plain trend projection
// in both cases, so there's always something to show, just not always
// from the trained model.
async function getModelPrediction(crop) {
  if (!MODEL_SUPPORTED_CROPS.includes(crop)) return null
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-price?crop=${encodeURIComponent(crop)}`,
      { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.supported && data.enoughData ? data : null
  } catch {
    return null
  }
}

// Compares the average of the last 7 days to the average of the 7 days
// before that. Rising -> Hold. Falling or flat -> Sell now.
// This is intentionally simple (no ML) — same "explainable, not a black
// box" principle as the reliability score.
export async function getSellHoldSignal(crop) {
  let series = []
  let usedRealData = false

  try {
    const { data, error } = await supabase
      .from('mandi_prices')
      .select('date, modal_price')
      .eq('crop', crop)
      .order('date', { ascending: true })

    if (!error && data && data.length > 0) {
      const byDate = {}
      for (const row of data) {
        if (!byDate[row.date]) byDate[row.date] = []
        byDate[row.date].push(row.modal_price)
      }
      const dates = Object.keys(byDate).sort()
      if (dates.length >= MIN_REAL_DAYS) {
        series = dates.map((d) => byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length)
        usedRealData = true
      }
    }
  } catch {
    // fall through to sample trend
  }

  if (!usedRealData) {
    series = SAMPLE_TREND[crop] || []
  }

  // Window size adapts to how much data is actually available (capped at
  // 7, the original fixed week-over-week window) instead of requiring a
  // hardcoded 14 points — with only 3-4 real days, a "week vs week"
  // comparison is structurally impossible, but a 1-2 day vs 1-2 day
  // comparison is still a legitimate real trend read on real data.
  const windowSize = Math.min(7, Math.floor(series.length / 2))
  if (windowSize < 1) {
    return { recommendation: null, changePercent: 0, usedRealData }
  }

  const lastWindow = series.slice(-windowSize)
  const prevWindow = series.slice(-2 * windowSize, -windowSize)
  const avgLast7 = lastWindow.reduce((a, b) => a + b, 0) / windowSize
  const avgPrev7 = prevWindow.reduce((a, b) => a + b, 0) / windowSize
  const changePercent = ((avgLast7 - avgPrev7) / avgPrev7) * 100

  const recommendation = changePercent > 0.5 ? 'hold' : 'sell'

  const modelPrediction = await getModelPrediction(crop)
  const projection = modelPrediction
    ? {
        fromModel: true,
        days: [{ daysAhead: 1, projectedChangePercent: modelPrediction.changePercent }],
      }
    : projectForward(series)

  // The reason text itself is built in PriceDashboard.jsx via i18n
  // translation keys (priceDashboard.reasonHold/reasonSell) rather than
  // here, so it can render in whatever language the farmer has selected.
  return { recommendation, changePercent, usedRealData, projection }
}

// "Early alert": a plain trend-line projection, not a trained forecasting
// model — we don't have the data depth to honestly claim one yet (this
// same file's MIN_REAL_DAYS gate is the reason). Averages the day-over-day
// % change across the last week and extrapolates it forward 2-3 days, so a
// farmer gets a heads-up before prices move, while the UI is explicit that
// this is a simple projection, not a validated prediction.
function projectForward(series) {
  const window = series.slice(-7)
  if (window.length < 2) return null

  const dailyRates = []
  for (let i = 1; i < window.length; i++) {
    dailyRates.push((window[i] - window[i - 1]) / window[i - 1])
  }
  const avgDailyRate = dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length
  const latest = series[series.length - 1]

  return {
    dailyChangePercent: avgDailyRate * 100,
    days: [2, 3].map((daysAhead) => ({
      daysAhead,
      projectedChangePercent: (Math.pow(1 + avgDailyRate, daysAhead) - 1) * 100,
    })),
  }
}
