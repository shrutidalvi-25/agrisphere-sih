-- Module 3: Price Intelligence Dashboard
-- Import your Agmarknet/data.gov.in CSV into this table (Supabase → Table Editor → Insert → Import data from CSV).
-- Until this table has rows, the app falls back to bundled sample data automatically.

create table if not exists mandi_prices (
  id bigint generated always as identity primary key,
  crop text not null,
  mandi_name text not null,
  state text not null,
  distance_km numeric,          -- straight-line/road distance from a reference farmer location; fill in once, or compute via OSRM later
  date date not null,
  min_price numeric not null,
  max_price numeric not null,
  modal_price numeric not null
);

alter table mandi_prices enable row level security;

-- See the note in 01_profiles.sql — required alongside RLS if "Automatically
-- expose new tables" was off when the project was created.
grant select on public.mandi_prices to authenticated;

-- Prices are public reference data — anyone logged in can read them.
create policy "mandi prices are readable by any logged-in user"
  on mandi_prices for select
  to authenticated
  using (true);

create index if not exists mandi_prices_crop_date_idx on mandi_prices (crop, date desc);
