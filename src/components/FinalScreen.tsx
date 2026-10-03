import { useEffect, useState } from 'react';
import CafeScene from './CafeScene';
import { finalScore, RULES, winner } from '../engine/engine';
import type { GameState } from '../engine/types';
import { sfx } from '../lib/sfx';
import { money, useTween } from '../lib/useTween';

function Count({ v, fmt = (n: number) => Math.round(n).toLocaleString(), delay = 0 }: { v: number; fmt?: (n: number) => string; delay?: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setT(v), delay);
    return () => clearTimeout(id);
  }, [v, delay]);
  const x = useTween(t, 1400);
  return <>{fmt(x)}</>;
}

export default function FinalScreen({ game, onPlayAgain, onTitle }: { game: GameState; onPlayAgain: () => void; onTitle: () => void }) {
  const w = winner(game);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setShow(true);
      w === 'claude' ? sfx.lose() : sfx.fanfare();
    }, 2200);
    return () => clearTimeout(id);
  }, [w]);
  const sides = [
    { key: 'supabase' as const, name: 'SUPABASE CAFÉ', cls: 'green', cafe: game.cafes.supabase },
    { key: 'claude' as const, name: 'CLAUDE CAFÉ', cls: 'orange', cafe: game.cafes.claude },
  ];
  const usedModel = game.history.some((h) => h.claudeDecision.source === 'claude');

  return (
    <div className="final-screen">
      <div className="final-bg">
        <div className={`title-half left ${show && w === 'supabase' ? 'winner-glow' : ''}`}>
          <CafeScene side="supabase" slot="Evening" queue={w === 'supabase' ? 7 : 2} seated={w === 'supabase' ? 8 : 3} />
        </div>
        <div className={`title-half right ${show && w === 'claude' ? 'winner-glow' : ''}`}>
          <CafeScene side="claude" slot="Evening" queue={w === 'claude' ? 7 : 2} seated={w === 'claude' ? 8 : 3} />
        </div>
        <div className="title-vignette" />
      </div>
      <div className="final-card pixel-panel">
        <div className="results-kicker">4 DAYS · 12 ROUNDS · {game.difficulty.toUpperCase()} · {usedModel ? 'LIVE CLAUDE AGENT' : 'OFFLINE AGENT'}</div>
        <h2 className="final-title">FINAL RESULTS</h2>
        <div className="final-cols">
          {sides.map((s, i) => {
            const sc = finalScore(s.cafe);
            return (
              <div key={s.key} className={`final-col ${s.cls} ${show && w === s.key ? 'champ' : ''}`}>
                <div className="rc-title">{s.name}</div>
                <table className="rc-table">
                  <tbody>
                    <tr><td>Revenue</td><td><Count v={s.cafe.totals.revenue} fmt={money} delay={i * 150} /></td></tr>
                    <tr><td>Profit</td><td><Count v={s.cafe.totals.profit} fmt={money} delay={i * 150} /></td></tr>
                    <tr><td>Customers</td><td><Count v={s.cafe.totals.customers} delay={i * 150} /></td></tr>
                    <tr><td>Reputation</td><td><Count v={s.cafe.reputation} delay={i * 150} /></td></tr>
                    <tr><td>Satisfaction</td><td><Count v={s.cafe.satisfaction} delay={i * 150} /></td></tr>
                    <tr className="sum"><td>Final cash</td><td>{money(sc.cash)}</td></tr>
                    <tr><td>+ Rep × {RULES.score.reputation}</td><td>{money(sc.reputationPts)}</td></tr>
                    <tr><td>+ Sat × {RULES.score.satisfaction}</td><td>{money(sc.satisfactionPts)}</td></tr>
                    <tr className="sum score"><td>SCORE</td><td><Count v={sc.total} delay={800 + i * 150} /></td></tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        <div className={`winner-banner ${show ? 'show' : ''} ${w}`}>
          {w === 'claude' ? 'CLAUDE CAFÉ WINS 🤖' : w === 'supabase' ? 'SUPABASE CAFÉ WINS ☕' : 'IT’S A TIE 🤝'}
        </div>
        <p className="score-formula">Score = final cash + reputation × ${RULES.score.reputation} + satisfaction × ${RULES.score.satisfaction}. Same market, same events, same rules.</p>
        <div className="title-actions">
          <button className="pixel-btn big gold" onClick={() => { sfx.select(); onPlayAgain(); }}>↻ PLAY AGAIN</button>
          <button className="pixel-btn ghost" onClick={onTitle}>TITLE</button>
        </div>
      </div>
    </div>
  );
}
