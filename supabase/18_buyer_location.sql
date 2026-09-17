-- Buyer location, captured via the browser's free Geolocation API (same
-- pattern as the farmer's lot photo geotagging in CreateLot.jsx). Used to
-- compute a real farmer-to-buyer distance and estimated transport cost
-- when browsing lots (see src/lib/distance.js and BrowseLots.jsx).
alter table profiles add column if not exists lat numeric;
alter table profiles add column if not exists lng numeric;

-- No new RLS policy needed: "users can update their own profile" in
-- 01_profiles.sql already covers writing these two new columns.
