/**
 * Balance check: plays fixed player strategies against the offline strategist
 * and prints per-round action outcomes. Run: npm run sim
 */
import { createInitialState, currentScenario, finalScore, resolveRound, simulateRound } from '../src/engine/engine';
import { SCENARIOS } from '../src/engine/scenarios';
import { fallbackDecision } from '../src/server/fallbackAgent';
import type { Difficulty } from '../src/engine/types';

function play(strategy: (i: number) => number, diff: Difficulty) {
  let s = createInitialState('sim', diff);
  while (s.status === 'playing') {
    const sc = currentScenario(s)!;
    const d = fallbackDecision(s, sc);
    s = resolveRound(s, sc.actions[strategy(s.roundIndex)].id, d).state;
  }
  return s;
}

const strategies: Record<string, (i: number) => number> = {
  allA: () => 0,
  allB: () => 1,
  allC: () => 2,
  allD: () => 3,
};
for (const diff of ['easy', 'hard'] as Difficulty[]) {
  for (const [name, f] of Object.entries(strategies)) {
    const s = play(f, diff);
    const p = finalScore(s.cafes.supabase);
    const c = finalScore(s.cafes.claude);
    console.log(
      `${diff.padEnd(6)} ${name.padEnd(5)} player=${p.total} (cash ${p.cash}, rep ${s.cafes.supabase.reputation.toFixed(0)}) claude=${c.total} (cash ${c.cash}, rep ${s.cafes.claude.reputation.toFixed(0)}) claudePicks=${s.history.map((h) => h.claude.actionId.slice(0, 10)).join(',')}`,
    );
  }
}

// Per-scenario: value of each action vs each opponent action from a neutral start
console.log('\nPer-scenario (from fresh start) — profit+rep*30+sat*15 for each action, averaged over rival actions:');
const base = createInitialState('x', 'hard');
for (let i = 0; i < SCENARIOS.length; i++) {
  const sc = SCENARIOS[i];
  const row = sc.actions.map((a) => {
    let t = 0;
    for (const o of sc.actions) {
      const out = simulateRound(base.cafes, sc, i, a, o);
      t += out.player.profit + out.player.repDelta * 30 + out.player.satDelta * 15;
    }
    return `${a.key}:${Math.round(t / 4)}`;
  });
  console.log(sc.id.padEnd(18), row.join('  '));
}
