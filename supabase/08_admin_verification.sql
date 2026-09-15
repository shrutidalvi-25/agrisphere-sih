-- Module: Admin verification queue.
-- Reuses the `status` column already on `profiles` (01_profiles.sql):
-- 'active' (default, not yet reviewed) -> 'verified' | 'flagged'.

create policy "admins can update any profile status"
  on profiles for update
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
