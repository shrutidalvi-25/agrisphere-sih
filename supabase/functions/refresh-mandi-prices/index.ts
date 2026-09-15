// Scheduled daily job (see supabase/09_scheduled_price_refresh.sql for the
// cron trigger). Pulls today's real prices from data.gov.in's Agmarknet
// mirror for every crop except Sugarcane (which genuinely has no daily
// mandi-price record — see 07_lots_offers_pooling_payments.sql), curates a
// handful of mandis per crop (Maharashtra preferred, else any state), and
// upserts them into `mandi_prices`. Re-running the same day just updates
// that day's rows (see the unique constraint in
// 09_scheduled_price_refresh.sql) — accumulating one distinct date per day
// is what eventually unlocks the real Sell/Hold trend (see
// sellHoldService.js, which needs 10+ real distinct dates).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const AGMARKNET_RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'

// display crop name -> exact Agmarknet commodity string
const CROP_COMMODITY: Record<string, string> = {
  Onion: 'Onion',
  Tomato: 'Tomato',
  Potato: 'Potato',
  Soybean: 'Soyabean',
  Cotton: 'Cotton',
  Tur: 'Arhar (Tur/Red Gram)(Whole)',
  Gram: 'Bengal Gram(Gram)(Whole)',
  Wheat: 'Wheat',
  Jowar: 'Jowar(Sorghum)',
  Bajra: 'Bajra(Pearl Millet/Cumbu)',
  Groundnut: 'Groundnut',
  Grapes: 'Grapes',
  Banana: 'Banana',
  Turmeric: 'Turmeric (Whole)',
  Chilli: 'Green Chilli',
}

// Approximate road distance (km) from a reference farmer location near
// Nashik, Maharashtra, by state — same honesty note as the original manual
// seed: not real OSRM routing, just a reasonable state-level estimate.
const STATE_DISTANCE_KM: Record<string, number> = {
  Maharashtra: 200,
  'Madhya Pradesh': 850,
  Gujarat: 450,
  Telangana: 650,
  'Andhra Pradesh': 780,
  Chattisgarh: 950,
  'Tamil Nadu': 1450,
  Keralam: 1450,
  Kerala: 1450,
  'West Bengal': 1950,
  Haryana: 1250,
  Uttarakhand: 1350,
  Karnataka: 600,
  Rajasthan: 700,
  Punjab: 1400,
  Delhi: 1200,
}
const DEFAULT_DISTANCE_KM = 1000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// data.gov.in's free-tier key enforces a request-rate limit — firing all 15
// crop lookups back-to-back tripped it (HTTP 429 "Rate limit exceeded") and
// silently produced zero inserted rows for every crop, which is why the
// scheduled run on 2026-09-14 (and a manual re-run on 2026-09-15) both came
// back empty even though the underlying data was there. A 3s gap between
// requests plus one retry-after-backoff on a 429 keeps the whole 15-crop
// batch under that limit.
async function fetchCommodityRecords(commodity: string, apiKey: string) {
  const url = new URL(`https://api.data.gov.in/resource/${AGMARKNET_RESOURCE}`)
  url.searchParams.set('api-key', apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('filters[commodity]', commodity)
  url.searchParams.set('limit', '10')

  let res = await fetch(url.toString())
  if (res.status === 429) {
    await sleep(5000)
    res = await fetch(url.toString())
  }
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json.records) ? json.records : []
}

function curate(records: any[]) {
  const maharashtra = records.filter((r) => r.state === 'Maharashtra')
  const pool = maharashtra.length > 0 ? maharashtra : records
  const seen = new Set<string>()
  const picked = []
  for (const r of pool) {
    if (seen.has(r.market)) continue
    seen.add(r.market)
    picked.push(r)
    if (picked.length === 4) break
  }
  return picked
}

Deno.serve(async () => {
  const apiKey = Deno.env.get('AGMARKNET_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AGMARKNET_API_KEY not set' }), { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date().toISOString().slice(0, 10)
  const rows: any[] = []
  const summary: Record<string, number> = {}

  let first = true
  for (const [crop, commodity] of Object.entries(CROP_COMMODITY)) {
    if (!first) await sleep(3000)
    first = false

    const records = await fetchCommodityRecords(commodity, apiKey)
    const picked = curate(records)
    summary[crop] = picked.length

    for (const r of picked) {
      rows.push({
        crop,
        mandi_name: r.district ? `${r.market} (${r.district})` : r.market,
        state: r.state,
        distance_km: STATE_DISTANCE_KM[r.state] ?? DEFAULT_DISTANCE_KM,
        date: today,
        min_price: Number(r.min_price),
        max_price: Number(r.max_price),
        modal_price: Number(r.modal_price),
      })
    }
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ inserted: 0, summary }), { status: 200 })
  }

  const { error } = await supabase
    .from('mandi_prices')
    .upsert(rows, { onConflict: 'crop,mandi_name,date' })

  if (error) {
    return new Response(JSON.stringify({ error: error.message, summary }), { status: 500 })
  }

  return new Response(JSON.stringify({ inserted: rows.length, summary }), { status: 200 })
})
