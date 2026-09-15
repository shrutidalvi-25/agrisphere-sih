-- Real data pulled from data.gov.in (Agmarknet mirror), resource
-- 9ef84268-d588-465a-a308-a864a43d0070, on 13/09/2026.
-- distance_km is an estimated road distance from a reference farmer
-- location near Nashik, Maharashtra — approximate, replace with real
-- OSRM-computed distances later for production accuracy.
--
-- Unlike the first seed (Onion/Tomato/Potato), Maharashtra markets had not
-- reported today's arrivals yet for most of these crops at pull time, so
-- most rows here are real data from other states (honestly labelled by
-- `state`) rather than hyper-local Maharashtra prices. Chilli is the
-- exception — genuine Maharashtra data (Pune, Satara) was available.
-- Sugarcane has no row here at all: it returned zero records on Agmarknet
-- today (it's mostly procured directly by mills under FRP contracts, not
-- spot-traded at APMCs) — the app falls back to bundled sample data for it.

insert into mandi_prices (crop, mandi_name, state, distance_km, date, min_price, max_price, modal_price) values
  -- Soybean
  ('Soybean', 'Kariyapatti (Virudhunagar)', 'Tamil Nadu', 1500, '2026-09-13', 9500, 10000, 9750),
  ('Soybean', 'Anaiyur (Madurai)', 'Tamil Nadu', 1480, '2026-09-13', 10000, 11000, 10500),
  ('Soybean', 'Dindigul', 'Tamil Nadu', 1450, '2026-09-13', 10000, 12000, 11000),
  ('Soybean', 'Theni', 'Tamil Nadu', 1520, '2026-09-13', 9500, 10000, 9750),

  -- Cotton
  ('Cotton', 'Phirangipuram (Guntur)', 'Andhra Pradesh', 780, '2026-09-13', 7500, 8700, 8100),
  ('Cotton', 'Markapur (Prakasam)', 'Andhra Pradesh', 800, '2026-09-13', 8000, 8000, 8000),

  -- Tur (Arhar/Red Gram)
  ('Tur', 'Kanigiri (Prakasam)', 'Andhra Pradesh', 760, '2026-09-13', 8600, 8800, 8700),
  ('Tur', 'Bhatapara (Balodabazar)', 'Chattisgarh', 950, '2026-09-13', 5792, 5792, 5792),
  ('Tur', 'Pappanchani VFPCK Market', 'Keralam', 1480, '2026-09-13', 4000, 4000, 4000),
  ('Tur', 'Siliguri', 'West Bengal', 1950, '2026-09-13', 12000, 13000, 12500),

  -- Gram (Bengal Gram)
  ('Gram', 'Maddipadu (Prakasam)', 'Andhra Pradesh', 800, '2026-09-13', 6000, 6000, 6000),
  ('Gram', 'Bhatapara (Balodabazar)', 'Chattisgarh', 950, '2026-09-13', 5792, 5792, 5792),
  ('Gram', 'Podili (Markapuram)', 'Andhra Pradesh', 780, '2026-09-13', 8100, 8300, 8200),
  ('Gram', 'Siliguri', 'West Bengal', 1950, '2026-09-13', 12000, 13000, 12500),

  -- Wheat
  ('Wheat', 'Satna', 'Madhya Pradesh', 850, '2026-09-13', 2450, 2450, 2450),
  ('Wheat', 'Lashkar (Gwalior)', 'Madhya Pradesh', 950, '2026-09-13', 2310, 2310, 2310),
  ('Wheat', 'Kasimbazar', 'West Bengal', 1950, '2026-09-13', 2700, 2800, 2750),
  ('Wheat', 'Chaakghat (Rewa)', 'Madhya Pradesh', 900, '2026-09-13', 2510, 2510, 2510),

  -- Jowar (only 1 market reported nationally today)
  ('Jowar', 'Koilkunta', 'Andhra Pradesh', 850, '2026-09-13', 3000, 3400, 3200),

  -- Bajra (only 1 market reported nationally today)
  ('Bajra', 'Maddipadu (Prakasam)', 'Andhra Pradesh', 800, '2026-09-13', 2850, 2850, 2850),

  -- Groundnut
  ('Groundnut', 'Melur (Madurai)', 'Tamil Nadu', 1480, '2026-09-13', 7000, 8000, 7500),
  ('Groundnut', 'Gobichettipalayam (Erode)', 'Tamil Nadu', 1400, '2026-09-13', 4500, 5000, 4750),
  ('Groundnut', 'Kahithapattarai (Vellore)', 'Tamil Nadu', 1350, '2026-09-13', 7000, 7000, 7000),
  ('Groundnut', 'Pudukottai', 'Tamil Nadu', 1550, '2026-09-13', 5000, 6000, 5500),

  -- Grapes
  ('Grapes', 'Theni', 'Tamil Nadu', 1520, '2026-09-13', 13000, 13000, 13000),
  ('Grapes', 'Tuticorin', 'Tamil Nadu', 1600, '2026-09-13', 13000, 14000, 13500),
  ('Grapes', 'Mukkom Market (Kozhikode)', 'Keralam', 1450, '2026-09-13', 8000, 9000, 8500),
  ('Grapes', 'Udhagamandalam (Nilgiris)', 'Tamil Nadu', 1400, '2026-09-13', 9000, 10000, 9500),

  -- Banana
  ('Banana', 'Siliguri (Darjeeling)', 'West Bengal', 1950, '2026-09-13', 2100, 2300, 2200),
  ('Banana', 'Gurgaon', 'Haryana', 1250, '2026-09-13', 2000, 4000, 3000),
  ('Banana', 'Bhagwanpur (Haridwar)', 'Uttarakhand', 1350, '2026-09-13', 1000, 1300, 1200),
  ('Banana', 'Dharmapuri', 'Tamil Nadu', 1420, '2026-09-13', 5200, 5500, 5350),

  -- Turmeric
  ('Turmeric', 'Maddipadu (Prakasam)', 'Andhra Pradesh', 800, '2026-09-13', 6000, 6000, 6000),
  ('Turmeric', 'Kondapi (Prakasam)', 'Andhra Pradesh', 780, '2026-09-13', 5400, 5800, 5600),
  ('Turmeric', 'Bhatapara (Balodabazar)', 'Chattisgarh', 950, '2026-09-13', 5792, 5792, 5792),
  ('Turmeric', 'Podili (Markapuram)', 'Andhra Pradesh', 780, '2026-09-13', 8100, 8300, 8200),

  -- Chilli (Green Chilli) — genuine Maharashtra data
  ('Chilli', 'APMC Vai (Satara)', 'Maharashtra', 300, '2026-09-13', 2500, 3200, 3000),
  ('Chilli', 'Pune (Moshi)', 'Maharashtra', 210, '2026-09-13', 3000, 3500, 3250);
