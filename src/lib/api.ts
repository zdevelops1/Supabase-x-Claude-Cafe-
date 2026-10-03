import type { Difficulty, GameState, RoundRecord } from '../engine/types';
import { accessToken } from './auth';

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

async function headers(json = true): Promise<Record<string, string>> {
  const h: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
  const t = await accessToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function post<T>(route: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${route}`, { method: 'POST', headers: await headers(), body: JSON.stringify(body) });
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
  me: async () => {
    const res = await fetch('/api/me', { headers: await headers(false) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data as { user: { id: string; isAnonymous: boolean; email: string | null } | null; active: GameState | null };
  },
  leaderboard: () =>
    fetch('/api/leaderboard').then((r) => r.json()) as Promise<{
      configured: boolean;
      rows: Array<{ difficulty: string; human_wins: number; claude_wins: number; ties: number }>;
      recent: Array<{ difficulty: string; winner: string; player_score: number; claude_score: number; created_at: string }>;
      error: string | null;
    }>,
};
