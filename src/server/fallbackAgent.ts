import { simulateRound, RULES } from '../engine/engine';
import type { ActionOption, ClaudeDecision, GameState, Scenario } from '../engine/types';

/**
 * Offline fallback strategist — used ONLY when no ANTHROPIC_API_KEY is configured
 * or the model call fails. Clearly labeled as "fallback" in the UI so the demo
 * never pretends a heuristic is the LLM.
 *
 * It does one-step lookahead with the real engine, averaged over every possible
 * rival response (robust against an unknown opponent).
 */
export function fallbackDecision(state: GameState, scenario: Scenario, error?: string): ClaudeDecision {
  const value = (a: ActionOption) => {
    let total = 0;
    for (const opp of scenario.actions) {
      const out = simulateRound(state.cafes, scenario, state.roundIndex, opp, a);
      const r = out.claude;
      const quality = out.cafes.claude.quality - state.cafes.claude.quality;
      const roundsLeft = 12 - state.roundIndex - 1;
      const v =
        state.difficulty === 'easy'
          ? r.profit
          : r.profit +
            r.repDelta * RULES.score.reputation * (state.difficulty === 'hard' ? 1.4 : 1) +
            r.satDelta * RULES.score.satisfaction +
            quality * 6 * roundsLeft * 0.4;
      total += v;
    }
    return total / scenario.actions.length;
  };
  const ranked = [...scenario.actions].sort((a, b) => value(b) - value(a));
  const best = ranked[0];
  return {
    actionId: best.id,
    reason: `Offline strategy: "${best.label}" had the best expected outcome in my lookahead.`,
    source: 'fallback',
    error,
  };
}
