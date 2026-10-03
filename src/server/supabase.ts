import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { finalScore, winner } from '../engine/engine';
import type { GameState, RoundRecord } from '../engine/types';

/** Server-only Supabase client (service role). Returns null when not configured. */
let client: SupabaseClient | null | undefined;
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  // Accepts both our names and the ones Vercel's Supabase integration injects.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

type PgErr = { message?: string; code?: string; details?: string; hint?: string } | null | undefined;
const fmt = (where: string, e: PgErr) =>
  `[supabase:${where}] ${e?.message ?? String(e)}${e?.code ? ` (code ${e.code})` : ''}${e?.hint ? ` — hint: ${e.hint}` : ''}`;

export class PersistError extends Error {}
export class AuthError extends Error {
  constructor(msg: string, public status = 401) { super(msg); }
}

export interface AuthUser { id: string; isAnonymous: boolean; email: string | null }

/** Verifies a Supabase access token server-side. Returns null when no token was sent. */
export async function verifyUser(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new AuthError(`Invalid or expired session: ${error?.message ?? 'no user'}`);
  const u = data.user as { id: string; email?: string | null; is_anonymous?: boolean };
  return { id: u.id, isAnonymous: !!u.is_anonymous, email: u.email ?? null };
}

/** Ensures the game session belongs to this user (or is an ownerless legacy session when no user). */
export async function assertOwner(sessionId: string, user: AuthUser | null) {
  const sb = db();
  if (!sb) return;
  const { data, error } = await sb.from('game_sessions').select('user_id').eq('id', sessionId).maybeSingle();
  if (error) throw new PersistError(fmt('game_sessions.owner', error));
  if (!data) throw new AuthError('Game session not found', 404);
  const owner = (data as { user_id: string | null }).user_id;
  if (owner !== (user?.id ?? null)) throw new AuthError('This game belongs to a different player', 403);
}

/** Latest unfinished game for this user (authoritative copy from the database). */
export async function activeGame(userId: string) {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb
    .from('game_sessions')
    .select('state')
    .eq('user_id', userId)
    .eq('status', 'playing')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new PersistError(fmt('game_sessions.active', error));
  return (data as { state: GameState } | null)?.state ?? null;
}

const TABLES = ['game_sessions', 'game_rounds', 'agent_memories', 'final_results', 'leaderboard'] as const;

/** Verifies every table/view from the migration exists and is reachable with the service key. */
export async function schemaCheck() {
  const sb = db();
  if (!sb) return { configured: false, ok: false, tables: {} as Record<string, string> };
  const tables: Record<string, string> = {};
  await Promise.all(
    TABLES.map(async (t) => {
      const { error } = await sb.from(t).select('*', { head: true, count: 'exact' });
      tables[t] = error ? fmt(t, error) : 'ok';
    }),
  );
  return { configured: true, ok: Object.values(tables).every((v) => v === 'ok'), tables };
}

/** Throws PersistError with the exact DB error when Supabase is configured but the insert fails. */
export async function createSession(state: GameState, userId: string | null = null): Promise<boolean> {
  const sb = db();
  if (!sb) return false;
  const { error } = await sb.from('game_sessions').insert({ id: state.sessionId, difficulty: state.difficulty, state, user_id: userId });
  if (error) throw new PersistError(fmt('game_sessions.insert', error));
  return true;
}

export async function loadMemories(sessionId: string): Promise<string[]> {
  const sb = db();
  if (!sb) throw new PersistError('Supabase not configured');
  const { data, error } = await sb
    .from('agent_memories')
    .select('round_index, kind, content')
    .eq('session_id', sessionId)
    .eq('kind', 'strategy')
    .order('round_index', { ascending: true });
  if (error) throw new PersistError(fmt('agent_memories.select', error));
  return (data ?? []).map((m) => `Round ${m.round_index + 1}: ${m.content}`);
}

/** Returns a list of exact error strings (empty = everything persisted). */
export async function persistRound(state: GameState, record: RoundRecord, userId: string | null = null): Promise<string[]> {
  const sb = db();
  if (!sb) return ['Supabase not configured on the server'];
  const d = record.claudeDecision;
  const errors: string[] = [];
  const [r1, r2, r3] = await Promise.all([
    sb.from('game_rounds').upsert(
      {
        session_id: state.sessionId,
        user_id: userId,
        round_index: record.index,
        day: record.day,
        slot: record.slot,
        event_id: record.scenarioId,
        event_title: record.scenarioTitle,
        total_demand: record.totalDemand,
        player_action: record.player.actionId,
        claude_action: record.claude.actionId,
        claude_reason: d.reason,
        claude_source: d.source,
        claude_model: d.model ?? null,
        claude_latency_ms: d.latencyMs ?? null,
        player_result: record.player,
        claude_result: record.claude,
      },
      { onConflict: 'session_id,round_index' },
    ),
    sb.from('agent_memories').insert([
      {
        session_id: state.sessionId,
        user_id: userId,
        round_index: record.index,
        kind: 'decision',
        content: `${record.scenarioTitle}: I chose "${record.claude.actionLabel}" (profit $${record.claude.profit}, share ${Math.round(record.claude.share * 100)}%); human chose "${record.player.actionLabel}".`,
      },
      ...(d.strategyNote ? [{ session_id: state.sessionId, user_id: userId, round_index: record.index, kind: 'strategy', content: d.strategyNote }] : []),
    ]),
    sb
      .from('game_sessions')
      .update({ status: state.status, round_index: state.roundIndex, state, updated_at: new Date().toISOString() })
      .eq('id', state.sessionId)
      .select('id'),
  ]);
  if (r1.error) errors.push(fmt('game_rounds.upsert', r1.error));
  if (r2.error) errors.push(fmt('agent_memories.insert', r2.error));
  if (r3.error) errors.push(fmt('game_sessions.update', r3.error));
  else if (!r3.data?.length) errors.push(`[supabase:game_sessions.update] session ${state.sessionId} not found`);

  if (state.status === 'finished') {
    const ps = finalScore(state.cafes.supabase);
    const cs = finalScore(state.cafes.claude);
    const { error } = await sb.from('final_results').upsert(
      {
        session_id: state.sessionId,
        user_id: userId,
        difficulty: state.difficulty,
        winner: winner(state),
        player_score: ps.total,
        claude_score: cs.total,
        player_stats: { ...state.cafes.supabase, score: ps },
        claude_stats: { ...state.cafes.claude, score: cs },
      },
      { onConflict: 'session_id' },
    );
    if (error) errors.push(fmt('final_results.upsert', error));
  }
  errors.forEach((e) => console.error(e));
  return errors;
}

export async function leaderboard() {
  const sb = db();
  if (!sb) return { configured: false, rows: [], recent: [], error: null as string | null };
  const [lb, recent] = await Promise.all([
    sb.from('leaderboard').select('*'),
    sb.from('final_results').select('difficulty, winner, player_score, claude_score, created_at').order('created_at', { ascending: false }).limit(8),
  ]);
  const error = lb.error ? fmt('leaderboard', lb.error) : recent.error ? fmt('final_results.select', recent.error) : null;
  if (error) console.error(error);
  return { configured: true, rows: lb.data ?? [], recent: recent.data ?? [], error };
}

/** Read-back of everything stored for one session. Only exposed when ENABLE_DIAGNOSTICS=1. */
export async function sessionDiagnostics(sessionId: string) {
  const sb = db();
  if (!sb) throw new PersistError('Supabase not configured');
  const [s, r, m, f] = await Promise.all([
    sb.from('game_sessions').select('id, user_id, difficulty, status, round_index, created_at, updated_at').eq('id', sessionId).maybeSingle(),
    sb.from('game_rounds').select('round_index, user_id, event_id, player_action, claude_action, claude_source, claude_model, claude_reason, claude_latency_ms').eq('session_id', sessionId).order('round_index'),
    sb.from('agent_memories').select('round_index, user_id, kind, content').eq('session_id', sessionId).order('round_index'),
    sb.from('final_results').select('winner, user_id, player_score, claude_score, difficulty').eq('session_id', sessionId).maybeSingle(),
  ]);
  const errs = [s.error && fmt('game_sessions', s.error), r.error && fmt('game_rounds', r.error), m.error && fmt('agent_memories', m.error), f.error && fmt('final_results', f.error)].filter(Boolean);
  return {
    errors: errs,
    session: s.data,
    rounds: r.data ?? [],
    memories: {
      decision: (m.data ?? []).filter((x) => x.kind === 'decision').length,
      strategy: (m.data ?? []).filter((x) => x.kind === 'strategy'),
    },
    final: f.data,
  };
}
