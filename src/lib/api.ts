import type { ClaudeDecision, Difficulty, GameState, RoundRecord } from '../engine/types';

async function post<T>(route: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  health: () => fetch('/api/health').then((r) => r.json()) as Promise<{ anthropic: boolean; model: string; supabase: boolean }>,
  createSession: (difficulty: Difficulty) => post<{ state: GameState }>('session', { difficulty }),
  agent: (state: GameState) => post<{ decision: ClaudeDecision; roundIndex: number }>('agent', { state }),
  resolve: (state: GameState, playerActionId: string, decision: ClaudeDecision) =>
    post<{ state: GameState; record: RoundRecord }>('resolve', { state, playerActionId, decision }),
  leaderboard: () =>
    fetch('/api/leaderboard').then((r) => r.json()) as Promise<{
      configured: boolean;
      rows: Array<{ difficulty: string; human_wins: number; claude_wins: number; ties: number }>;
      recent: Array<{ difficulty: string; winner: string; player_score: number; claude_score: number; created_at: string }>;
    }>,
};
