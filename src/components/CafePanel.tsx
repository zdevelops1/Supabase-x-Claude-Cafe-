import CafeScene from './CafeScene';
import { RULES } from '../engine/engine';
import type { CafeState, RoundResult, Side, Slot } from '../engine/types';
import { money, signedMoney, useTween } from '../lib/useTween';

function Bar({ value, kind }: { value: number; kind: 'rep' | 'sat' }) {
  const v = useTween(value);
  return (
    <div className={`pbar ${kind}`}>
      <div className="pbar-fill" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      <span className="pbar-num">{Math.round(v)}</span>
    </div>
  );
}

function Num({ value, fmt = (n: number) => Math.round(n).toLocaleString() }: { value: number; fmt?: (n: number) => string }) {
  const v = useTween(value);
  return <>{fmt(v)}</>;
}

/** One café: the pixel scene with an overlaid stat plate (top) and a nameplate (bottom). */
export default function CafePanel({
  side,
  cafe,
  slot,
  last,
  busy,
  floaterKey,
}: {
  side: Side;
  cafe: CafeState;
  slot: Slot;
  last: RoundResult | null;
  busy?: boolean;
  floaterKey?: number;
}) {
  const isHuman = side === 'supabase';
  const customers = last?.customers ?? 70;
  const queue = Math.round(customers / 20);
  const seated = last ? Math.round(last.share * 13) : 5; // tables fill with market share

  return (
    <section className={`cafe-panel ${side}`}>
      <div className="scene-wrap">
        <CafeScene side={side} slot={slot} queue={queue} seated={seated} busy={busy} bump={floaterKey ?? 0} />

        <div className={`stat-plate ${side}`}>
          <div className="plate-title">
            <span className="plate-icon">{isHuman ? '⚡' : '✻'}</span>
            {isHuman ? 'SUPABASE CAFÉ' : 'CLAUDE CAFÉ'}
          </div>
          <div className="plate-cash">
            <span>CASH</span>
            <b>
              <Num value={cafe.cash} fmt={money} />
            </b>
          </div>
          <div className="plate-row">
            <span>REP</span>
            <Bar value={cafe.reputation} kind="rep" />
          </div>
          <div className="plate-row">
            <span>SAT</span>
            <Bar value={cafe.satisfaction} kind="sat" />
          </div>
          <div className="plate-mini">
            <span title="Customers served">👥 <Num value={cafe.totals.customers} /></span>
            <span title="Staff (capacity per round)">🧑‍🍳 {cafe.staff}<small>/{cafe.staff * RULES.capacityPerStaff}</small></span>
            <span title="Inventory">📦 {cafe.inventory}</span>
            <span title="Average ticket">☕ ${(RULES.ticket * cafe.price).toFixed(2)}</span>
            <span title="Quality">✦ {Math.round(cafe.quality)}</span>
          </div>
        </div>

        {last && (
          <div className={`share-plate ${side}`}>
            <span>MARKET SHARE</span>
            <b>{Math.round(last.share * 100)}%</b>
          </div>
        )}

        <div className={`nameplate ${side}`}>{isHuman ? '👤 HUMAN PLAYER' : '🤖 AUTONOMOUS AGENT'}</div>

        {last && floaterKey !== undefined && (
          <div className="floaters" key={floaterKey}>
            <span className={`floater ${last.profit >= 0 ? 'pos' : 'neg'}`}>{signedMoney(last.profit)}</span>
            <span className={`floater f2 ${last.repDelta >= 0 ? 'pos' : 'neg'}`} style={{ animationDelay: '0.25s' }}>
              ★{last.repDelta >= 0 ? '+' : ''}
              {last.repDelta.toFixed(1)}
            </span>
            <span className="floater f3" style={{ animationDelay: '0.45s' }}>
              👥 {last.customers}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
