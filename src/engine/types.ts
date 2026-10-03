export type Difficulty = 'easy' | 'medium' | 'hard';
export type Side = 'supabase' | 'claude';
export type Slot = 'Morning' | 'Afternoon' | 'Evening';

/** Effects an action (or an event baseline) applies. All optional. */
export interface Effect {
  /** One-time cash cost this round. */
  cost?: number;
  /** Persistent multiplier on menu price. */
  priceMult?: number;
  /** This-round-only multiplier on menu price. */
  priceRound?: number;
  /** Discount fraction this round (0.35 = 35% off). Attracts customers. */
  promo?: number;
  /** Extra (or fewer, if negative) staff this round only. */
  staffTemp?: number;
  /** Permanent staff change. */
  staffPerm?: number;
  /** Inventory units added (negative = lost/spoiled). */
  inventory?: number;
  /** One-round attractiveness bonus (marketing, hype). */
  buzz?: number;
  /** Persistent attractiveness bonus (seating, loyalty program). */
  appeal?: number;
  /** Persistent quality delta (0-100 scale). */
  quality?: number;
  /** Persistent multiplier on ingredient cost. */
  unitCostMult?: number;
  /** This-round multiplier on service capacity (equipment). */
  capacityMult?: number;
  /** This-round multiplier on the café's reach (steals share AND grows market). */
  demandMult?: number;
  /** Direct reputation change after the round. */
  rep?: number;
  /** Direct satisfaction change after the round. */
  sat?: number;
}

export interface ActionOption {
  id: string;
  key: 'A' | 'B' | 'C' | 'D';
  label: string;
  description: string;
  effect: Effect;
}

export interface Scenario {
  id: string;
  day: number;
  slot: Slot;
  title: string;
  icon: string;
  description: string;
  /** Market demand multiplier for this round (1 = normal neighborhood traffic). */
  demand: number;
  /** Effect that hits BOTH cafés unless their action counters it. */
  baseline?: Effect;
  actions: ActionOption[];
}

export interface CafeTotals {
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  turnedAway: number;
}

export interface CafeState {
  name: string;
  cash: number;
  reputation: number;
  satisfaction: number;
  quality: number;
  inventory: number;
  staff: number;
  /** Menu price multiplier (1.00 = $9 average ticket). */
  price: number;
  appeal: number;
  unitCostMult: number;
  totals: CafeTotals;
}

export interface RoundResult {
  actionId: string;
  actionLabel: string;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  attracted: number;
  turnedAway: number;
  capacity: number;
  share: number;
  attraction: number;
  avgTicket: number;
  restockCost: number;
  repDelta: number;
  satDelta: number;
  cashAfter: number;
  notes: string[];
}

export interface ClaudeDecision {
  actionId: string;
  reason: string;
  strategyNote?: string;
  /** 'claude' = real model call, 'fallback' = offline heuristic. */
  source: 'claude' | 'fallback';
  model?: string;
  latencyMs?: number;
  error?: string;
}

export interface RoundRecord {
  index: number;
  day: number;
  slot: Slot;
  scenarioId: string;
  scenarioTitle: string;
  totalDemand: number;
  player: RoundResult;
  claude: RoundResult;
  claudeDecision: ClaudeDecision;
}

export interface GameState {
  version: 1;
  sessionId: string;
  difficulty: Difficulty;
  roundIndex: number;
  status: 'playing' | 'finished';
  cafes: Record<Side, CafeState>;
  history: RoundRecord[];
  startedAt: string;
  persisted: boolean;
}

export interface FinalScore {
  cash: number;
  reputationPts: number;
  satisfactionPts: number;
  total: number;
}
