-- Module: Farmer KYC (Aadhaar + optional Farmer ID), collected at signup.
--
-- Deliberately NOT stored on `profiles` — that table's "readable by any
-- logged-in user" policy (01_profiles.sql) exists so buyers/FPOs can see a
-- farmer's name, but an Aadhaar number is sensitive government ID data that
-- must not be visible to every other logged-in user. A separate table with
-- its own strict RLS keeps it visible only to the farmer themself and admins.
--
-- Stored as plain text, not encrypted — an earlier attempt at column
-- encryption via pgcrypto + Supabase Vault broke signup (Vault's
-- decrypted_secrets view was not reliably reachable from inside this
-- specific auth trigger's execution context) and was reverted. Access
-- control here comes entirely from RLS below, not from encryption.
--
-- Format is validated client-side (12 digits) — this proves the farmer typed
-- something Aadhaar-shaped, not that a real UIDAI-registered Aadhaar was
-- checked, since that requires UIDAI's own verification API/eKYC, not a
-- freely available check.

create table if not exists farmer_kyc (
  profile_id uuid primary key references profiles(id) on delete cascade,
  farmer_id_number text,
  aadhaar_id text not null,
  created_at timestamptz not null default now()
);

alter table farmer_kyc enable row level security;
grant select on public.farmer_kyc to authenticated;

create policy "farmers can read their own kyc"
  on farmer_kyc for select to authenticated
  using (profile_id = auth.uid());

create policy "admins can read all kyc"
  on farmer_kyc for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- No insert/update policy for the `authenticated` role on purpose — the
-- only writer is the trigger below, which runs `security definer` (as the
-- function owner, bypassing RLS entirely) so a client can never insert or
-- edit an Aadhaar number directly through the API.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'farmer'),
    'active'
  );

  if coalesce(new.raw_user_meta_data->>'role', 'farmer') = 'farmer'
     and new.raw_user_meta_data->>'aadhaarId' is not null then
    insert into public.farmer_kyc (profile_id, farmer_id_number, aadhaar_id)
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'farmerIdNumber', ''),
      new.raw_user_meta_data->>'aadhaarId'
    );
  end if;

  return new;
end;
$$;
