-- ============================================================
-- MIGRATION 0001: ensure_profile() + admin promote helper
-- Lumière RestauBar Management System
-- ============================================================
-- Purpose:
--   1. Add a self-healing ensure_profile() RPC so a user can
--      sign in even if the public.profiles row is missing
--      (e.g. user was created in Supabase dashboard and the
--      handle_new_user() trigger never fired).
--   2. Provide a one-line SQL snippet to promote an existing
--      user to the admin role.
--
-- Where to run:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   This file is idempotent: safe to run multiple times.
-- ============================================================


-- ============================================================
-- 1. ensure_profile() — self-heals a missing profile row
-- ============================================================
create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_profile public.profiles;
  v_role text;
  v_full_name text;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    return null;
  end if;

  -- Fast path: profile already exists, just return it.
  select * into v_profile from public.profiles where id = v_user.id;
  if v_profile.id is not null then
    return v_profile;
  end if;

  -- Backfill from auth metadata, defaulting safely to 'waiter'.
  v_role := coalesce(v_user.raw_user_meta_data->>'role', 'waiter');
  if v_role not in ('admin','pos','waiter','customer') then
    v_role := 'waiter';
  end if;

  v_full_name := coalesce(
    v_user.raw_user_meta_data->>'full_name',
    split_part(v_user.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, role, is_active)
  values (v_user.id, v_user.email, v_full_name, v_role, true)
  on conflict (id) do nothing
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.ensure_profile() to authenticated;

-- Reload PostgREST schema cache so the new function is immediately callable
-- from the JS client (otherwise you get "Could not find the function" for ~1 min).
notify pgrst, 'reload schema';


-- ============================================================
-- 2. promote_to_admin(email text) — one-liner helper
-- ============================================================
-- Promotes a user to admin by email:
--   - Upserts a profile row if missing
--   - Sets role = 'admin' on the profile
--   - Updates auth.users.raw_user_meta_data so the role sticks
--     across sessions and is visible in user.user_metadata.role
--
-- Usage (run in SQL Editor after replacing the email):
--   select public.promote_to_admin('your-email@lumiere.app');
-- ============================================================
create or replace function public.promote_to_admin(p_email text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_profile public.profiles;
begin
  select * into v_user from auth.users where email = p_email;
  if v_user.id is null then
    raise exception 'No auth user found for email %', p_email;
  end if;

  -- Upsert profile row
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    v_user.id,
    v_user.email,
    coalesce(v_user.raw_user_meta_data->>'full_name', split_part(v_user.email, '@', 1)),
    'admin',
    true
  )
  on conflict (id) do update
    set role = 'admin',
        is_active = true,
        updated_at = now()
  returning * into v_profile;

  -- Sync role into auth metadata so login form sees it
  update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('role', 'admin')
  where id = v_user.id;

  return v_profile;
end;
$$;

grant execute on function public.promote_to_admin(text) to service_role;


-- ============================================================
-- 3. ONE-LINER: promote a user to admin (edit email, then run)
-- ============================================================
-- select public.promote_to_admin('admin@lumiere.app');
-- ============================================================
