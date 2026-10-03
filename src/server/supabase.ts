import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { finalScore, winner } from '../engine/engine';
import type { GameState, RoundRecord } from '../engine/types';

/** Server-only Supabase client (service role). Returns null when not configured → game still works. */
let client: SupabaseClient | null | undefined;
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

const warn = (where: string, error: unknown) => error && console.warn(`[supabase:${where}]`, (error as { message?: string }).message ?? error);

export async function createSession(state: GameState): Promise<boolean> {
  const sb = db();
  if (!sb) return false;
  const { error } = await sb.from('game_sessions').insert({ id: state.sessionId, difficulty: state.difficulty, state });
  warn('createSession', error);
  return !error;
}

export async function loadMemories(sessionId: string): Promise<string[] | null> {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb
    .from('agent_memories')
    .select('round_index, kind, content')
    .eq('session_id', sessionId)
    .eq('kind', 'strategy')
    .order('round_index', { ascending: true });
  if (error) {
    warn('loadMemories', error);
    return null;
  }
  return (data ?? []).map((m) => `Round ${m.round_index + 1}: ${m.content}`);
}

export async function persistRound(state: GameState, record: RoundRecord): Promise<boolean> {
  const sb = db();
  if (!sb) return false;
  const d = record.claudeDecision;
  const [r1, r2, r3] = await Promise.all([
    sb.from('game_rounds').upsert(
      {
        session_id: state.sessionId,
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
    sb.from('agent_memories').insert(
      [
        {
          session_id: state.sessionId,
          round_index: record.index,
          kind: 'decision',
          content: `${record.scenarioTitle}: I chose "${record.claude.actionLabel}" (profit $${record.claude.profit}, share ${Math.round(record.claude.share * 100)}%); human chose "${record.player.actionLabel}".`,
        },
        ...(d.strategyNote ? [{ session_id: state.sessionId, round_index: record.index, kind: 'strategy', content: d.strategyNote }] : []),
      ],
    ),
    sb
      .from('game_sessions')
      .upsert({ id: state.sessionId, difficulty: state.difficulty, status: state.status, round_index: state.roundIndex, state, updated_at: new Date().toISOString() }),
  ]);
  warn('round', r1.error);
  warn('memory', r2.error);
  warn('session', r3.error);

  if (state.status === 'finished') {
    const ps = finalScore(state.cafes.supabase);
    const cs = finalScore(state.cafes.claude);
    const { error } = await sb.from('final_results').upsert(
      {
        session_id: state.sessionId,
        difficulty: state.difficulty,
        winner: winner(state),
        player_score: ps.total,
        claude_score: cs.total,
        player_stats: { ...state.cafes.supabase, score: ps },
        claude_stats: { ...state.cafes.claude, score: cs },
      },
      { onConflict: 'session_id' },
    );
    warn('final', error);
  }
  return !r1.error;
}

export async function leaderboard() {
  const sb = db();
  if (!sb) return { configured: false, rows: [], recent: [] };
  const [lb, recent] = await Promise.all([
    sb.from('leaderboard').select('*'),
    sb.from('final_results').select('difficulty, winner, player_score, claude_score, created_at').order('created_at', { ascending: false }).limit(8),
  ]);
  warn('leaderboard', lb.error);
  return { configured: true, rows: lb.data ?? [], recent: recent.data ?? [] };
}
