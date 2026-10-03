import { SCENARIOS, TOTAL_ROUNDS } from './scenarios';
import type {
  ActionOption,
  CafeState,
  ClaudeDecision,
  Difficulty,
  Effect,
  FinalScore,
  GameState,
  RoundRecord,
  RoundResult,
  Scenario,
  Side,
} from './types';

/**
 * DETERMINISTIC SIMULATION ENGINE — the neutral referee.
 * No randomness. Same inputs → same outputs. The LLM never touches numbers;
 * it only picks one of the allowed action ids and this engine decides what happens.
 */
export const RULES = {
  baseDemand: 200, // neighborhood customers per round (shared by both cafés)
  ticket: 10, // average ticket in $ at price multiplier 1.00
  capacityPerStaff: 25,
  wage: 80, // per permanent staff per round
  tempWage: 110, // per temp staff per round
  rent: 150, // per round
  unitCost: 2.2, // $ per inventory unit
  inventoryPar: 320, // auto-restock target at the start of each day
  attractionSpread: 18, // lower = customers react more sharply to differences
  startingCash: 5000,
  score: { reputation: 30, satisfaction: 15 },
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function newCafe(name: string): CafeState {
  return {
    name,
    cash: RULES.startingCash,
    reputation: 70,
    satisfaction: 70,
    quality: 60,
    inventory: RULES.inventoryPar,
    staff: 4,
    price: 1,
    appeal: 0,
    unitCostMult: 1,
    totals: { revenue: 0, expenses: 0, profit: 0, customers: 0, turnedAway: 0 },
  };
}

export function createInitialState(sessionId: string, difficulty: Difficulty): GameState {
  return {
    version: 1,
    sessionId,
    difficulty,
    roundIndex: 0,
    status: 'playing',
    cafes: { supabase: newCafe('Supabase Café'), claude: newCafe('Claude Café') },
    history: [],
    startedAt: new Date().toISOString(),
    persisted: false,
  };
}

export function currentScenario(state: GameState): Scenario | null {
  return SCENARIOS[state.roundIndex] ?? null;
}

export function findAction(scenario: Scenario, actionId: string): ActionOption | undefined {
  return scenario.actions.find((a) => a.id === actionId);
}

function mergeEffects(a: Effect = {}, b: Effect = {}): Effect {
  const add = (x?: number, y?: number) => (x ?? 0) + (y ?? 0);
  const mul = (x?: number, y?: number) => (x ?? 1) * (y ?? 1);
  return {
    cost: add(a.cost, b.cost),
    priceMult: mul(a.priceMult, b.priceMult),
    priceRound: mul(a.priceRound, b.priceRound),
    promo: Math.max(a.promo ?? 0, b.promo ?? 0),
    staffTemp: add(a.staffTemp, b.staffTemp),
    staffPerm: add(a.staffPerm, b.staffPerm),
    inventory: add(a.inventory, b.inventory),
    buzz: add(a.buzz, b.buzz),
    appeal: add(a.appeal, b.appeal),
    quality: add(a.quality, b.quality),
    unitCostMult: mul(a.unitCostMult, b.unitCostMult),
    capacityMult: mul(a.capacityMult, b.capacityMult),
    demandMult: mul(a.demandMult, b.demandMult),
    rep: add(a.rep, b.rep),
    sat: add(a.sat, b.sat),
  };
}

/** Human-readable effect tags — shown identically to the player AND to Claude. */
export function describeEffect(e: Effect): string[] {
  const t: string[] = [];
  if (e.cost) t.push(`Cost $${e.cost}`);
  if (e.priceMult && e.priceMult !== 1) t.push(`Price ${e.priceMult > 1 ? '+' : ''}${Math.round((e.priceMult - 1) * 100)}% (permanent)`);
  if (e.priceRound && e.priceRound !== 1) t.push(`Price ${e.priceRound > 1 ? '+' : ''}${Math.round((e.priceRound - 1) * 100)}% (this round)`);
  if (e.promo) t.push(`${Math.round(e.promo * 100)}% discount`);
  if (e.staffTemp) t.push(`${e.staffTemp > 0 ? '+' : ''}${e.staffTemp} staff (this round)`);
  if (e.staffPerm) t.push(`+${e.staffPerm} staff (permanent)`);
  if (e.inventory) t.push(`${e.inventory > 0 ? '+' : ''}${e.inventory} inventory`);
  if (e.buzz) t.push(`Buzz +${e.buzz}`);
  if (e.appeal) t.push(`Appeal +${e.appeal} (permanent)`);
  if (e.quality) t.push(`Quality ${e.quality > 0 ? '+' : ''}${e.quality}`);
  if (e.unitCostMult && e.unitCostMult !== 1) t.push(`Ingredients +${Math.round((e.unitCostMult - 1) * 100)}%`);
  if (e.capacityMult && e.capacityMult !== 1) t.push(`Capacity ×${r2(e.capacityMult)}`);
  if (e.demandMult && e.demandMult !== 1) t.push(`Reach ${e.demandMult > 1 ? '+' : ''}${Math.round((e.demandMult - 1) * 100)}%`);
  if (e.rep) t.push(`Reputation ${e.rep > 0 ? '+' : ''}${e.rep}`);
  if (e.sat) t.push(`Satisfaction ${e.sat > 0 ? '+' : ''}${e.sat}`);
  return t;
}

interface Prepared {
  cafe: CafeState;
  e: Effect;
  restockCost: number;
  effPrice: number;
  discount: number;
  roundStaff: number;
  capacity: number;
  attraction: number;
  reach: number;
}

function prepare(cafe0: CafeState, scenario: Scenario, action: ActionOption, roundIndex: number): Prepared {
  const cafe: CafeState = { ...cafe0, totals: { ...cafe0.totals } };
  const e = mergeEffects(scenario.baseline, action.effect);

  // Start-of-day auto restock (days 2+): top inventory back up to par at current ingredient cost.
  let restockCost = 0;
  const isDayStart = roundIndex > 0 && roundIndex % 3 === 0;
  if (isDayStart && cafe.inventory < RULES.inventoryPar) {
    const units = RULES.inventoryPar - cafe.inventory;
    restockCost = Math.round(units * RULES.unitCost * cafe.unitCostMult);
    cafe.inventory = RULES.inventoryPar;
  }

  // Persistent changes take effect immediately.
  cafe.price = r2(cafe.price * (e.priceMult ?? 1));
  cafe.quality = clamp(cafe.quality + (e.quality ?? 0), 0, 100);
  cafe.staff = Math.max(1, cafe.staff + (e.staffPerm ?? 0));
  cafe.appeal += e.appeal ?? 0;
  cafe.unitCostMult = r2(cafe.unitCostMult * (e.unitCostMult ?? 1));
  cafe.inventory = Math.max(0, cafe.inventory + (e.inventory ?? 0));

  const effPrice = cafe.price * (e.priceRound ?? 1);
  const discount = e.promo ?? 0;
  const roundStaff = Math.max(1, cafe.staff + (e.staffTemp ?? 0));
  const capacity = Math.round(roundStaff * RULES.capacityPerStaff * (e.capacityMult ?? 1));

  const attraction =
    0.45 * cafe.reputation +
    0.3 * cafe.satisfaction +
    0.25 * cafe.quality +
    cafe.appeal +
    (e.buzz ?? 0) +
    discount * 70 -
    (effPrice - 1) * 70;

  return { cafe, e, restockCost, effPrice, discount, roundStaff, capacity, attraction, reach: e.demandMult ?? 1 };
}

function settle(p: Prepared, attracted: number, share: number, action: ActionOption): { cafe: CafeState; result: RoundResult } {
  const { cafe, e } = p;
  const inv0 = cafe.inventory;
  const served = Math.max(0, Math.min(Math.round(attracted), p.capacity, inv0));
  const turnedAway = Math.max(0, Math.round(attracted) - served);
  cafe.inventory -= served;

  const avgTicket = RULES.ticket * p.effPrice * (1 - p.discount);
  const revenue = Math.round(served * avgTicket);
  const permOnShift = Math.min(cafe.staff, p.roundStaff);
  const temps = Math.max(0, e.staffTemp ?? 0);
  const wages = permOnShift * RULES.wage + temps * RULES.tempWage;
  const expenses = Math.round(RULES.rent + wages + (e.cost ?? 0) + p.restockCost);
  const profit = revenue - expenses;

  const awayRatio = attracted > 0 ? turnedAway / attracted : 0;
  const satTarget = 64 + (cafe.quality - 60) * 0.5 - (p.effPrice - 1) * 50 + p.discount * 25 - awayRatio * 70;
  const newSat = clamp(cafe.satisfaction * 0.55 + satTarget * 0.45 + (e.sat ?? 0), 0, 100);
  const satDelta = newSat - cafe.satisfaction;
  const repDelta = (newSat - 62) * 0.1 - awayRatio * 5 + (e.rep ?? 0) + (e.buzz ?? 0) * 0.05;
  const newRep = clamp(cafe.reputation + repDelta, 0, 100);

  const notes: string[] = [];
  if (turnedAway > 0) {
    if (served === inv0 && inv0 < p.capacity) notes.push(`Ran out of stock — ${turnedAway} customers left`);
    else notes.push(`${turnedAway} customers walked out (long lines)`);
  }
  if (p.restockCost) notes.push(`Morning restock: $${p.restockCost}`);

  const realRep = newRep - cafe.reputation;
  cafe.satisfaction = r2(newSat);
  cafe.reputation = r2(newRep);
  cafe.cash = cafe.cash + profit;
  cafe.totals.revenue += revenue;
  cafe.totals.expenses += expenses;
  cafe.totals.profit += profit;
  cafe.totals.customers += served;
  cafe.totals.turnedAway += turnedAway;

  return {
    cafe,
    result: {
      actionId: action.id,
      actionLabel: action.label,
      revenue,
      expenses,
      profit,
      customers: served,
      attracted: Math.round(attracted),
      turnedAway,
      capacity: p.capacity,
      share: r2(share),
      attraction: r2(p.attraction),
      avgTicket: r2(avgTicket),
      restockCost: p.restockCost,
      repDelta: r2(realRep),
      satDelta: r2(satDelta),
      cashAfter: cafe.cash,
      notes,
    },
  };
}

/** Pure function: resolve one simultaneous round of the shared market. */
export function simulateRound(
  cafes: Record<Side, CafeState>,
  scenario: Scenario,
  roundIndex: number,
  playerAction: ActionOption,
  claudeAction: ActionOption,
) {
  const ps = prepare(cafes.supabase, scenario, playerAction, roundIndex);
  const pc = prepare(cafes.claude, scenario, claudeAction, roundIndex);

  // Shared demand: price level shrinks/grows the market, marketing reach grows it.
  const avgEff = (ps.effPrice * (1 - ps.discount) + pc.effPrice * (1 - pc.discount)) / 2;
  const elasticity = clamp(1 - (avgEff - 1) * 0.6, 0.6, 1.25);
  const reachGrowth = (ps.reach + pc.reach) / 2;
  const totalDemand = Math.round(RULES.baseDemand * scenario.demand * elasticity * reachGrowth);

  // Customers choose between the two cafés (logit on attraction × reach).
  const ws = Math.exp(ps.attraction / RULES.attractionSpread) * ps.reach;
  const wc = Math.exp(pc.attraction / RULES.attractionSpread) * pc.reach;
  const shareS = ws / (ws + wc);
  const shareC = 1 - shareS;

  const s = settle(ps, totalDemand * shareS, shareS, playerAction);
  const c = settle(pc, totalDemand * shareC, shareC, claudeAction);
  return { cafes: { supabase: s.cafe, claude: c.cafe }, player: s.result, claude: c.result, totalDemand };
}

export class InvalidActionError extends Error {}

/** Advance the game by one round. Validates both actions against the current scenario. */
export function resolveRound(
  state: GameState,
  playerActionId: string,
  decision: ClaudeDecision,
): { state: GameState; record: RoundRecord } {
  if (state.status !== 'playing') throw new InvalidActionError('Game already finished');
  const scenario = currentScenario(state);
  if (!scenario) throw new InvalidActionError('No scenario for this round');
  const pa = findAction(scenario, playerActionId);
  const ca = findAction(scenario, decision.actionId);
  if (!pa) throw new InvalidActionError(`Invalid player action: ${playerActionId}`);
  if (!ca) throw new InvalidActionError(`Invalid Claude action: ${decision.actionId}`);

  const out = simulateRound(state.cafes, scenario, state.roundIndex, pa, ca);
  const record: RoundRecord = {
    index: state.roundIndex,
    day: scenario.day,
    slot: scenario.slot,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    totalDemand: out.totalDemand,
    player: out.player,
    claude: out.claude,
    claudeDecision: decision,
  };
  const nextIndex = state.roundIndex + 1;
  return {
    record,
    state: {
      ...state,
      cafes: out.cafes,
      history: [...state.history, record],
      roundIndex: nextIndex,
      status: nextIndex >= TOTAL_ROUNDS ? 'finished' : 'playing',
    },
  };
}

export function finalScore(cafe: CafeState): FinalScore {
  const reputationPts = Math.round(cafe.reputation * RULES.score.reputation);
  const satisfactionPts = Math.round(cafe.satisfaction * RULES.score.satisfaction);
  return { cash: cafe.cash, reputationPts, satisfactionPts, total: cafe.cash + reputationPts + satisfactionPts };
}

export function winner(state: GameState): Side | 'tie' {
  const a = finalScore(state.cafes.supabase).total;
  const b = finalScore(state.cafes.claude).total;
  if (a === b) return 'tie';
  return a > b ? 'supabase' : 'claude';
}

export function dayTotals(state: GameState, day: number, side: Side) {
  const rows = state.history.filter((h) => h.day === day).map((h) => (side === 'supabase' ? h.player : h.claude));
  return {
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    expenses: rows.reduce((s, r) => s + r.expenses, 0),
    profit: rows.reduce((s, r) => s + r.profit, 0),
    customers: rows.reduce((s, r) => s + r.customers, 0),
  };
}
