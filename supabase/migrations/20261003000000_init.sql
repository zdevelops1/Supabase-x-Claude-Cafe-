-- Supabase x Claude Café — schema
-- All writes happen server-side with the service-role key (RLS blocks anon writes).
-- final_results is publicly readable so the title screen can show a live
-- Human vs. Agent leaderboard via Supabase Realtime.

create extension if not exists "pgcrypto";

create table if not exists public.game_sessions (
  id            uuid primary key default gen_random_uuid(),
  difficulty    text not null check (difficulty in ('easy','medium','hard')),
  status        text not null default 'playing' check (status in ('playing','finished')),
  round_index   int  not null default 0,
  state         jsonb not null default '{}'::jsonb,   -- full engine state snapshot (both cafés)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One row per resolved round: the shared event + both decisions + both outcomes.
create table if not exists public.game_rounds (
  id              bigserial primary key,
  session_id      uuid not null references public.game_sessions(id) on delete cascade,
  round_index     int  not null,
  day             int  not null,
  slot            text not null,
  event_id        text not null,
  event_title     text not null,
  total_demand    int  not null,
  player_action   text not null,
  claude_action   text not null,
  claude_reason   text,
  claude_source   text not null check (claude_source in ('claude','fallback')),
  claude_model    text,
  claude_latency_ms int,
  player_result   jsonb not null,
  claude_result   jsonb not null,
  created_at      timestamptz not null default now(),
  unique (session_id, round_index)
);

-- Claude's persistent agent memory: decisions + self-written strategy notes.
create table if not exists public.agent_memories (
  id           bigserial primary key,
  session_id   uuid not null references public.game_sessions(id) on delete cascade,
  round_index  int  not null,
  kind         text not null check (kind in ('decision','strategy')),
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists agent_memories_session_idx on public.agent_memories(session_id, round_index);

create table if not exists public.final_results (
  id              bigserial primary key,
  session_id      uuid not null unique references public.game_sessions(id) on delete cascade,
  difficulty      text not null,
  winner          text not null check (winner in ('supabase','claude','tie')),
  player_score    int  not null,
  claude_score    int  not null,
  player_stats    jsonb not null,
  claude_stats    jsonb not null,
  created_at      timestamptz not null default now()
);

-- Row Level Security: lock everything down; only final_results is readable.
alter table public.game_sessions  enable row level security;
alter table public.game_rounds    enable row level security;
alter table public.agent_memories enable row level security;
alter table public.final_results  enable row level security;

drop policy if exists "public read results" on public.final_results;
create policy "public read results" on public.final_results for select using (true);

-- Leaderboard view: Human vs. Agent record per difficulty.
create or replace view public.leaderboard
with (security_invoker = true) as
select difficulty,
       count(*) filter (where winner = 'supabase') as human_wins,
       count(*) filter (where winner = 'claude')   as claude_wins,
       count(*) filter (where winner = 'tie')      as ties,
       max(player_score) as best_human_score,
       max(claude_score) as best_claude_score
from public.final_results
group by difficulty;

-- Realtime: broadcast new final results to the title screen.
do $$
begin
  alter publication supabase_realtime add table public.final_results;
exception when others then null;
end $$;
