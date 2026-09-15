// Fallback/demo data — used until the real Agmarknet CSV is imported into
// Supabase (see supabase/03_mandi_prices.sql). Prices are illustrative only.
// Distance is from a reference farmer location near Nashik.

export const CROPS = [
  'Onion', 'Tomato', 'Potato',
  'Soybean', 'Cotton', 'Tur', 'Gram', 'Wheat', 'Jowar', 'Bajra',
  'Groundnut', 'Grapes', 'Banana', 'Turmeric', 'Chilli',
]

export const TRANSPORT_COST_PER_KM = 2 // ₹ per quintal per km — rough estimate, tune later

export const SAMPLE_PRICES = [
  // Onion
  { crop: 'Onion', mandi: 'Lasalgaon', state: 'Maharashtra', distanceKm: 25, min: 1000, max: 1400, modal: 1200 },
  { crop: 'Onion', mandi: 'Pimpalgaon', state: 'Maharashtra', distanceKm: 35, min: 1050, max: 1450, modal: 1250 },
  { crop: 'Onion', mandi: 'Nashik', state: 'Maharashtra', distanceKm: 10, min: 950, max: 1250, modal: 1100 },
  { crop: 'Onion', mandi: 'Pune', state: 'Maharashtra', distanceKm: 180, min: 1300, max: 1600, modal: 1450 },
  { crop: 'Onion', mandi: 'Solapur', state: 'Maharashtra', distanceKm: 300, min: 1350, max: 1650, modal: 1500 },

  // Tomato
  { crop: 'Tomato', mandi: 'Nashik', state: 'Maharashtra', distanceKm: 10, min: 600, max: 900, modal: 750 },
  { crop: 'Tomato', mandi: 'Pune', state: 'Maharashtra', distanceKm: 180, min: 800, max: 1100, modal: 950 },
  { crop: 'Tomato', mandi: 'Narayangaon', state: 'Maharashtra', distanceKm: 150, min: 700, max: 1000, modal: 850 },
  { crop: 'Tomato', mandi: 'Solapur', state: 'Maharashtra', distanceKm: 300, min: 750, max: 1050, modal: 900 },

  // Potato
  { crop: 'Potato', mandi: 'Nashik', state: 'Maharashtra', distanceKm: 10, min: 900, max: 1200, modal: 1050 },
  { crop: 'Potato', mandi: 'Pune', state: 'Maharashtra', distanceKm: 180, min: 1000, max: 1300, modal: 1150 },
  { crop: 'Potato', mandi: 'Ahmednagar', state: 'Maharashtra', distanceKm: 120, min: 950, max: 1250, modal: 1100 },
]
