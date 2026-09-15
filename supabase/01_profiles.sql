-- Module 1: Auth & Roles
-- Run this in Supabase → SQL Editor, once, before anyone builds against it.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null check (role in ('farmer', 'buyer', 'fpo', 'admin')),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Required in addition to the RLS policies below: if you created this project
-- with "Automatically expose new tables" turned OFF (which we recommended for
-- manual control), the `authenticated` role has no base table privileges yet.
-- Without this grant you'll see "permission denied for table profiles" even
-- though the RLS policies are 100% correct — RLS only applies after base
-- privileges are already granted.
grant select, insert, update on public.profiles to authenticated;

-- Everyone logged in can read basic profile info (needed so a buyer can see
-- a farmer's name/reliability score, an FPO manager can see member names, etc).
-- Policy is scoped `to authenticated` rather than checking auth.role() in
-- `using()` — the latter is the old-style check and isn't reliable with
-- Supabase's newer publishable/secret key system.
create policy "profiles are readable by any logged-in user"
  on profiles for select
  to authenticated
  using (true);

-- You can only create/edit your own profile row.
create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);
