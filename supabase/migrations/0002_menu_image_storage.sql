-- ============================================================
-- MIGRATION 0002: menu-image storage bucket + RLS policies
-- Lumière RestauBar Management System
-- ============================================================
-- Purpose:
--   1. Create the public "menu-image" bucket (5MB cap, image MIME types)
--   2. Allow admin/pos to upload and replace images
--   3. Allow public (anon) read so the customer menu and POS can render
--      the image URLs without going through a signed-URL flow.
--
-- Where to run:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   This file is idempotent: safe to run multiple times.
-- ============================================================


-- ============================================================
-- 1. Bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-image',
  'menu-image',
  true,
  5 * 1024 * 1024,           -- 5MB per object
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================
-- 2. Storage RLS policies
--    The storage.objects table is what every storage.* RLS policy
--    reads against. The "name" column holds the object path, e.g.
--    "menu/1749665123-abcd1234.jpg". We scope all policies to the
--    menu-image bucket and the "menu/" prefix.
-- ============================================================

-- Drop any old versions of these policies so re-running this file is safe.
drop policy if exists "menu-image read public"        on storage.objects;
drop policy if exists "menu-image insert staff"       on storage.objects;
drop policy if exists "menu-image update staff"       on storage.objects;
drop policy if exists "menu-image delete staff"       on storage.objects;
drop policy if exists "Authenticated can read menu"   on storage.objects;
drop policy if exists "Staff can upload menu images"  on storage.objects;
drop policy if exists "Staff can update menu images"  on storage.objects;
drop policy if exists "Staff can delete menu images"  on storage.objects;

-- Public read (bucket is public anyway, but keep RLS in sync for clarity)
create policy "menu-image read public"
on storage.objects
for select
to public
using ( bucket_id = 'menu-image' );

-- Authenticated staff (admin / pos / waiter) can upload to menu-image
create policy "menu-image insert staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-image'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
);

-- Authenticated staff can update/replace existing menu images
create policy "menu-image update staff"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-image'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
)
with check (
  bucket_id = 'menu-image'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
);

-- Authenticated staff can delete menu images
create policy "menu-image delete staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-image'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'pos', 'waiter')
      and coalesce(p.is_active, true) = true
  )
);


-- ============================================================
-- 3. Reload PostgREST schema cache (so any future storage.RPC
--    you add is immediately visible to the JS client)
-- ============================================================
notify pgrst, 'reload schema';
