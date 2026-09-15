-- Module 11: bounded counter-offer negotiation.
--
-- Offers previously only supported a flat accept/reject on the buyer's
-- initial price. This adds a capped back-and-forth: `round` counts how many
-- prices have been proposed so far (starts at 1, the buyer's opening
-- offer), `last_actor` says who proposed the current price_per_quintal
-- (whoever did NOT propose it is the one who can respond), and
-- `negotiation_history` keeps every prior price so both sides can see the
-- full trail — same explainable-over-black-box spirit as grading and
-- sell/hold. Capped at MAX_ROUNDS = 3 (enforced in offerService.js) so a
-- negotiation can't go back and forth indefinitely — the receiving party
-- on round 3 can only accept or reject, not counter again.
alter table offers add column if not exists round int not null default 1;
alter table offers add column if not exists last_actor text not null default 'buyer'; -- 'buyer' | 'farmer' — who proposed the CURRENT price_per_quintal
alter table offers add column if not exists negotiation_history jsonb not null default '[]'::jsonb;

-- No new RLS policies needed — a counter-offer is just an update to
-- price_per_quintal/round/last_actor/negotiation_history, already covered
-- by the existing "buyers can update their own offers" and "farmers can
-- update offers on their own lots" policies in 07_lots_offers_pooling_payments.sql.
