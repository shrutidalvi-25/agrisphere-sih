-- Real data pulled from data.gov.in (Agmarknet mirror), resource
-- 9ef84268-d588-465a-a308-a864a43d0070, on 13/09/2026.
-- distance_km is an estimated road distance from a reference farmer
-- location near Nashik, Maharashtra — approximate, replace with real
-- OSRM-computed distances later for production accuracy.

insert into mandi_prices (crop, mandi_name, state, distance_km, date, min_price, max_price, modal_price) values
  ('Onion', 'Pune (Moshi)', 'Maharashtra', 210, '2026-09-13', 2500, 4200, 3350),
  ('Onion', 'Sendhwa APMC (Badwani)', 'Madhya Pradesh', 280, '2026-09-13', 1100, 1600, 1300),
  ('Onion', 'Karera APMC (Shivpuri)', 'Madhya Pradesh', 600, '2026-09-13', 2300, 3000, 2600),
  ('Onion', 'Kukatpally RBZ (Medchal)', 'Telangana', 600, '2026-09-13', 4000, 4000, 4000),

  ('Tomato', 'Pune (Moshi)', 'Maharashtra', 210, '2026-09-13', 800, 1000, 900),
  ('Tomato', 'Sendhwa APMC (Badwani)', 'Madhya Pradesh', 280, '2026-09-13', 1400, 1800, 1500),
  ('Tomato', 'Gondal APMC (Rajkot)', 'Gujarat', 450, '2026-09-13', 1000, 2500, 1750),
  ('Tomato', 'Mulakalacheruvu APMC (Annamayya)', 'Andhra Pradesh', 750, '2026-09-13', 1000, 1800, 1400),

  ('Potato', 'Pune (Moshi)', 'Maharashtra', 210, '2026-09-13', 1000, 1200, 1100),
  ('Potato', 'APMC Vai (Satara)', 'Maharashtra', 300, '2026-09-13', 1700, 1900, 1850),
  ('Potato', 'Karera APMC (Shivpuri)', 'Madhya Pradesh', 600, '2026-09-13', 500, 1400, 800),
  ('Potato', 'Gondal APMC (Rajkot)', 'Gujarat', 450, '2026-09-13', 700, 1300, 1000);
