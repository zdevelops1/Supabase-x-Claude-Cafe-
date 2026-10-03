import type { Difficulty } from '../engine/types';
import { sfx } from '../lib/sfx';
import { Portrait } from './CafeScene';

const LEVELS: Array<{ id: Difficulty; emoji: string; name: string; blurb: string; context: string[] }> = [
  {
    id: 'easy',
    emoji: '🟢',
    name: 'EASY',
    blurb: 'Claude gets limited context and uses a simple, short-term strategy.',
    context: ['Cash, inventory, reputation', 'Current event', 'Available actions'],
  },
  {
    id: 'medium',
    emoji: '🟡',
    name: 'MEDIUM',
    blurb: 'Claude sees its full business and remembers previous rounds.',
    context: ['+ Staffing, pricing, satisfaction', '+ Its last 3 decisions & outcomes', '+ Market mechanics', '+ Its own strategy notes'],
  },
  {
    id: 'hard',
    emoji: '🔴',
    name: 'HARD',
    blurb: 'Claude studies YOU: full history, your stats, your habits — and adapts to beat you.',
    context: ['+ Your café stats & pricing', '+ Your full decision history', '+ Your strengths & weaknesses', '+ Full market history & memory'],
  },
];

export default function DifficultySelect({ onPick, onBack, busy }: { onPick: (d: Difficulty) => void; onBack: () => void; busy: boolean }) {
  return (
    <div className="difficulty-screen">
      <h2 className="screen-title">CHOOSE YOUR OPPONENT</h2>
      <p className="screen-sub">Difficulty changes what Claude <i>knows</i> — never secret bonus money.</p>
      <div className="difficulty-grid">
        {LEVELS.map((l) => (
          <button key={l.id} className={`difficulty-card dialog ${l.id}`} disabled={busy} onClick={() => { sfx.select(); onPick(l.id); }}>
            <div className="diff-top">
              <div className="mini-portrait robot"><Portrait side="claude" busy={l.id === 'hard'} /></div>
              <div>
                <div className="diff-name">{l.emoji} {l.name}</div>
                <div className="brain" title="How much Claude knows">
                  {[0, 1, 2].map((i) => <i key={i} className={i <= ['easy', 'medium', 'hard'].indexOf(l.id) ? 'on' : ''} />)}
                </div>
              </div>
            </div>
            <p className="diff-blurb">{l.blurb}</p>
            <div className="diff-context-title">CLAUDE RECEIVES</div>
            <ul className="diff-context">
              {l.context.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      <button className="pixel-btn ghost" onClick={onBack}>← BACK</button>
      {busy && <div className="loading-line">Opening both cafés…</div>}
    </div>
  );
}
