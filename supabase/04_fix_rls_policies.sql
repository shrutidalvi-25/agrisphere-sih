-- Module 1: Auth & Roles (fix #2)
-- Run this in the SQL Editor after 01, 02, and 03.
--
-- Why: `auth.role() = 'authenticated'` is the old-style RLS check and isn't
-- reliable with Supabase's newer publishable/secret key system. The robust
-- fix is to scope the policy to the `authenticated` role directly instead
-- of checking a JWT claim function.

drop policy if exists "profiles are readable by any logged-in user" on profiles;
create policy "profiles are readable by any logged-in user"
  on profiles for select
  to authenticated
  using (true);

drop policy if exists "users can insert their own profile" on profiles;
create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on profiles;
create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Same fix for mandi_prices, if you already ran 03_mandi_prices.sql
drop policy if exists "mandi prices are readable by any logged-in user" on mandi_prices;
create policy "mandi prices are readable by any logged-in user"
  on mandi_prices for select
  to authenticated
  using (true);
