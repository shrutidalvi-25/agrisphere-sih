-- Module: Voice IVR buyer connect. A farmer calls in, picks a language,
-- picks a crop, then gets connected live to a buyer's phone — see
-- supabase/functions/ivr-webhook/index.ts for the call flow this backs.
--
-- Twilio (or any telephony provider) re-hits the same webhook URL fresh on
-- every keypress during one phone call, with no memory of earlier steps —
-- this table is that memory, keyed by Twilio's CallSid.
create table if not exists ivr_sessions (
  id uuid primary key default gen_random_uuid(),
  call_sid text not null unique,
  farmer_phone text not null,
  farmer_id uuid references profiles(id),
  language text not null default 'mr',   -- 'mr' | 'hi' | 'en'
  step text not null default 'language', -- 'language' | 'crop' | 'buyer_list_ready' | 'connecting'
  crop text,
  buyers_json jsonb,                     -- resolved buyer shortlist for `crop`, stashed here so the
                                          -- next keypress (which carries no other context) can look it up
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ivr_sessions_call_sid_idx on ivr_sessions (call_sid);

-- Needed so the IVR function can embed a buyer's name/phone straight off
-- an `offers` row (`.select('profiles(name, phone)')`) — same reasoning as
-- lots_farmer_id_profiles_fkey in 07_lots_offers_pooling_payments.sql;
-- offers.buyer_id only pointed at auth.users before this, which PostgREST
-- can't traverse into the separate profiles table.
alter table offers add constraint offers_buyer_id_profiles_fkey foreign key (buyer_id) references profiles(id);

alter table ivr_sessions enable row level security;

-- Only the Edge Function (using the service-role key, which bypasses RLS
-- entirely) ever reads or writes this table — no farmer-facing client
-- queries it directly, so no `authenticated`-role policy is needed here.
