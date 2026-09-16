-- Module: Complaints / grievances.
-- A complaint always attaches to a specific record the complainant already
-- has real access to (a payment or an offer) — no free-floating complaints
-- with no context for admin to act on. `record_type`/`record_id` deliberately
-- has no foreign key (it can point at either table), so the app is
-- responsible for only ever inserting an id that actually exists.
--
-- Resolving a payment complaint can flip that payment's own status
-- (e.g. back to 'pending' for a redo, or 'received' if admin sides with the
-- farmer) — this is what finally makes the 'disputed' payment status (see
-- payments.status comment in 07_lots_offers_pooling_payments.sql) reachable;
-- until now nothing in the app ever set it.

create table if not exists complaints (
  id bigint generated always as identity primary key,
  complainant_id uuid not null references auth.users(id),
  against_id uuid references auth.users(id),
  record_type text not null check (record_type in ('payment', 'offer')),
  record_id bigint not null,
  category text not null check (category in ('payment_not_received', 'wrong_amount', 'misconduct', 'other')),
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table complaints enable row level security;
grant select, insert, update on public.complaints to authenticated;

create policy "users can create their own complaints"
  on complaints for insert to authenticated
  with check (complainant_id = auth.uid());

create policy "users can read their own complaints"
  on complaints for select to authenticated
  using (complainant_id = auth.uid());

create policy "admins can read and update all complaints"
  on complaints for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "admins can resolve complaints"
  on complaints for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create index if not exists complaints_complainant_idx on complaints (complainant_id);
create index if not exists complaints_status_idx on complaints (status);

-- Admin needs to be able to update a disputed payment's status when
-- resolving a complaint (e.g. reset to 'pending' or set 'received') — the
-- existing update policy on payments only allows the buyer/farmer on that
-- specific deal, not an admin acting on their behalf.
create policy "admins can update any payment"
  on payments for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
