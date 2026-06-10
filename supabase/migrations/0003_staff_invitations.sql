-- ============================================================
-- MIGRATION 0003: add address column to profiles + staff invitations table
-- Lumière RestauBar Management System
-- ============================================================
-- Purpose:
--   1. Add address column to public.profiles for staff contact info
--   2. Create staff_invitations table to track pending staff invites
--   3. Auto-assign role on first login via auth trigger
--
-- Where to run:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
-- ============================================================


-- 1. Add address column to profiles
alter table public.profiles add column if not exists address text;


-- 2. Staff invitations table
create table if not exists public.staff_invitations (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  full_name     text,
  phone         text,
  address       text,
  role          text not null default 'waiter' references public.roles(id),
  invited_by    uuid references public.profiles(id) on delete set null,
  token         text unique not null default encode(gen_random_bytes(32), 'hex'),
  accepted_at   timestamptz,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

-- RLS: only admin can manage invitations
alter table public.staff_invitations enable row level security;

drop policy if exists "staff_invitations admin all" on public.staff_invitations;
drop policy if exists "staff_invitations read own"  on public.staff_invitations;

create policy "staff_invitations admin all"
  on public.staff_invitations
  for all
  using (public.is_admin());

create policy "staff_invitations read own"
  on public.staff_invitations
  for select
  using (auth.uid() = invited_by or public.is_admin());


-- 3. Function + trigger: when a new user signs up, check for pending invitation
--    and auto-fill their profile with the invited role and info.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Check if there's a pending invitation for this email
  update public.staff_invitations
  set
    accepted_at = now(),
    full_name    = coalesce(nullif(trim(staff_invitations.full_name), ''), new_profile.full_name),
    phone        = coalesce(nullif(trim(staff_invitations.phone), ''), new_profile.phone),
    address      = staff_invitations.address
  from (select new_user.*) as new_profile
  where staff_invitations.email = new_user.email
    and staff_invitations.accepted_at is null
    and staff_invitations.expires_at > now();

  -- If an invitation existed, backfill the profile with the invited role/info
  update public.profiles
  set
    full_name  = coalesce(
      (select full_name from public.staff_invitations where email = new_user.email and accepted_at = now()),
      full_name
    ),
    phone      = coalesce(
      (select phone from public.staff_invitations where email = new_user.email and accepted_at = now()),
      phone
    ),
    address    = (select address from public.staff_invitations where email = new_user.email and accepted_at = now()),
    role       = coalesce(
      (select role from public.staff_invitations where email = new_user.email and accepted_at = now()),
      'waiter'
    ),
    is_active  = true
  where profiles.id = new_user.id;

  return new_user;
end;
$$;

-- Re-create the trigger (drop first to be safe)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 4. Reload PostgREST schema cache
notify pgrst, 'reload schema';