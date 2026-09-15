-- Module 1: Auth & Roles (fix)
-- Run this in the SQL Editor too, right after 01_profiles.sql.
--
-- Why: creating the profile row from the browser right after signUp() only
-- works if email confirmation is off AND the session is already attached —
-- timing-sensitive and fragile. The standard Supabase pattern instead is a
-- database trigger that creates the profile server-side the instant the
-- auth user is created, regardless of confirmation settings.

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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
