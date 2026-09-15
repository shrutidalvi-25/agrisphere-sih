-- Daily scheduled refresh of real Agmarknet prices — the Edge Function
-- itself lives in supabase/functions/refresh-mandi-prices/index.ts.
-- Deploy that function via the Supabase dashboard (Edge Functions -> New
-- function -> paste the code -> set the AGMARKNET_API_KEY secret), then
-- run this file to wire up the daily trigger.

-- Lets the daily refresh upsert (update if today's row for this
-- crop+mandi already exists, insert if not) instead of duplicating rows
-- on every run — and accumulating one distinct real date per day is what
-- eventually unlocks the real Sell/Hold trend in sellHoldService.js.
alter table mandi_prices add constraint mandi_prices_crop_mandi_date_key unique (crop, mandi_name, date);

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The function runs with the service_role key, which bypasses RLS — but
-- table-level grants are checked before RLS and this project only grants
-- what's explicitly listed, so without this the function's upsert fails
-- with "permission denied for table mandi_prices".
grant select, insert, update on mandi_prices to service_role;

-- Runs at 18:00 UTC (11:30pm IST) — late enough in the day that most
-- mandis have reported their arrivals, per what we saw pulling this data
-- manually (very few records existed pulling in the morning).
--
-- Note: written as one line (no newlines inside the $$ body) because the
-- Supabase SQL editor's Monaco instance corrupts multi-line pastes here —
-- typing it as a single unbroken line avoided the issue.
select cron.schedule('refresh-mandi-prices-daily', '0 18 * * *', $$ select net.http_post(url := 'https://zupaayxxrtjeckebdxpm.supabase.co/functions/v1/refresh-mandi-prices', headers := jsonb_build_object('Authorization', 'Bearer sb_publishable_OQSzTUDK0VMq5p7P41WxfQ__ontJ9ps')); $$);
-- Same publishable key already in the app's .env — it's meant to be
-- public (ships to every browser), only used here to pass the platform's
-- function-invocation gateway check. The function itself has "Verify JWT"
-- turned off in its Settings, since a scheduled job isn't a real user JWT.
