-- Modules 5-9: Lot Creation + AI Grading, Buyer Discovery + Offers,
-- FPO Pooling, Payment Tracking, Reliability Score.
--
-- Same pattern as every earlier table in this project: RLS enabled +
-- explicit `grant` to `authenticated` (required because this Supabase
-- project was created with "Automatically expose new tables" off — see
-- the note in 01_profiles.sql), plus row-ownership policies.

-- ── Storage: lot photos ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('lot-photos', 'lot-photos', true)
on conflict (id) do nothing;

create policy "anyone logged in can upload a lot photo"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lot-photos');

create policy "lot photos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'lot-photos');

-- ── Module 5: Lots (+ AI grading) ──────────────────────────────────────
create table if not exists lots (
  id bigint generated always as identity primary key,
  farmer_id uuid not null references auth.users(id),
  -- Also references profiles(id) below (both point at the same auth user
  -- 1:1) — that second FK is what lets PostgREST embed the farmer's name
  -- straight into a lots query (`.select('*, profiles(name)')`) instead of
  -- the UI showing a raw uuid.
  crop text not null,
  quantity_quintal numeric not null,
  photo_url text,
  notes text,                          -- farmer's free-text note, can arrive via voice-to-text
  lat numeric,
  lng numeric,
  grade text,                          -- 'A' | 'B' | 'C', set by the grading stub on insert
  grade_reason text,                   -- i18n key (see gradingService.js/grading.* in src/locales) for the explainable reasoning shown to the farmer, not a finished sentence
  status text not null default 'listed', -- listed | pooled | sold | withdrawn
  created_at timestamptz not null default now()
);

alter table lots add constraint lots_farmer_id_profiles_fkey foreign key (farmer_id) references profiles(id);

alter table lots enable row level security;
grant select, insert, update on public.lots to authenticated;

create policy "lots are readable by any logged-in user"
  on lots for select to authenticated using (true);

create policy "farmers can create their own lots"
  on lots for insert to authenticated
  with check (farmer_id = auth.uid());

create policy "farmers can update their own lots"
  on lots for update to authenticated
  using (farmer_id = auth.uid());

-- createPool() inserts the pooled_lot_members row first, then marks the
-- lot 'pooled' — by the time this update runs the membership row already
-- links the lot to a pool owned by the FPO manager, so this policy can key
-- off that link rather than lot ownership (the FPO manager is never the
-- lot's farmer).
create policy "fpo managers can mark lots as pooled in their own pools"
  on lots for update to authenticated
  using (exists (
    select 1 from pooled_lot_members join pooled_lots on pooled_lots.id = pooled_lot_members.pooled_lot_id
    where pooled_lot_members.lot_id = lots.id and pooled_lots.fpo_id = auth.uid()
  ));

create index if not exists lots_crop_status_idx on lots (crop, status);

-- ── Module 6: Offers (buyer discovery + negotiation) ───────────────────
create table if not exists offers (
  id bigint generated always as identity primary key,
  lot_id bigint not null references lots(id),
  buyer_id uuid not null references auth.users(id),
  price_per_quintal numeric not null,
  quantity_quintal numeric not null,
  status text not null default 'pending', -- pending | accepted | rejected | withdrawn
  price_locked_until date,                -- set on accept if the buyer/farmer chose to freeze the price
  created_at timestamptz not null default now()
);

alter table offers enable row level security;
grant select, insert, update on public.offers to authenticated;

create policy "offers are readable by any logged-in user"
  on offers for select to authenticated using (true);

create policy "buyers can create offers"
  on offers for insert to authenticated
  with check (buyer_id = auth.uid());

create policy "buyers can update their own offers"
  on offers for update to authenticated
  using (buyer_id = auth.uid());

create policy "farmers can update offers on their own lots"
  on offers for update to authenticated
  using (exists (select 1 from lots where lots.id = offers.lot_id and lots.farmer_id = auth.uid()));

create index if not exists offers_lot_idx on offers (lot_id);

-- ── Module 7: FPO pooling ───────────────────────────────────────────────
create table if not exists pooled_lots (
  id bigint generated always as identity primary key,
  fpo_id uuid not null references auth.users(id),
  crop text not null,
  status text not null default 'open', -- open | closed
  created_at timestamptz not null default now()
);

create table if not exists pooled_lot_members (
  id bigint generated always as identity primary key,
  pooled_lot_id bigint not null references pooled_lots(id),
  lot_id bigint not null references lots(id),
  unique (lot_id) -- a lot can only belong to one pool at a time
);

alter table pooled_lots enable row level security;
alter table pooled_lot_members enable row level security;
grant select, insert, update on public.pooled_lots to authenticated;
grant select, insert, delete on public.pooled_lot_members to authenticated;

create policy "pooled lots are readable by any logged-in user"
  on pooled_lots for select to authenticated using (true);

create policy "fpo managers can create pools"
  on pooled_lots for insert to authenticated
  with check (fpo_id = auth.uid());

create policy "fpo managers can update their own pools"
  on pooled_lots for update to authenticated
  using (fpo_id = auth.uid());

create policy "pooled lot members are readable by any logged-in user"
  on pooled_lot_members for select to authenticated using (true);

create policy "fpo managers can add lots to their own pools"
  on pooled_lot_members for insert to authenticated
  with check (exists (select 1 from pooled_lots where pooled_lots.id = pooled_lot_id and pooled_lots.fpo_id = auth.uid()));

create policy "fpo managers can remove lots from their own pools"
  on pooled_lot_members for delete to authenticated
  using (exists (select 1 from pooled_lots where pooled_lots.id = pooled_lot_id and pooled_lots.fpo_id = auth.uid()));

-- ── Module 8: Payment tracking ─────────────────────────────────────────
-- No real payment gateway for the hackathon build — buyer marks "Paid",
-- farmer confirms "Received". tx_hash is a SHA-256 hash of the payment's
-- key fields, computed client-side, giving a tamper-evident record without
-- standing up a real blockchain — same "explainable, not black-box" spirit
-- as the sell/hold and grading logic.
create table if not exists payments (
  id bigint generated always as identity primary key,
  offer_id bigint not null references offers(id),
  amount numeric not null,
  status text not null default 'pending', -- pending | paid | received | disputed
  buyer_marked_paid_at timestamptz,
  farmer_confirmed_at timestamptz,
  tx_hash text,
  anchor_calendar_url text,   -- which OpenTimestamps calendar server accepted the anchor submission
  anchor_proof text,          -- base64 raw proof bytes returned by that calendar
  anchor_submitted_at timestamptz, -- when the final tx_hash was submitted for Bitcoin anchoring
  created_at timestamptz not null default now()
);

alter table payments enable row level security;
grant select, insert, update on public.payments to authenticated;

create policy "payments are readable by any logged-in user"
  on payments for select to authenticated using (true);

create policy "buyers can create a payment for their own accepted offer"
  on payments for insert to authenticated
  with check (exists (select 1 from offers where offers.id = offer_id and offers.buyer_id = auth.uid()));

-- The payment row is actually created by the FARMER's client, at the
-- moment they accept an offer (see offerService.respondToOffer) — not by
-- the buyer. Without this policy that insert is rejected by RLS even
-- though the buyer-side policy above looks like it should cover payments.
create policy "farmers can create a payment when accepting an offer on their own lot"
  on payments for insert to authenticated
  with check (exists (
    select 1 from offers join lots on lots.id = offers.lot_id
    where offers.id = offer_id and lots.farmer_id = auth.uid()
  ));

create policy "buyers and farmers can update payments on their own deals"
  on payments for update to authenticated
  using (exists (
    select 1 from offers join lots on lots.id = offers.lot_id
    where offers.id = payments.offer_id
      and (offers.buyer_id = auth.uid() or lots.farmer_id = auth.uid())
  ));

create index if not exists payments_offer_idx on payments (offer_id);
