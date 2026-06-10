-- ============================================================
-- LUMIÈRE RESTAUBAR MANAGEMENT SYSTEM
-- Complete Database Schema
-- Supabase SQL Editor: Run this ONCE on a fresh project
-- ============================================================

-- ============================================================
-- 0. CLEAN SLATE (safe to run multiple times)
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.generate_qr_token();
drop function if exists public.log_activity();

-- Drop tables in reverse dependency order
drop table if exists public.activity_logs cascade;
drop table if exists public.receipts cascade;
drop table if exists public.payments cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.reservations cascade;
drop table if exists public.menu_items cascade;
drop table if exists public.categories cascade;
drop table if exists public.table_qr_codes cascade;
drop table if exists public.tables cascade;
drop table if exists public.roles cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- 1. ROLES
-- ============================================================
create table public.roles (
  id text primary key,                -- 'admin' | 'pos' | 'waiter' | 'customer'
  label text not null,
  description text,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.roles (id, label, description, permissions) values
  ('admin',    'Administrator', 'Full system access',           '{"all": true}'::jsonb),
  ('pos',      'POS Cashier',   'Process orders and payments', '{"orders": "rw", "payments": "rw", "receipts": "rw"}'::jsonb),
  ('waiter',   'Waiter',        'Manage tables and orders',    '{"tables": "rw", "orders": "rw"}'::jsonb),
  ('customer', 'Customer',      'QR ordering only',            '{"orders": "r", "menu": "r"}'::jsonb);

-- ============================================================
-- 2. PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  role text not null default 'waiter' references public.roles(id),
  avatar_url text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- ============================================================
-- 3. TABLES (restaurant tables)
-- ============================================================
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,            -- e.g. "A-1", "Patio-3"
  seats int not null check (seats > 0),
  zone text,                             -- e.g. "Indoor", "Patio", "Bar"
  status text not null default 'available'
    check (status in ('available','occupied','reserved','cleaning')),
  assigned_waiter uuid references public.profiles(id) on delete set null,
  current_order_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tables_status on public.tables(status);
create index idx_tables_waiter on public.tables(assigned_waiter);

-- ============================================================
-- 4. TABLE QR CODES
-- ============================================================
create table public.table_qr_codes (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete cascade,
  token text not null unique,
  image_url text,
  is_active boolean not null default true,
  scan_count int not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_qr_table on public.table_qr_codes(table_id);

-- ============================================================
-- 5. CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_categories_active on public.categories(is_active, sort_order);

-- ============================================================
-- 6. MENU ITEMS
-- ============================================================
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_alcoholic boolean not null default false,
  prep_minutes int default 15,
  cost numeric(10,2),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_menu_category on public.menu_items(category_id);
create index idx_menu_available on public.menu_items(is_available);

-- ============================================================
-- 7. ORDERS
-- ============================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint unique not null
    default (extract(epoch from now())::bigint),
  table_id uuid references public.tables(id) on delete set null,
  session_token text,                    -- for guest QR sessions
  customer_name text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','served','completed','cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending','paid','refunded')),
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  served_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_orders_table on public.orders(table_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_payment on public.orders(payment_status);
create index idx_orders_created on public.orders(created_at desc);
create index idx_orders_session on public.orders(session_token);

-- ============================================================
-- 8. ORDER ITEMS
-- ============================================================
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,                    -- snapshot of item name
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  notes text,
  status text not null default 'pending'
    check (status in ('pending','preparing','ready','served','cancelled')),
  created_at timestamptz not null default now()
);

create index idx_order_items_order on public.order_items(order_id);

-- ============================================================
-- 9. PAYMENTS
-- ============================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash','card','gcash','maya','other')),
  status text not null default 'pending'
    check (status in ('pending','paid','failed','refunded')),
  amount_tendered numeric(10,2),
  change_due numeric(10,2),
  reference text,                        -- e.g. GCash ref #
  notes text,
  processed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_payments_order on public.payments(order_id);

-- ============================================================
-- 10. RECEIPTS
-- ============================================================
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  receipt_number text not null unique
    default ('RCP-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*10000))::text,4,'0')),
  pdf_url text,
  image_url text,
  subtotal numeric(10,2) not null,
  tax numeric(10,2) not null,
  total numeric(10,2) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_receipts_order on public.receipts(order_id);

-- ============================================================
-- 11. RESERVATIONS
-- ============================================================
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  customer_email text,
  party_size int not null check (party_size > 0),
  reserved_at timestamptz not null,
  table_id uuid references public.tables(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','seated','completed','cancelled','no_show')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reservations_date on public.reservations(reserved_at);
create index idx_reservations_status on public.reservations(status);

-- ============================================================
-- 12. ACTIVITY LOGS
-- ============================================================
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  actor_role text,
  action text not null,                  -- e.g. 'order.created', 'menu.updated'
  entity text,                           -- e.g. 'order', 'menu_item'
  entity_id uuid,
  detail jsonb default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index idx_activity_actor on public.activity_logs(actor_id, created_at desc);
create index idx_activity_entity on public.activity_logs(entity, entity_id);
create index idx_activity_created on public.activity_logs(created_at desc);

-- ============================================================
-- 13. RESTAURANT SETTINGS (single-row config)
-- ============================================================
create table public.restaurant_settings (
  id int primary key default 1 check (id = 1),  -- enforce single row
  name text not null default 'Lumière',
  tagline text default 'Restaurant & Bar',
  address text,
  phone text,
  email text,
  tin text,                                  -- Tax ID
  logo_url text,
  currency text not null default '₱',
  tax_rate numeric(5,2) not null default 12.00 check (tax_rate >= 0 and tax_rate <= 100),
  service_charge numeric(5,2) not null default 0 check (service_charge >= 0 and service_charge <= 100),
  receipt_footer text,
  open_time time default '10:00:00',
  close_time time default '23:00:00',
  updated_at timestamptz not null default now()
);

create trigger trg_settings_updated before update on public.restaurant_settings
  for each row execute function public.touch_updated_at();

-- Seed default row
insert into public.restaurant_settings (id, name, tagline, currency, tax_rate)
values (1, 'Lumière', 'Restaurant & Bar', '₱', 12.00)
on conflict (id) do nothing;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generate unique QR token
create or replace function public.generate_qr_token()
returns text language plpgsql as $$
declare
  token text;
begin
  token := encode(gen_random_bytes(16), 'hex');
  return token;
end;
$$;

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'waiter')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Self-heal: ensure a profile row exists for the current auth user.
-- Returns the existing row, or creates one from auth metadata if missing.
-- SECURITY DEFINER so it can write to public.profiles even when the user
-- has no INSERT policy of their own.
create or replace function public.ensure_profile()
returns public.profiles
language plpgsql security definer set search_path = public as $$
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

  -- Fast path: profile already exists.
  select * into v_profile from public.profiles where id = v_user.id;
  if v_profile.id is not null then
    return v_profile;
  end if;

  -- Backfill from auth metadata, defaulting safely.
  v_role := coalesce(v_user.raw_user_meta_data->>'role', 'waiter');
  if v_role not in ('admin','pos','waiter') then
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

-- Log activity helper
create or replace function public.log_activity(
  p_action text,
  p_entity text default null,
  p_entity_id uuid default null,
  p_detail jsonb default '{}'::jsonb
)
returns void language plpgsql security definer as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_actor_role text;
begin
  if v_actor_id is not null then
    select full_name, role into v_actor_name, v_actor_role
    from public.profiles where id = v_actor_id;
  end if;

  insert into public.activity_logs (actor_id, actor_name, actor_role, action, entity, entity_id, detail)
  values (v_actor_id, v_actor_name, v_actor_role, p_action, p_entity, p_entity_id, p_detail);
end;
$$;

-- Update updated_at automatically
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated   before update on public.profiles      for each row execute function public.touch_updated_at();
create trigger trg_tables_updated     before update on public.tables        for each row execute function public.touch_updated_at();
create trigger trg_menu_updated       before update on public.menu_items    for each row execute function public.touch_updated_at();
create trigger trg_orders_updated     before update on public.orders        for each row execute function public.touch_updated_at();
create trigger trg_reservations_updated before update on public.reservations for each row execute function public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles          enable row level security;
alter table public.roles             enable row level security;
alter table public.tables            enable row level security;
alter table public.table_qr_codes    enable row level security;
alter table public.categories        enable row level security;
alter table public.menu_items        enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.payments          enable row level security;
alter table public.receipts          enable row level security;
alter table public.reservations      enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.restaurant_settings enable row level security;

-- Helper: check if current user is admin
-- NOTE: Must handle NULL auth.uid() gracefully (customers have no auth user)
create or replace function public.is_admin() returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
      and auth.uid() is not null
  );
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin','pos','waiter')
      and is_active = true
      and auth.uid() is not null
  );
$$;

-- PROFILES policies
create policy "profiles_select"  on public.profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_update"  on public.profiles for update using (auth.uid() = id or is_admin());
create policy "profiles_admin_all" on public.profiles for all using (is_admin());

-- ROLES — readable by everyone authenticated
create policy "roles_read" on public.roles for select using (auth.uid() is not null);
create policy "roles_admin" on public.roles for all using (is_admin());

-- TABLES — staff can read, admin can write, customers can read available
create policy "tables_read"     on public.tables for select using (is_staff() or status = 'available');
create policy "tables_admin"    on public.tables for all using (is_admin());
create policy "tables_pos"      on public.tables for update using (public.is_staff());
create policy "tables_waiter"   on public.tables for update using (auth.uid() = assigned_waiter or is_admin());

-- QR CODES
create policy "qr_read"  on public.table_qr_codes for select using (true);
create policy "qr_admin" on public.table_qr_codes for all using (is_admin());

-- CATEGORIES & MENU — public read
create policy "categories_read"   on public.categories for select using (is_active or is_staff());
create policy "categories_admin"  on public.categories for all using (is_admin());
create policy "menu_read"         on public.menu_items for select using (is_available or is_staff());
create policy "menu_admin"        on public.menu_items for all using (is_admin());

-- ORDERS — staff can read all, customers can read their own session
create policy "orders_staff_read"   on public.orders for select using (is_staff());
create policy "orders_customer_read" on public.orders for select using (session_token = current_setting('request.headers', true)::json->>'x-session-token');
create policy "orders_staff_write"  on public.orders for insert with check (is_staff() or session_token is not null);
create policy "orders_staff_update" on public.orders for update using (is_staff());

-- ORDER ITEMS
create policy "order_items_read"  on public.order_items for select using (
  is_staff() or exists(
    select 1 from public.orders o
    where o.id = order_items.order_id
    and o.session_token = current_setting('request.headers', true)::json->>'x-session-token'
  )
);
create policy "order_items_write" on public.order_items for insert with check (is_staff() or true);
create policy "order_items_update" on public.order_items for update using (is_staff());

-- PAYMENTS — staff only
create policy "payments_staff"  on public.payments for all using (is_staff());

-- RECEIPTS — staff can read all, customers can read by session
create policy "receipts_staff"  on public.receipts for all using (is_staff());
create policy "receipts_cust"   on public.receipts for select using (
  exists(select 1 from public.orders o where o.id = receipts.order_id and o.session_token = current_setting('request.headers', true)::json->>'x-session-token')
);

-- RESERVATIONS — staff can manage
create policy "reservations_staff" on public.reservations for all using (is_staff());
create policy "reservations_public_insert" on public.reservations for insert with check (true);

-- ACTIVITY LOGS — admin only
create policy "activity_admin" on public.activity_logs for all using (is_admin());

-- RESTAURANT SETTINGS — staff can read, admin can write
create policy "settings_read"  on public.restaurant_settings for select using (is_staff());
create policy "settings_admin" on public.restaurant_settings for all using (is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('receipts',     'receipts',     true),
  ('menu-images',  'menu-images',  true),
  ('categories',   'categories',   true),
  ('qrcodes',      'qrcodes',      true),
  ('avatars',      'avatars',      true),
  ('restaurant',   'restaurant',   true)
on conflict (id) do nothing;

-- Storage RLS
create policy "menu_public_read"     on storage.objects for select using (bucket_id in ('menu-images','categories','qrcodes','receipts','restaurant'));
create policy "avatars_public_read"  on storage.objects for select using (bucket_id = 'avatars');
create policy "staff_upload"         on storage.objects for insert with check (bucket_id in ('menu-images','categories','qrcodes','avatars','receipts','restaurant') and public.is_staff());
create policy "staff_update"         on storage.objects for update using (public.is_staff());
create policy "staff_delete"         on storage.objects for delete using (public.is_staff());

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default tables
insert into public.tables (label, seats, zone, status) values
  ('A-1', 2, 'Indoor',  'available'),
  ('A-2', 2, 'Indoor',  'available'),
  ('A-3', 4, 'Indoor',  'available'),
  ('A-4', 4, 'Indoor',  'available'),
  ('A-5', 6, 'Indoor',  'available'),
  ('B-1', 2, 'Bar',     'available'),
  ('B-2', 2, 'Bar',     'available'),
  ('B-3', 4, 'Bar',     'available'),
  ('P-1', 4, 'Patio',   'available'),
  ('P-2', 4, 'Patio',   'available'),
  ('P-3', 6, 'Patio',   'available'),
  ('V-1', 8, 'VIP',     'available');

-- Default categories
insert into public.categories (name, description, sort_order) values
  ('Appetizers',  'Starters and small bites', 1),
  ('Salads',      'Fresh garden salads', 2),
  ('Main Course', 'Signature entrees', 3),
  ('Pasta',       'Italian favorites', 4),
  ('Desserts',    'Sweet endings', 5),
  ('Coffee',      'Hot & cold coffee drinks', 6),
  ('Drinks',      'Non-alcoholic beverages', 7),
  ('Cocktails',   'Signature cocktails', 8),
  ('Wine',        'Red, white, sparkling', 9),
  ('Beer',        'Local & imported', 10);

-- Default menu items
insert into public.menu_items (category_id, name, description, price, prep_minutes, is_alcoholic) values
  ((select id from public.categories where name = 'Appetizers'), 'Buffalo Wings',     'Crispy chicken wings tossed in spicy buffalo sauce', 380, 12, false),
  ((select id from public.categories where name = 'Appetizers'), 'Calamari',          'Golden fried squid rings with garlic aioli',          320, 10, false),
  ((select id from public.categories where name = 'Appetizers'), 'Spring Rolls',      'Vegetable spring rolls with sweet chili dip',         280,  8, false),
  ((select id from public.categories where name = 'Appetizers'), 'Mozzarella Sticks', 'Crispy breaded mozzarella with marinara',            300,  8, false),

  ((select id from public.categories where name = 'Salads'), 'Caesar Salad',          'Romaine, parmesan, croutons, classic Caesar',      280,  8, false),
  ((select id from public.categories where name = 'Salads'), 'Greek Salad',           'Tomato, cucumber, olives, feta, oregano',           290,  8, false),
  ((select id from public.categories where name = 'Salads'), 'Cobb Salad',            'Mixed greens, bacon, egg, blue cheese',             320, 10, false),

  ((select id from public.categories where name = 'Main Course'), 'Grilled Salmon',   'Atlantic salmon with lemon butter sauce',           650, 20, false),
  ((select id from public.categories where name = 'Main Course'), 'Beef Tenderloin',  'Premium beef with red wine reduction',              850, 25, false),
  ((select id from public.categories where name = 'Main Course'), 'Chicken Marsala',  'Pan-seared chicken in marsala wine sauce',          520, 18, false),
  ((select id from public.categories where name = 'Main Course'), 'Pork Ribs',        'Slow-braised pork ribs with BBQ glaze',             580, 22, false),

  ((select id from public.categories where name = 'Pasta'), 'Spaghetti Carbonara',  'Classic carbonara with pancetta and egg',           450, 15, false),
  ((select id from public.categories where name = 'Pasta'), 'Penne Arrabbiata',    'Spicy tomato sauce with chili and garlic',          420, 12, false),
  ((select id from public.categories where name = 'Pasta'), 'Fettuccine Alfredo',  'Creamy parmesan sauce with fettuccine',             460, 14, false),
  ((select id from public.categories where name = 'Pasta'), 'Lasagna Bolognese',   'Layered pasta with rich meat sauce',                490, 18, false),

  ((select id from public.categories where name = 'Desserts'), 'Tiramisu',         'Classic Italian coffee-flavored dessert',           280,  5, false),
  ((select id from public.categories where name = 'Desserts'), 'Chocolate Lava',    'Warm chocolate cake with molten center',            320,  8, false),
  ((select id from public.categories where name = 'Desserts'), 'Cheesecake',        'New York style with berry compote',                 260,  5, false),

  ((select id from public.categories where name = 'Coffee'), 'Espresso',            'Single shot of premium espresso',                   120,  3, false),
  ((select id from public.categories where name = 'Coffee'), 'Cappuccino',          'Espresso with steamed milk foam',                   160,  4, false),
  ((select id from public.categories where name = 'Coffee'), 'Latte',               'Espresso with steamed milk',                        160,  4, false),
  ((select id from public.categories where name = 'Coffee'), 'Americano',           'Espresso with hot water',                           140,  3, false),

  ((select id from public.categories where name = 'Drinks'), 'Iced Tea',            'House-brewed iced tea',                             100,  2, false),
  ((select id from public.categories where name = 'Drinks'), 'Fresh Lemonade',      'Fresh-squeezed lemonade',                           120,  3, false),
  ((select id from public.categories where name = 'Drinks'), 'Sparkling Water',     'Premium sparkling water',                           100,  1, false),

  ((select id from public.categories where name = 'Cocktails'), 'Margarita',        'Tequila, lime, triple sec, salt rim',                280,  5, true),
  ((select id from public.categories where name = 'Cocktails'), 'Mojito',           'White rum, mint, lime, soda',                        280,  5, true),
  ((select id from public.categories where name = 'Cocktails'), 'Old Fashioned',     'Bourbon, bitters, orange, cherry',                   320,  5, true),
  ((select id from public.categories where name = 'Cocktails'), 'Negroni',          'Gin, campari, sweet vermouth',                       320,  5, true),

  ((select id from public.categories where name = 'Wine'), 'House Red',            'Glass of house red wine',                           250,  2, true),
  ((select id from public.categories where name = 'Wine'), 'House White',          'Glass of house white wine',                         250,  2, true),
  ((select id from public.categories where name = 'Wine'), 'Prosecco',             'Italian sparkling wine',                            380,  2, true),

  ((select id from public.categories where name = 'Beer'), 'San Miguel Pale',      'Local pale ale',                                    180,  2, true),
  ((select id from public.categories where name = 'Beer'), 'Heineken',             'Imported lager',                                    220,  2, true),
  ((select id from public.categories where name = 'Beer'), 'Craft IPA',            'Local craft IPA',                                   280,  2, true);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.payments;

-- ============================================================
-- Done. The system is now ready.
-- ============================================================

-- ============================================================
-- TROUBLESHOOTING SNIPPETS (run manually as needed)
-- ============================================================

-- Promote an existing user to admin role.
-- Replace 'admin@lumiere.app' with the email you actually signed up with.
-- update public.profiles
--   set role = 'admin', is_active = true, updated_at = now()
--   where email = 'admin@lumiere.app';

-- Backfill profiles for any auth user that is missing one.
-- (Useful if users were created before the handle_new_user() trigger was
-- installed, or in the Supabase dashboard without the trigger firing.)
-- insert into public.profiles (id, email, full_name, role, is_active)
-- select
--   u.id,
--   u.email,
--   coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
--   case
--     when coalesce(u.raw_user_meta_data->>'role','') in ('admin','pos','waiter')
--       then u.raw_user_meta_data->>'role'
--     else 'waiter'
--   end,
--   true
-- from auth.users u
-- where not exists (select 1 from public.profiles p where p.id = u.id)
-- on conflict (id) do nothing;
