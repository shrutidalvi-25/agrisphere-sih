-- Bug found during integration testing (2026-09-14): respondToOffer() marks
-- a lot 'sold' by running `update lots set status = 'sold' ...` under
-- whichever session called it. When the BUYER accepts an offer (the normal
-- flow — accepting the farmer's counter), the existing "farmers can update
-- their own lots" policy (farmer_id = auth.uid()) doesn't match the buyer's
-- session, so the update silently affects 0 rows (no .select() is chained,
-- so no error surfaces) and the lot stays 'listed' forever — still visible
-- in Browse Lots and poolable by FPOs even after being sold and paid for.
-- This mirrors the existing "fpo managers can mark lots as pooled" policy:
-- key off the accepted offer itself rather than lot ownership.
create policy "buyers can mark a lot sold once their offer on it is accepted"
  on lots for update to authenticated
  using (exists (
    select 1 from offers
    where offers.lot_id = lots.id
      and offers.buyer_id = auth.uid()
      and offers.status = 'accepted'
  ));

-- Backfill: any lot with an accepted offer that never got marked 'sold'
-- because it was blocked by the RLS gap above.
update lots
set status = 'sold'
where status = 'listed'
  and id in (select lot_id from offers where status = 'accepted');
