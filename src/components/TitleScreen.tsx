import { useEffect, useState } from 'react';
import CafeScene from './CafeScene';
import { api, type Health } from '../lib/api';
import { onNewResult } from '../lib/realtime';
import { sfx } from '../lib/sfx';

type LB = Awaited<ReturnType<typeof api.leaderboard>>;

export default function TitleScreen({
  canResume,
  onStart,
  onResume,
  health,
}: {
  canResume: boolean;
  onStart: () => void;
  onResume: () => void;
  health: Health | null;
}) {
  const [lb, setLb] = useState<LB | null>(null);
  useEffect(() => {
    const load = () => api.leaderboard().then(setLb).catch(() => setLb(null));
    load();
    return onNewResult(load);
  }, []);
  const human = lb?.rows.reduce((s, r) => s + Number(r.human_wins), 0) ?? 0;
  const agent = lb?.rows.reduce((s, r) => s + Number(r.claude_wins), 0) ?? 0;

  return (
    <div className="title-screen">
      <div className="title-bg">
        <div className="title-half left">
          <CafeScene side="supabase" slot="Evening" queue={4} seated={6} />
        </div>
        <div className="title-half right">
          <CafeScene side="claude" slot="Evening" queue={4} seated={6} busy />
        </div>
        <div className="title-vignette" />
      </div>

      <div className="title-card pixel-panel">
        <div className="title-logos">
          <span className="logo-chip green">⚡</span>
          <span className="vs-chip">×</span>
          <span className="logo-chip orange">✻</span>
        </div>
        <h1 className="title-main">
          <span className="green-text">SUPABASE</span> <span className="x">x</span> <span className="orange-text">CLAUDE</span>
          <br />
          CAFÉ
        </h1>
        <p className="title-sub">Human vs. Agent</p>
        <p className="title-pitch">
          You run <b className="green-text">Supabase Café</b>. Across the street, an autonomous <b className="orange-text">Claude agent</b> runs its own café
          in the same market — observing, reasoning, remembering, and competing against you.
        </p>
        <div className="title-actions">
          <button className="pixel-btn big gold" onClick={() => { sfx.select(); onStart(); }}>
            ▶ START COMPETITION
          </button>
          {canResume && (
            <button className="pixel-btn" onClick={() => { sfx.click(); onResume(); }}>
              ↺ RESUME GAME
            </button>
          )}
        </div>
        <div className="status-row">
          <span className={`chip ${health?.anthropic ? 'on' : 'off'}`}>{health?.anthropic ? `● Live Claude agent · ${health.model}` : '○ Claude offline (fallback)'}</span>
          <span className={`chip ${health?.schema.ok ? 'on' : health?.supabase ? 'bad' : 'off'}`}>
            {health?.schema.ok ? '● Supabase connected' : health?.supabase ? '⚠ Supabase schema error' : '○ Supabase not configured'}
          </span>
        </div>
        {health?.supabase && !health.schema.ok && (
          <div className="schema-errors">{Object.entries(health.schema.tables).filter(([, v]) => v !== 'ok').map(([t, v]) => <div key={t}>{v}</div>)}</div>
        )}
        {lb?.error && <div className="schema-errors">{lb.error}</div>}
        {lb?.configured && (
          <div className="record">
            <div className="record-title">GLOBAL RECORD · LIVE</div>
            <div className="record-score">
              <span className="green-text">HUMANS {human}</span>
              <span className="dash">—</span>
              <span className="orange-text">{agent} CLAUDE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
