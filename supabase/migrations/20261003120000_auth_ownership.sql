-- Phase 4: account ownership (Supabase Auth). Guests are anonymous auth users;
-- permanent accounts keep the same user id after converting from guest.

alter table public.game_sessions  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.game_rounds    add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.agent_memories add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.final_results  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists game_sessions_user_active_idx on public.game_sessions(user_id, status, updated_at desc);
create index if not exists game_rounds_user_idx on public.game_rounds(user_id);
create index if not exists agent_memories_user_idx on public.agent_memories(user_id);

-- Owner-only read access for signed-in users (anonymous guests also use the
-- `authenticated` role, so ownership — not role — is what gates access).
-- All writes still go through the server with the service-role key; there are
-- deliberately NO insert/update/delete policies for anon/authenticated.
drop policy if exists "owner reads sessions" on public.game_sessions;
create policy "owner reads sessions" on public.game_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "owner reads rounds" on public.game_rounds;
create policy "owner reads rounds" on public.game_rounds
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "owner reads memories" on public.agent_memories;
create policy "owner reads memories" on public.agent_memories
  for select to authenticated using ((select auth.uid()) = user_id);

-- final_results stays publicly readable: it powers the global Humans vs Claude record
-- (leaderboard view + Realtime INSERT feed). It contains only scores/café stats and an
-- opaque owner uuid — no email or game state — so no private data is exposed.
