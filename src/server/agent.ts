import { describeEffect, finalScore, RULES } from '../engine/engine';
import { TOTAL_ROUNDS } from '../engine/scenarios';
import type { CafeState, ClaudeDecision, GameState, RoundRecord, Scenario } from '../engine/types';
import { fallbackDecision } from './fallbackAgent';

/**
 * CLAUDE AGENT — server-side only. Receives structured game state (scoped by
 * difficulty), returns ONE allowed actionId via a forced tool call. The engine,
 * not the model, decides the consequences.
 */

const DEFAULT_MODEL = 'claude-sonnet-5-5';

const pct = (x: number) => `${Math.round(x * 100)}%`;

function cafeBasic(c: CafeState) {
  return { cash: c.cash, inventory: c.inventory, reputation: Math.round(c.reputation) };
}

function cafeFull(c: CafeState) {
  return {
    cash: c.cash,
    inventory: c.inventory,
    reputation: Math.round(c.reputation),
    customerSatisfaction: Math.round(c.satisfaction),
    quality: Math.round(c.quality),
    staff: c.staff,
    staffCapacityPerRound: c.staff * RULES.capacityPerStaff,
    priceMultiplier: c.price,
    avgTicket: `$${(RULES.ticket * c.price).toFixed(2)}`,
    permanentAppeal: c.appeal,
    ingredientCostMultiplier: c.unitCostMult,
    totals: c.totals,
  };
}

function compactRound(h: RoundRecord, includePlayer: boolean) {
  const mine = {
    action: h.claude.actionLabel,
    customers: h.claude.customers,
    turnedAway: h.claude.turnedAway,
    marketShare: pct(h.claude.share),
    profit: h.claude.profit,
    repChange: h.claude.repDelta,
  };
  const base: Record<string, unknown> = { round: h.index + 1, day: h.day, event: h.scenarioTitle, marketDemand: h.totalDemand, claudeCafe: mine };
  if (includePlayer) {
    base.supabaseCafe = {
      action: h.player.actionLabel,
      customers: h.player.customers,
      turnedAway: h.player.turnedAway,
      marketShare: pct(h.player.share),
      profit: h.player.profit,
      repChange: h.player.repDelta,
    };
  }
  return base;
}

/** Derive the human player's tendencies for Hard mode. */
function playerProfile(state: GameState) {
  const h = state.history;
  if (!h.length) return { note: 'No rounds played yet.' };
  const p = state.cafes.supabase;
  const c = state.cafes.claude;
  const labels = h.map((r) => r.player.actionLabel.toLowerCase());
  const count = (re: RegExp) => labels.filter((l) => re.test(l)).length;
  const tendencies = {
    pricingMoves: count(/price|margin|surge/),
    discountMoves: count(/discount|bogo|combo|special|appreciation/),
    staffingMoves: count(/staff|barista|hire|crew/),
    marketingMoves: count(/ad|post|sample|gala|stall|influencer|vip/),
    passiveMoves: count(/unchanged|steady|usual|wing|push through|ignore|like anyone/),
  };
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (p.reputation > c.reputation + 3) strengths.push('higher reputation than you'); else if (p.reputation < c.reputation - 3) weaknesses.push('lower reputation than you');
  if (p.cash > c.cash + 200) strengths.push('more cash than you'); else if (p.cash < c.cash - 200) weaknesses.push('less cash than you');
  if (p.price < c.price) strengths.push('cheaper menu (wins price-sensitive customers)'); else if (p.price > c.price) weaknesses.push('pricier menu');
  if (p.quality > c.quality + 2) strengths.push('higher quality'); else if (p.quality < c.quality - 2) weaknesses.push('lower quality');
  if (p.totals.turnedAway > c.totals.turnedAway + 20) weaknesses.push('frequently understaffed — turns customers away');
  if (p.staff > c.staff) strengths.push('more staff capacity');
  return { tendencies, strengths, weaknesses, lastThreeActions: h.slice(-3).map((r) => r.player.actionLabel) };
}

function mechanicsBrief(level: 'medium' | 'hard') {
  const brief = [
    `Both cafés share one neighborhood. Each round ~${RULES.baseDemand} × event-demand customers choose between the two cafés.`,
    'Customers prefer higher reputation, satisfaction, quality, appeal, buzz and discounts, and avoid higher prices.',
    `Each staff member serves ${RULES.capacityPerStaff} customers per round; customers beyond capacity or inventory walk out, hurting satisfaction and reputation.`,
    `Average ticket is $${RULES.ticket} × price multiplier × (1 − discount). Rent $${RULES.rent}/round, staff $${RULES.wage}/round, temp staff $${RULES.tempWage}/round.`,
    `Inventory restocks to ${RULES.inventoryPar} units at the start of each day at $${RULES.unitCost}/unit × ingredient multiplier.`,
  ];
  if (level === 'hard') {
    brief.push(
      'Market share is a logit over each café\'s attraction score, so even small advantages compound. Marketing "reach" both steals share and grows total demand.',
      'Permanent upgrades (quality, appeal, staff, price changes) keep paying off — or costing you — every remaining round.',
    );
  }
  return brief;
}

export function buildAgentContext(state: GameState, scenario: Scenario, memories: string[]) {
  const d = state.difficulty;
  const me = state.cafes.claude;
  const rival = state.cafes.supabase;
  const availableActions = scenario.actions.map((a) => ({
    actionId: a.id,
    option: a.key,
    label: a.label,
    description: a.description,
    effects: describeEffect(a.effect),
  }));
  const event = {
    title: scenario.title,
    timeOfDay: scenario.slot,
    description: scenario.description,
    marketDemand: `${Math.round(scenario.demand * 100)}% of normal`,
    affectsBothCafes: scenario.baseline ? describeEffect(scenario.baseline) : [],
  };
  const ctx: Record<string, unknown> = {
    day: scenario.day,
    round: (state.roundIndex % 3) + 1,
    overallRound: `${state.roundIndex + 1} of ${TOTAL_ROUNDS}`,
    difficulty: d,
    event,
  };

  if (d === 'easy') {
    ctx.claudeCafe = cafeBasic(me);
  } else {
    ctx.claudeCafe = cafeFull(me);
    ctx.howTheMarketWorks = mechanicsBrief(d);
  }

  if (d === 'medium') {
    const recent = state.history.slice(-3);
    ctx.yourRecentDecisions = recent.map((h) => compactRound(h, false));
    ctx.recentMarketConditions = recent.map((h) => ({ event: h.scenarioTitle, demand: h.totalDemand }));
    if (memories.length) ctx.yourStrategyNotes = memories.slice(-3);
  }

  if (d === 'hard') {
    ctx.supabaseCafe_humanRival = cafeFull(rival);
    ctx.fullHistory = state.history.map((h) => compactRound(h, true));
    ctx.humanPlayerProfile = playerProfile(state);
    ctx.marketHistory = state.history.map((h) => ({
      round: h.index + 1,
      event: h.scenarioTitle,
      totalDemand: h.totalDemand,
      claudeShare: pct(h.claude.share),
      playerShare: pct(h.player.share),
    }));
    ctx.currentScore = {
      formula: `Final cash + reputation × ${RULES.score.reputation} + satisfaction × ${RULES.score.satisfaction}`,
      claude: finalScore(me).total,
      supabase: finalScore(rival).total,
    };
    if (memories.length) ctx.yourStrategyNotes = memories;
  }

  ctx.availableActions = availableActions;
  return ctx;
}

function systemPrompt(state: GameState) {
  const base =
    'You are Claude, an autonomous AI business agent running "Claude Café", competing head-to-head against a human who runs "Supabase Café" across the street. ' +
    'Each round both cafés face the same market event and decide simultaneously — you cannot see the human\'s choice for this round. ' +
    'You MUST call the choose_action tool with exactly one of the provided actionIds. You do not control numbers; a neutral simulation engine computes outcomes.';
  const byDifficulty = {
    easy: ' Keep it simple: pick the option that looks best for this round\'s profit right now. Do not overthink long-term strategy.',
    medium:
      ' Balance this round\'s profit with reputation and customer satisfaction. Learn from your recent decisions and outcomes, and keep a short strategy note for yourself.',
    hard:
      ' Your goal is to WIN the final score. Think strategically across the remaining rounds: weigh permanent investments vs. short-term cash, and exploit the shared market. ' +
      'Study the human\'s history, tendencies, strengths and weaknesses, predict what they are likely to do this round, and choose the action that beats them — e.g. undercut them when they raise prices, out-staff them during rushes, or out-invest them in reputation when they play passive. ' +
      'Update your strategy note with what you learned about this specific human.',
  } as const;
  return base + byDifficulty[state.difficulty] + ' Your "reason" is shown live to the human — make it one punchy sentence (max 20 words), confident and specific.';
}

export async function decideClaude(state: GameState, scenario: Scenario, memories: string[]): Promise<ClaudeDecision> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallbackDecision(state, scenario, 'ANTHROPIC_API_KEY not configured');

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const ids = scenario.actions.map((a) => a.id);
  const context = buildAgentContext(state, scenario, memories);
  const tools = [
    {
      name: 'choose_action',
      description: 'Commit Claude Café\'s decision for this round.',
      input_schema: {
        type: 'object',
        properties: {
          actionId: { type: 'string', enum: ids, description: 'One of the availableActions actionIds.' },
          reason: { type: 'string', description: 'One short sentence (max 20 words) explaining the choice, shown to the human.' },
          ...(state.difficulty !== 'easy'
            ? { strategyNote: { type: 'string', description: 'Private note to your future self for later rounds (max 40 words): what you learned, what to watch for.' } }
            : {}),
        },
        required: ['actionId', 'reason'],
      },
    },
  ];

  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: state.difficulty === 'hard' ? 700 : 400,
        system: systemPrompt(state),
        tools,
        tool_choice: { type: 'tool', name: 'choose_action' },
        messages: [{ role: 'user', content: `Current game state (JSON):\n${JSON.stringify(context, null, 1)}\n\nChoose Claude Café's action now.` }],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = (await res.json()) as { content?: Array<{ type: string; name?: string; input?: Record<string, unknown> }> };
    const call = data.content?.find((b) => b.type === 'tool_use' && b.name === 'choose_action');
    const input = call?.input ?? {};
    const actionId = String(input.actionId ?? '');
    // Server-side validation: only allowed actions survive.
    if (!ids.includes(actionId)) throw new Error(`Model returned invalid actionId "${actionId}"`);
    const reason = String(input.reason ?? '').slice(0, 220) || 'Calculated move.';
    const strategyNote = input.strategyNote ? String(input.strategyNote).slice(0, 400) : undefined;
    return { actionId, reason, strategyNote, source: 'claude', model, latencyMs: Date.now() - started };
  } catch (err) {
    console.error('[agent] falling back:', err);
    return fallbackDecision(state, scenario, String((err as Error).message || err));
  }
}
