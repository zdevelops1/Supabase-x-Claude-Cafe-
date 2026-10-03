import { createInitialState, currentScenario, InvalidActionError, resolveRound } from '../engine/engine';
import { SCENARIOS } from '../engine/scenarios';
import type { ClaudeDecision, Difficulty, GameState } from '../engine/types';
import { decideClaude } from './agent';
import { createSession, db, leaderboard, loadMemories, persistRound } from './supabase';

type Out = { status: number; body: unknown };
const ok = (body: unknown): Out => ({ status: 200, body });
const bad = (msg: string, status = 400): Out => ({ status, body: { error: msg } });

function isState(s: unknown): s is GameState {
  const g = s as GameState;
  return !!g && g.version === 1 && typeof g.sessionId === 'string' && !!g.cafes?.supabase && !!g.cafes?.claude && Array.isArray(g.history);
}

/** Strategy notes from the client-side history, used when Supabase isn't configured. */
function localMemories(state: GameState) {
  return state.history
    .filter((h) => h.claudeDecision.strategyNote)
    .map((h) => `Round ${h.index + 1}: ${h.claudeDecision.strategyNote}`);
}

export async function handleRoute(route: string, method: string, body: any): Promise<Out> {
  switch (route) {
    case 'health':
      return ok({ anthropic: !!process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', supabase: !!db() });

    case 'session': {
      if (method !== 'POST') return bad('POST only', 405);
      const difficulty = body?.difficulty as Difficulty;
      if (!['easy', 'medium', 'hard'].includes(difficulty)) return bad('Invalid difficulty');
      const state = createInitialState(crypto.randomUUID(), difficulty);
      state.persisted = await createSession(state);
      return ok({ state });
    }

    // Claude decides — sealed until the human commits.
    case 'agent': {
      if (method !== 'POST') return bad('POST only', 405);
      const state = body?.state;
      if (!isState(state)) return bad('Invalid state');
      const scenario = currentScenario(state);
      if (!scenario || state.status !== 'playing') return bad('Game is over');
      const memories = (state.persisted && (await loadMemories(state.sessionId))) || localMemories(state);
      const decision = await decideClaude(state, scenario, memories);
      return ok({ decision, roundIndex: state.roundIndex });
    }

    // Neutral referee: validate both actions, run the deterministic engine, persist.
    case 'resolve': {
      if (method !== 'POST') return bad('POST only', 405);
      const { state, playerActionId, decision } = body ?? {};
      if (!isState(state)) return bad('Invalid state');
      const d = decision as ClaudeDecision;
      if (!d || typeof d.actionId !== 'string') return bad('Missing Claude decision');
      const safe: ClaudeDecision = {
        actionId: d.actionId,
        reason: String(d.reason ?? '').slice(0, 220),
        strategyNote: d.strategyNote ? String(d.strategyNote).slice(0, 400) : undefined,
        source: d.source === 'claude' ? 'claude' : 'fallback',
        model: d.model,
        latencyMs: d.latencyMs,
        error: d.error,
      };
      try {
        const out = resolveRound(state, String(playerActionId), safe);
        if (state.persisted) await persistRound(out.state, out.record);
        return ok(out);
      } catch (err) {
        if (err instanceof InvalidActionError) return bad(err.message);
        throw err;
      }
    }

    case 'leaderboard':
      return ok(await leaderboard());

    case 'scenarios':
      return ok({ count: SCENARIOS.length });

    default:
      return bad(`Unknown route ${route}`, 404);
  }
}
