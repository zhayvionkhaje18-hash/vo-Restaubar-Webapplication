-- ============================================================
-- MIGRATION 0002: menu-images storage bucket RLS policies
-- Lumière RestauBar Management System
-- ============================================================
-- Purpose:
--   1. Use existing "menu-images" bucket (already created via schema.sql)
--   2. Add stricter RLS policies: only admin/pos/waiter can upload
--   3. Allow public read so customer menu and POS can render images
--
-- Where to run:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   This file is idempotent: safe to run multiple times.
-- ============================================================


-- ============================================================
-- 1. Storage RLS policies
--    The storage.objects table is what every storage.* RLS policy
--    reads against. The "name" column holds the object path, e.g.
--    "menu/1749665123-abcd1234.jpg". We scope all policies to the
--    menu-images bucket.
-- ============================================================

-- Drop any old versions of these policies so re-running this file is safe.
drop policy if exists "menu-images read public"        on storage.objects;
drop policy if exists "menu-images insert staff"       on storage.objects;
drop policy if exists "menu-images update staff"       on storage.objects;
drop policy if exists "menu-images delete staff"       on storage.objects;
drop policy if exists "Authenticated can read menu"    on storage.objects;
drop policy if exists "Staff can upload menu images"   on storage.objects;
drop policy if exists "Staff can update menu images"   on storage.objects;
drop policy if exists "Staff can delete menu images"   on storage.objects;

-- Public read (bucket is public anyway, but keep RLS in sync for clarity)
create policy "menu-images read public"
on storage.objects
for select
to public
using ( bucket_id = 'menu-images' );

-- Authenticated staff (admin / pos / waiter) can upload to menu-images
create policy "menu-images insert staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
);

-- Authenticated staff can update/replace existing menu images
create policy "menu-images update staff"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-images'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
)
with check (
  bucket_id = 'menu-images'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
);

-- Authenticated staff can delete menu images
create policy "menu-images delete staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
);


-- ============================================================
-- 2. Reload PostgREST schema cache (so any future storage.RPC
--    you add is immediately visible to the JS client)
-- ============================================================
notify pgrst, 'reload schema';