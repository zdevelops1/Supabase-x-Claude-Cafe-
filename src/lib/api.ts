import type { Difficulty, GameState, RoundRecord } from '../engine/types';

/** Claude's move as the browser sees it before the reveal: an opaque encrypted token + public metadata. */
export interface SealedDecision {
  sealed: string;
  roundIndex: number;
  meta: { source: 'claude' | 'fallback'; model?: string; latencyMs?: number; error?: string };
  memory: { source: 'supabase' | 'local'; count: number };
}
export interface Health {
  anthropic: boolean;
  model: string;
  fallbackAllowed: boolean;
  supabase: boolean;
  schema: { configured: boolean; ok: boolean; tables: Record<string, string> };
  diagnostics: boolean;
}

async function post<T>(route: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  health: () => fetch('/api/health').then((r) => r.json()) as Promise<Health>,
  createSession: (difficulty: Difficulty) => post<{ state: GameState }>('session', { difficulty }),
  agent: (state: GameState) => post<SealedDecision>('agent', { state }),
  resolve: (state: GameState, playerActionId: string, sealed: string) =>
    post<{ state: GameState; record: RoundRecord; persistErrors: string[] }>('resolve', { state, playerActionId, sealed }),
  leaderboard: () =>
    fetch('/api/leaderboard').then((r) => r.json()) as Promise<{
      configured: boolean;
      rows: Array<{ difficulty: string; human_wins: number; claude_wins: number; ties: number }>;
      recent: Array<{ difficulty: string; winner: string; player_score: number; claude_score: number; created_at: string }>;
      error: string | null;
    }>,
};
