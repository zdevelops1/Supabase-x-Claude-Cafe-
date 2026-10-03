import type { ReactNode } from 'react';
import CafeScene from './CafeScene';
import { RULES } from '../engine/engine';
import type { CafeState, RoundResult, Side, Slot } from '../engine/types';
import { money, signedMoney, useTween } from '../lib/useTween';

function Bar({ value, color }: { value: number; color: string }) {
  const v = useTween(value);
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: color }} />
      <span className="bar-num">{Math.round(v)}</span>
    </div>
  );
}

function Num({ value, fmt = (n: number) => Math.round(n).toLocaleString() }: { value: number; fmt?: (n: number) => string }) {
  const v = useTween(value);
  return <>{fmt(v)}</>;
}

export default function CafePanel({
  side,
  cafe,
  slot,
  last,
  busy,
  floaterKey,
  children,
}: {
  side: Side;
  cafe: CafeState;
  slot: Slot;
  last: RoundResult | null;
  busy?: boolean;
  floaterKey?: number;
  children: ReactNode;
}) {
  const isHuman = side === 'supabase';
  const accent = isHuman ? 'var(--green)' : 'var(--orange)';
  const customers = last?.customers ?? 70;
  const queue = Math.round(customers / 22);
  const seated = Math.round(customers / 16);

  return (
    <section className={`cafe-panel ${side}`}>
      <header className="cafe-header">
        <div className="cafe-name">
          <span className="cafe-icon">{isHuman ? '⚡' : '✻'}</span>
          {isHuman ? 'SUPABASE CAFÉ' : 'CLAUDE CAFÉ'}
        </div>
        <div className={`controller-tag ${side}`}>{isHuman ? '👤 HUMAN PLAYER' : '🤖 AI AGENT'}</div>
      </header>

      <div className="scene-wrap">
        <CafeScene side={side} slot={slot} queue={queue} seated={seated} busy={busy} bump={floaterKey ?? 0} />
        {last && floaterKey !== undefined && (
          <div className="floaters" key={floaterKey}>
            <span className={`floater ${last.profit >= 0 ? 'pos' : 'neg'}`}>{signedMoney(last.profit)}</span>
            <span className={`floater f2 ${last.repDelta >= 0 ? 'pos' : 'neg'}`} style={{ animationDelay: '0.35s' }}>
              {last.repDelta >= 0 ? '★+' : '★'}
              {last.repDelta.toFixed(1)}
            </span>
            <span className="floater f3" style={{ animationDelay: '0.6s' }}>
              👥 {last.customers}
            </span>
          </div>
        )}
        {last && (
          <div className="share-badge" style={{ borderColor: accent }}>
            MARKET SHARE <b style={{ color: accent }}>{Math.round(last.share * 100)}%</b>
          </div>
        )}
      </div>

      <div className="stats">
        <div className="stat cash">
          <span className="stat-label">CASH</span>
          <span className="stat-value big" style={{ color: accent }}>
            <Num value={cafe.cash} fmt={money} />
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">REPUTATION</span>
          <Bar value={cafe.reputation} color={accent} />
        </div>
        <div className="stat">
          <span className="stat-label">SATISFACTION</span>
          <Bar value={cafe.satisfaction} color="var(--gold)" />
        </div>
        <div className="mini-stats">
          <div><span>CUSTOMERS</span><b><Num value={cafe.totals.customers} /></b></div>
          <div><span>PROFIT</span><b className={cafe.totals.profit >= 0 ? 'pos' : 'neg'}><Num value={cafe.totals.profit} fmt={money} /></b></div>
          <div><span>STAFF</span><b>{cafe.staff} <small>({cafe.staff * RULES.capacityPerStaff}/rd)</small></b></div>
          <div><span>TICKET</span><b>${(RULES.ticket * cafe.price).toFixed(2)}</b></div>
          <div><span>STOCK</span><b>{cafe.inventory}</b></div>
          <div><span>QUALITY</span><b>{Math.round(cafe.quality)}</b></div>
        </div>
      </div>

      <div className="panel-controls">{children}</div>
    </section>
  );
}
