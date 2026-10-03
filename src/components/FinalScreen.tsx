import { useEffect, useMemo, useState } from 'react';
import CafeScene, { Portrait } from './CafeScene';
import { finalScore, RULES, winner } from '../engine/engine';
import type { GameState } from '../engine/types';
import { sfx } from '../lib/sfx';
import { money } from '../lib/useTween';

/** Final values render immediately (no count-up from 0); rows reveal with a staggered pop. */
export default function FinalScreen({ game, onPlayAgain, onTitle }: { game: GameState; onPlayAgain: () => void; onTitle: () => void }) {
  const w = winner(game);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setShow(true);
      if (w === 'claude') sfx.lose();
      else sfx.fanfare();
    }, 1500);
    return () => clearTimeout(id);
  }, [w]);
  const sides = [
    { key: 'supabase' as const, name: 'SUPABASE CAFÉ', cafe: game.cafes.supabase },
    { key: 'claude' as const, name: 'CLAUDE CAFÉ', cafe: game.cafes.claude },
  ];
  const usedModel = game.history.some((h) => h.claudeDecision.source === 'claude');
  const confetti = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 12) * 0.12,
        dur: 2.4 + (i % 5) * 0.4,
        color: w === 'claude' ? ['#e8875f', '#ffc2a3', '#f6d98a'][i % 3] : w === 'supabase' ? ['#3ecf8e', '#8af0c2', '#f6d98a'][i % 3] : '#f6d98a',
      })),
    [w],
  );

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
      {show && w !== 'tie' && (
        <div className="confetti">
          {confetti.map((c, i) => (
            <i key={i} style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />
          ))}
        </div>
      )}
      <div className="final-card dialog">
        <div className="results-kicker">4 DAYS · 12 ROUNDS · {game.difficulty.toUpperCase()} · {usedModel ? 'LIVE CLAUDE AGENT' : 'OFFLINE AGENT'}</div>
        <h2 className="final-title">FINAL RESULTS</h2>
        <div className="final-cols">
          {sides.map((s, i) => {
            const sc = finalScore(s.cafe);
            const rows: Array<[string, string]> = [
              ['Revenue', money(s.cafe.totals.revenue)],
              ['Profit', money(s.cafe.totals.profit)],
              ['Customers', s.cafe.totals.customers.toLocaleString()],
              ['Reputation', String(Math.round(s.cafe.reputation))],
              ['Satisfaction', String(Math.round(s.cafe.satisfaction))],
            ];
            return (
              <div key={s.key} className={`final-col ${s.key} ${show && w === s.key ? 'champ' : ''}`}>
                <div className="rc-head">
                  <div className="mini-portrait"><Portrait side={s.key} /></div>
                  <div className="rc-title">{s.name}</div>
                  {show && w === s.key && <div className="rc-crown">👑</div>}
                </div>
                <table className="rc-table">
                  <tbody>
                    {rows.map(([k, v], r) => (
                      <tr key={k} className="final-row" style={{ animationDelay: `${0.1 + r * 0.08 + i * 0.04}s` }}>
                        <td>{k}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                    <tr className="sum final-row" style={{ animationDelay: '0.6s' }}><td>Final cash</td><td>{money(sc.cash)}</td></tr>
                    <tr className="final-row" style={{ animationDelay: '0.68s' }}><td>+ Reputation × {RULES.score.reputation}</td><td>{money(sc.reputationPts)}</td></tr>
                    <tr className="final-row" style={{ animationDelay: '0.76s' }}><td>+ Satisfaction × {RULES.score.satisfaction}</td><td>{money(sc.satisfactionPts)}</td></tr>
                  </tbody>
                </table>
                <div className="final-score" style={{ animationDelay: '0.95s' }}>
                  <small>SCORE</small>
                  {sc.total.toLocaleString()}
                </div>
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
