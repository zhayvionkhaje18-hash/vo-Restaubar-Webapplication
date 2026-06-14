-- ============================================================
-- GAME SCORES — leaderboard for in-restaurant mini games
-- ============================================================
-- Customers play while waiting. Anonymous submission + read.
-- Future: add game_events for tournaments / competitions.

create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game_type text not null default 'flappy_bird',
  score int not null check (score >= 0),
  customer_name text,                       -- optional display name
  table_id uuid references public.tables(id) on delete set null,
  session_id uuid references public.table_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_game_scores_game on public.game_scores(game_type);
create index idx_game_scores_table on public.game_scores(table_id);
create index idx_game_scores_session on public.game_scores(session_id);
create index idx_game_scores_score_desc on public.game_scores(game_type, score desc);
create index idx_game_scores_created_desc on public.game_scores(game_type, created_at desc);

alter table public.game_scores enable row level security;

-- Anyone (including anon) can read scores for leaderboards
create policy "game_scores_public_read"
  on public.game_scores for select using (true);

-- Anyone can submit a score (validated in app: score must be > 0, game_type known)
create policy "game_scores_public_insert"
  on public.game_scores for insert with check (score >= 0);

-- Only admin can delete (cleanup / moderation)
create policy "game_scores_admin_delete"
  on public.game_scores for delete using (is_admin());
