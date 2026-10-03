import { createInitialState, currentScenario, InvalidActionError, resolveRound } from '../engine/engine';
import { SCENARIOS } from '../engine/scenarios';
import type { Difficulty, GameState } from '../engine/types';
import { AgentError, decideClaude, fallbackAllowed } from './agent';
import { seal, unseal } from './seal';
import { createSession, db, leaderboard, loadMemories, PersistError, persistRound, schemaCheck, sessionDiagnostics } from './supabase';

type Out = { status: number; body: unknown };
const ok = (body: unknown): Out => ({ status: 200, body });
const bad = (msg: string, status = 400, extra: Record<string, unknown> = {}): Out => ({ status, body: { error: msg, ...extra } });

function isState(s: unknown): s is GameState {
  const g = s as GameState;
  return !!g && g.version === 1 && typeof g.sessionId === 'string' && !!g.cafes?.supabase && !!g.cafes?.claude && Array.isArray(g.history);
}

/** Strategy notes from the client-side history — used ONLY when Supabase isn't configured at all. */
function localMemories(state: GameState) {
  return state.history
    .filter((h) => h.claudeDecision.strategyNote)
    .map((h) => `Round ${h.index + 1}: ${h.claudeDecision.strategyNote}`);
}

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export async function handleRoute(route: string, method: string, body: any): Promise<Out> {
  try {
    return await route_(route, method, body);
  } catch (err) {
    if (err instanceof AgentError) return bad(`Live Claude agent failed: ${err.message}`, 502, { kind: 'agent' });
    if (err instanceof PersistError) return bad(err.message, 502, { kind: 'supabase' });
    throw err;
  }
}

async function route_(route: string, method: string, body: any): Promise<Out> {
  switch (route) {
    case 'health': {
      const schema = await schemaCheck();
      return ok({
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        model: MODEL(),
        fallbackAllowed: fallbackAllowed(),
        supabase: !!db(),
        schema,
        diagnostics: process.env.ENABLE_DIAGNOSTICS === '1',
      });
    }

    case 'session': {
      if (method !== 'POST') return bad('POST only', 405);
      const difficulty = body?.difficulty as Difficulty;
      if (!['easy', 'medium', 'hard'].includes(difficulty)) return bad('Invalid difficulty');
      const state = createInitialState(crypto.randomUUID(), difficulty);
      state.persisted = await createSession(state); // throws PersistError with exact DB error
      return ok({ state });
    }

    // Claude decides — and the decision is SEALED (encrypted) before it leaves the server.
    case 'agent': {
      if (method !== 'POST') return bad('POST only', 405);
      const state = body?.state;
      if (!isState(state)) return bad('Invalid state');
      const scenario = currentScenario(state);
      if (!scenario || state.status !== 'playing') return bad('Game is over');
      if (db() && !state.persisted) return bad('This game was started without Supabase persistence. Start a new game.', 409, { kind: 'supabase' });
      const memorySource = db() ? 'supabase' : 'local';
      const memories = db() ? await loadMemories(state.sessionId) : localMemories(state);
      const decision = await decideClaude(state, scenario, memories);
      const sealed = seal({ sessionId: state.sessionId, roundIndex: state.roundIndex, decision });
      return ok({
        sealed,
        roundIndex: state.roundIndex,
        meta: { source: decision.source, model: decision.model, latencyMs: decision.latencyMs, error: decision.error },
        memory: { source: memorySource, count: memories.length },
      });
    }

    // Neutral referee: unseal Claude's move, validate both actions, run the engine, persist.
    case 'resolve': {
      if (method !== 'POST') return bad('POST only', 405);
      const { state, playerActionId, sealed } = body ?? {};
      if (!isState(state)) return bad('Invalid state');
      let payload;
      try {
        payload = unseal(String(sealed ?? ''));
      } catch {
        return bad('Sealed Claude decision is missing or was tampered with');
      }
      if (payload.sessionId !== state.sessionId || payload.roundIndex !== state.roundIndex) return bad('Sealed decision does not match this round');
      try {
        const out = resolveRound(state, String(playerActionId), payload.decision);
        const persistErrors = state.persisted ? await persistRound(out.state, out.record) : db() ? ['Game not persisted'] : [];
        return ok({ ...out, persistErrors });
      } catch (err) {
        if (err instanceof InvalidActionError) return bad(err.message);
        throw err;
      }
    }

    // Public (non-secret) browser config: Supabase URL + anon key for the Realtime leaderboard.
    case 'config': {
      const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null;
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null;
      return ok({ supabaseUrl: url, supabaseAnonKey: anonKey });
    }

    case 'leaderboard':
      return ok(await leaderboard());

    // Read-back of a session's stored rows (for verification). Off unless ENABLE_DIAGNOSTICS=1.
    case 'diag': {
      if (process.env.ENABLE_DIAGNOSTICS !== '1') return bad('Diagnostics disabled', 404);
      const id = String(body?.sessionId ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('sessionId required');
      return ok(await sessionDiagnostics(id));
    }

    case 'scenarios':
      return ok({ count: SCENARIOS.length, scenarios: SCENARIOS.map((sc) => ({ id: sc.id, actions: sc.actions.map((a) => a.id) })) });

    default:
      return bad(`Unknown route ${route}`, 404);
  }
}
