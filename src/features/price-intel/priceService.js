import { supabase } from '../../lib/supabaseClient'
import { SAMPLE_PRICES, TRANSPORT_COST_PER_KM } from './sampleData'

// A Maharashtra farmer mostly cares about Maharashtra mandis — out-of-state
// ones are useful context (see the interstate-comparison note on
// PriceDashboard) but shouldn't crowd out local options as more real daily
// pulls accumulate more distinct mandis over time.
const MAX_MAHARASHTRA_MANDIS = 6
const MAX_OUT_OF_STATE_MANDIS = 2

// Returns prices for a crop, ranked by net realisation (what the farmer
// actually nets after an estimated transport cost) — highest first.
// Tries the real `mandi_prices` table first; falls back to bundled sample
// data if the table is empty or Supabase isn't configured yet. This lets
// the screen be built and demoed before the real Agmarknet import happens.
export async function getRankedPrices(crop) {
  let rows = []

  try {
    // Pulls a wider window (50) than we'll actually show, because the
    // daily refresh keeps adding rows for the same real-world mandi under
    // a new date each night — without deduping below, the same mandi would
    // show up once per day it's ever been pulled, and the list would only
    // ever grow.
    const { data, error } = await supabase
      .from('mandi_prices')
      .select('*')
      .eq('crop', crop)
      .order('date', { ascending: false })
      .limit(50)

    if (!error && data && data.length > 0) {
      const latestByMandi = new Map()
      for (const r of data) {
        const key = `${r.mandi_name}|${r.state}`
        if (!latestByMandi.has(key)) latestByMandi.set(key, r) // first hit per mandi is the most recent, since data is ordered by date desc
      }
      rows = [...latestByMandi.values()].map((r) => ({
        crop: r.crop,
        mandi: r.mandi_name,
        state: r.state,
        distanceKm: r.distance_km ?? 50,
        min: r.min_price,
        max: r.max_price,
        modal: r.modal_price,
      }))
    }
  } catch {
    // Supabase not reachable yet (no real project configured) — fall through to sample data.
  }

  if (rows.length === 0) {
    rows = SAMPLE_PRICES.filter((r) => r.crop === crop)
  }

  const withNet = rows
    .map((r) => ({
      ...r,
      netRealisation: Math.round(r.modal - r.distanceKm * TRANSPORT_COST_PER_KM),
      // Whether selling here means moving produce across Maharashtra's
      // border. No permit or duty applies to this within India — the real
      // differences are each state's own mandi fee/cess and, rarely, a
      // government-ordered movement restriction on an essential commodity
      // (Essential Commodities Act, 1955) during a price crisis.
      isInterstate: Boolean(r.state) && r.state !== 'Maharashtra',
    }))
    .sort((a, b) => b.netRealisation - a.netRealisation)

  const maharashtra = withNet.filter((r) => !r.isInterstate).slice(0, MAX_MAHARASHTRA_MANDIS)
  const outOfState = withNet.filter((r) => r.isInterstate).slice(0, MAX_OUT_OF_STATE_MANDIS)

  return [...maharashtra, ...outOfState].sort((a, b) => b.netRealisation - a.netRealisation)
}

// Real day-by-day price history for the dashboard chart — one point per
// real date, averaged across whichever mandis reported that day. No
// fabricated fallback: a crop/window with no real rows just returns an
// empty array and the chart shows an honest "not enough data yet" state,
// same principle as sellHoldService.js's MIN_REAL_DAYS gate.
export async function getPriceHistory(crop, days = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  try {
    const { data, error } = await supabase
      .from('mandi_prices')
      .select('date, modal_price')
      .eq('crop', crop)
      .gte('date', cutoffStr)
      .order('date', { ascending: true })

    if (!error && data && data.length > 0) {
      const byDate = {}
      for (const r of data) {
        if (!byDate[r.date]) byDate[r.date] = []
        byDate[r.date].push(Number(r.modal_price))
      }
      return Object.keys(byDate)
        .sort()
        .map((d) => ({
          date: d,
          price: Math.round(byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length),
        }))
    }
  } catch {
    // fall through to empty — no fabricated chart data
  }
  return []
}
