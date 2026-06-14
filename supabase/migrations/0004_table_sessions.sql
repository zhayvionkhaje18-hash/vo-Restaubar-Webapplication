-- ============================================================
-- TABLE SESSIONS — security for shared table ordering
-- ============================================================
-- Each table can have ONE active session at a time.
-- The session owner sets an access code (4-digit PIN).
-- Other customers must enter the same PIN to join the session.
-- Session is only reset by POS (Process Payment) or Admin (Close Table / Cancel).

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete cascade,
  customer_name text not null,                 -- session owner name
  access_code text not null,                   -- 4-digit PIN to join
  token text not null unique                   -- session token (used by customers in localStorage)
    default (encode(gen_random_bytes(24), 'hex')),
  status text not null default 'active'
    check (status in ('active', 'closed')),
  closed_reason text                           -- 'paid' | 'cancelled' | 'manual'
    check (closed_reason in ('paid', 'cancelled', 'manual') or closed_reason is null),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One active session per table at any time
create unique index uniq_active_session_per_table
  on public.table_sessions (table_id)
  where status = 'active';

create index idx_table_sessions_table on public.table_sessions(table_id);
create index idx_table_sessions_token on public.table_sessions(token);
create index idx_table_sessions_status on public.table_sessions(status);

-- Add session_id FK on orders
alter table public.orders
  add column if not exists session_id uuid references public.table_sessions(id) on delete set null;

create index idx_orders_session on public.orders(session_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.table_sessions enable row level security;

-- Anyone can read session metadata (customer_name, status) — needed to render access modal
create policy "table_sessions_public_read"
  on public.table_sessions for select
  using (true);

-- Anyone can create a session (validated by app code via access_code uniqueness check)
create policy "table_sessions_public_insert"
  on public.table_sessions for insert
  with check (status = 'active');

-- Customers can only update via server action (no direct update policy)
-- Staff can update (close session)
create policy "table_sessions_staff_update"
  on public.table_sessions for update
  using (is_staff());

create policy "table_sessions_staff_delete"
  on public.table_sessions for delete
  using (is_staff());
