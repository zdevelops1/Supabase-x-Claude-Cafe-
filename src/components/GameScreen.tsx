import { useCallback, useEffect, useRef, useState } from 'react';
import CafePanel from './CafePanel';
import { currentScenario, dayTotals, describeEffect, findAction } from '../engine/engine';
import { SCENARIOS, TOTAL_ROUNDS } from '../engine/scenarios';
import type { ClaudeDecision, GameState, RoundRecord, RoundResult } from '../engine/types';
import { api, type SealedDecision } from '../lib/api';
import { storage, type SaveData } from '../lib/storage';
import { sfx } from '../lib/sfx';
import { money, signed, signedMoney } from '../lib/useTween';

type Phase = 'deciding' | 'revealing' | 'resolving' | 'results' | 'day';
type ClaudeStatus = 'thinking' | 'locked' | 'revealed' | 'error';

const CONTEXT_LABEL = {
  easy: ['own cash · stock · rep', 'this event'],
  medium: ['full café state', 'last 3 rounds', 'strategy notes'],
  hard: ['your café & pricing', 'your full history', 'your habits', 'all memory'],
} as const;

const SLOT_ICON = { Morning: '☀️', Afternoon: '🌤️', Evening: '🌙' } as const;

export default function GameScreen({
  save,
  onFinished,
  onQuit,
}: {
  save: SaveData;
  onFinished: (s: GameState) => void;
  onQuit: () => void;
}) {
  const [game, setGame] = useState<GameState>(save.state);
  // Before reveal the browser only holds an encrypted token — Claude's move is sealed server-side.
  const [pending, setPending] = useState<SealedDecision | null>(
    save.pending && save.pending.roundIndex === save.state.roundIndex ? save.pending : null,
  );
  const [revealed, setRevealed] = useState<ClaudeDecision | null>(null);
  const [status, setStatus] = useState<ClaudeStatus>(pending ? 'locked' : 'thinking');
  const [choice, setChoice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('deciding');
  const [record, setRecord] = useState<RoundRecord | null>(save.state.history.at(-1) ?? null);
  const [floaterKey, setFloaterKey] = useState<number | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [dbErrors, setDbErrors] = useState<string[]>([]);
  const [muted, setMuted] = useState(sfx.isMuted());
  const requested = useRef<number>(-1);

  const showingPast = (phase === 'results' || phase === 'day') && !!record;
  // While showing results, keep the board on the round that just resolved.
  const scenario = showingPast && record ? SCENARIOS[record.index] : currentScenario(game) ?? SCENARIOS[TOTAL_ROUNDS - 1];
  const displaySlot = scenario.slot;
  const [showCard, setShowCard] = useState(false);

  // Ask Claude for its sealed decision as soon as a round opens.
  const askClaude = useCallback(async (g: GameState) => {
    setStatus('thinking');
    setErr(null);
    const started = Date.now();
    const tick = setInterval(() => sfx.think(), 450);
    try {
      const d = await api.agent(g);
      const wait = Math.max(0, 1400 - (Date.now() - started)); // let the "thinking" beat land
      await new Promise((r) => setTimeout(r, wait));
      setPending(d);
      setStatus('locked');
      storage.save({ state: g, pending: d });
    } catch (e) {
      setStatus('error');
      setErr(String((e as Error).message));
    } finally {
      clearInterval(tick);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'deciding' || game.status !== 'playing') return;
    if (pending) return;
    if (requested.current === game.roundIndex) return;
    requested.current = game.roundIndex;
    askClaude(game);
  }, [phase, game, pending, askClaude]);

  // Both locked in → server unseals Claude's move and referees; then we play the reveal.
  const resolvingFor = useRef<number>(-1);
  useEffect(() => {
    if (!choice || !pending || resolvingFor.current === game.roundIndex) return;
    resolvingFor.current = game.roundIndex;
    const g = game;
    setPhase('resolving');
    (async () => {
      try {
        const out = await api.resolve(g, choice, pending.sealed);
        setDbErrors(out.persistErrors ?? []);
        setRevealed(out.record.claudeDecision);
        setStatus('revealed');
        setPhase('revealing');
        sfx.reveal();
        await new Promise((r) => setTimeout(r, 2200));
        setGame(out.state);
        setRecord(out.record);
        setFloaterKey(out.record.index + 1);
        storage.save({ state: out.state });
        setPhase('results');
        setShowCard(false);
        setTimeout(() => setShowCard(true), 1700); // let floaters + customers land first
        if (out.record.player.profit >= out.record.claude.profit) sfx.cash();
        else sfx.lose();
      } catch (e) {
        resolvingFor.current = -1;
        setErr(String((e as Error).message));
        setPhase('deciding');
        setStatus('locked');
        setChoice(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, pending]);

  const nextRound = () => {
    sfx.click();
    if (phase === 'results' && record && record.slot === 'Evening') {
      setPhase('day');
      return;
    }
    if (game.status === 'finished') {
      onFinished(game);
      return;
    }
    setChoice(null);
    setPending(null);
    setRevealed(null);
    setStatus('thinking');
    setPhase('deciding');
  };

  const pick = (id: string) => {
    if (phase !== 'deciding' || choice) return;
    sfx.select();
    setChoice(id);
  };

  const decision = revealed;
  const meta = revealed ?? pending?.meta ?? null;
  const live = meta?.source === 'claude';
  const claudeAction = decision ? findAction(scenario, decision.actionId) : undefined;
  const playerAction = choice ? findAction(scenario, choice) : undefined;
  const roundNo = showingPast && record ? record.index + 1 : Math.min(game.roundIndex + 1, TOTAL_ROUNDS);

  return (
    <div className={`game-screen slot-${displaySlot.toLowerCase()}`}>
      {/* HUD */}
      <div className="hud">
        <button className="pixel-btn tiny ghost" onClick={onQuit} title="Back to title">⌂</button>
        <div className="hud-center">
          <span className="hud-day">DAY {scenario.day}/4</span>
          <span className="hud-slot">{SLOT_ICON[displaySlot]} {displaySlot.toUpperCase()}</span>
          <span className="hud-round">ROUND {roundNo}/{TOTAL_ROUNDS}</span>
          <span className={`hud-diff ${game.difficulty}`}>{game.difficulty.toUpperCase()}</span>
          {meta && <span className={`hud-agent ${live ? 'live' : 'offline'}`}>{live ? `● LIVE CLAUDE · ${meta.model}` : '○ OFFLINE FALLBACK'}</span>}
          <span className={`hud-db ${game.persisted ? (dbErrors.length ? 'bad' : 'ok') : 'off'}`}>
            {game.persisted ? (dbErrors.length ? '⚠ SUPABASE ERROR' : '● SUPABASE SAVED') : '○ NOT PERSISTED'}
          </span>
        </div>
        <button className="pixel-btn tiny ghost" onClick={() => setMuted(sfx.toggle())} title="Sound">{muted ? '🔇' : '🔊'}</button>
      </div>
      <div className="round-dots">
        {SCENARIOS.map((s, i) => {
          const h = game.history[i];
          const cls = h ? (h.player.profit >= h.claude.profit ? 'won' : 'lost') : i === game.roundIndex ? 'now' : '';
          return <span key={s.id} className={`dot ${cls} ${i % 3 === 2 ? 'day-end' : ''}`} title={s.title} />;
        })}
      </div>

      {/* Shared market event */}
      <div className="event-card pixel-panel" key={scenario.id}>
        <div className="event-tag">📰 MARKET EVENT · SAME FOR BOTH CAFÉS</div>
        <div className="event-title">
          <span className="event-icon">{scenario.icon}</span> {scenario.title.toUpperCase()}
        </div>
        <p className="event-desc">{scenario.description}</p>
        <div className="event-meta">
          <span>Demand {Math.round(scenario.demand * 100)}%</span>
          {scenario.baseline && <span className="warn">⚠ {describeEffect(scenario.baseline).join(' · ')} (both cafés)</span>}
        </div>
      </div>

      <div className="arena">
        <CafePanel side="supabase" cafe={game.cafes.supabase} slot={displaySlot} last={record?.player ?? null} floaterKey={floaterKey}>
          <div className="choices">
            <div className="controls-title">{choice ? 'YOUR DECISION' : 'YOUR MOVE — CHOOSE ONE'}</div>
            {scenario.actions.map((a) => (
              <button
                key={a.id}
                className={`choice ${choice === a.id ? 'picked' : ''} ${choice && choice !== a.id ? 'dim' : ''}`}
                disabled={phase !== 'deciding' || !!choice}
                onClick={() => pick(a.id)}
              >
                <span className="choice-key">{a.key}</span>
                <span className="choice-body">
                  <span className="choice-label">{a.label}</span>
                  <span className="choice-desc">{a.description}</span>
                  <span className="choice-tags">
                    {describeEffect(a.effect).map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </span>
                </span>
              </button>
            ))}
            {choice && !decision && <div className="waiting">Waiting for Claude to finish thinking…</div>}
          </div>
        </CafePanel>

        <div className="divider">
          <div className="divider-line" />
          <div className="vs-badge">VS</div>
          <div className="divider-line" />
        </div>

        <CafePanel side="claude" cafe={game.cafes.claude} slot={displaySlot} last={record?.claude ?? null} busy={status === 'thinking'} floaterKey={floaterKey}>
          <div className={`agent-box ${status}`}>
            <div className="controls-title">AUTONOMOUS AGENT</div>
            {status === 'thinking' && (
              <div className="agent-state">
                <div className="agent-big">CLAUDE IS THINKING<span className="dots"><i>.</i><i>.</i><i>.</i></span></div>
                <div className="agent-sub">Observing the market and its café…</div>
              </div>
            )}
            {status === 'locked' && (
              <div className="agent-state">
                <div className="agent-big">🔒 DECISION LOCKED</div>
                <div className="agent-sub">Claude has committed its move. It can't see yours. Your turn.</div>
              </div>
            )}
            {status === 'revealed' && claudeAction && decision && (
              <div className="agent-state reveal">
                <div className="agent-label">CLAUDE CHOSE:</div>
                <div className="agent-big orange-text">
                  {claudeAction.key}. {claudeAction.label.toUpperCase()}
                </div>
                <div className="agent-reason">“{decision.reason}”</div>
                {decision.strategyNote && (
                  <div className="agent-note">
                    <span>📓 Claude's notebook:</span> {decision.strategyNote}
                  </div>
                )}
              </div>
            )}
            {status === 'error' && (
              <div className="agent-state">
                <div className="agent-big">⚠ AGENT UNREACHABLE</div>
                <div className="agent-sub">{err}</div>
                <button className="pixel-btn tiny" onClick={() => { requested.current = -1; askClaude(game); }}>RETRY</button>
              </div>
            )}
            <div className="agent-context">
              <span className="ctx-title">CONTEXT:</span>
              {CONTEXT_LABEL[game.difficulty].map((c) => (
                <span key={c} className="tag orange">{c}</span>
              ))}
            </div>
            {meta && (
              <div className={`agent-source ${live ? 'live' : 'offline'}`}>
                {live
                  ? `● LIVE ANTHROPIC CALL: ${meta.model ?? 'Claude'} · ${((meta.latencyMs ?? 0) / 1000).toFixed(1)}s${pending ? ` · ${pending.memory.count} memory notes from ${pending.memory.source}` : ''}`
                  : `○ OFFLINE FALLBACK STRATEGIST — ${meta.error ?? 'no API key'}`}
              </div>
            )}
          </div>
        </CafePanel>
      </div>

      {phase === 'revealing' && playerAction && claudeAction && (
        <div className="reveal-banner">
          <div className="rb-side green">
            <small>SUPABASE CAFÉ</small>
            {playerAction.label}
          </div>
          <div className="rb-vs">VS</div>
          <div className="rb-side orange">
            <small>CLAUDE CAFÉ</small>
            {claudeAction.label}
          </div>
        </div>
      )}
      {phase === 'resolving' && <div className="reveal-banner small">⚖ ENGINE IS SIMULATING THE MARKET…</div>}

      {phase === 'results' && record && !showCard && (
        <button className="skip-hint" onClick={() => setShowCard(true)}>RESULTS ▶</button>
      )}
      {phase === 'results' && record && showCard && <ResultsOverlay record={record} onNext={nextRound} last={game.status === 'finished'} />}
      {phase === 'day' && record && <DayReport game={game} day={record.day} onNext={nextRound} />}
      {err && phase === 'deciding' && status !== 'error' && <div className="toast">{err}</div>}
      {dbErrors.length > 0 && (
        <div className="db-error" onClick={() => setDbErrors([])}>
          <b>SUPABASE PERSISTENCE FAILED</b>
          {dbErrors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}
    </div>
  );
}

function ResultCol({ title, r, side }: { title: string; r: RoundResult; side: 'green' | 'orange' }) {
  return (
    <div className={`result-col ${side}`}>
      <div className="rc-title">{title}</div>
      <div className="rc-action">{r.actionLabel}</div>
      <table className="rc-table">
        <tbody>
          <tr><td>Revenue</td><td className="pos">{signedMoney(r.revenue)}</td></tr>
          <tr><td>Expenses</td><td className="neg">-{money(r.expenses)}</td></tr>
          <tr className="sum"><td>Profit</td><td className={r.profit >= 0 ? 'pos' : 'neg'}>{signedMoney(r.profit)}</td></tr>
          <tr><td>Customers</td><td>{r.customers}</td></tr>
          <tr><td>Market share</td><td>{Math.round(r.share * 100)}%</td></tr>
          <tr><td>Reputation</td><td className={r.repDelta >= 0 ? 'pos' : 'neg'}>{signed(r.repDelta, 1)}</td></tr>
          <tr><td>Satisfaction</td><td className={r.satDelta >= 0 ? 'pos' : 'neg'}>{signed(r.satDelta, 1)}</td></tr>
        </tbody>
      </table>
      {r.notes.length > 0 && <ul className="rc-notes">{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    </div>
  );
}

function ResultsOverlay({ record, onNext, last }: { record: RoundRecord; onNext: () => void; last: boolean }) {
  const pWins = record.player.profit > record.claude.profit;
  const tie = record.player.profit === record.claude.profit;
  return (
    <div className="overlay">
      <div className="results pixel-panel">
        <div className="results-head">
          <div className="results-kicker">ROUND {record.index + 1} RESULTS · {record.scenarioTitle.toUpperCase()}</div>
          <div className={`results-verdict ${tie ? '' : pWins ? 'green-text' : 'orange-text'}`}>
            {tie ? 'DEAD EVEN' : pWins ? 'SUPABASE CAFÉ TAKES THE ROUND ☕' : 'CLAUDE CAFÉ TAKES THE ROUND 🤖'}
          </div>
          <div className="results-market">{record.totalDemand} customers in the neighborhood this round</div>
          <div className="share-bar">
            <div className="sb-green" style={{ width: `${record.player.share * 100}%` }}>{Math.round(record.player.share * 100)}%</div>
            <div className="sb-orange" style={{ width: `${record.claude.share * 100}%` }}>{Math.round(record.claude.share * 100)}%</div>
          </div>
        </div>
        <div className="results-cols">
          <ResultCol title="SUPABASE CAFÉ" r={record.player} side="green" />
          <ResultCol title="CLAUDE CAFÉ" r={record.claude} side="orange" />
        </div>
        <button className="pixel-btn big gold" onClick={onNext} autoFocus>
          {record.slot === 'Evening' ? (last ? 'SEE FINAL DAY REPORT ▶' : 'END OF DAY ▶') : 'NEXT SCENARIO ▶'}
        </button>
      </div>
    </div>
  );
}

function DayReport({ game, day, onNext }: { game: GameState; day: number; onNext: () => void }) {
  const p = dayTotals(game, day, 'supabase');
  const c = dayTotals(game, day, 'claude');
  const rows: Array<[string, string, string, number, number]> = [
    ['Cash', money(game.cafes.supabase.cash), money(game.cafes.claude.cash), game.cafes.supabase.cash, game.cafes.claude.cash],
    ['Day profit', money(p.profit), money(c.profit), p.profit, c.profit],
    ['Day customers', String(p.customers), String(c.customers), p.customers, c.customers],
    ['Reputation', String(Math.round(game.cafes.supabase.reputation)), String(Math.round(game.cafes.claude.reputation)), game.cafes.supabase.reputation, game.cafes.claude.reputation],
    ['Satisfaction', String(Math.round(game.cafes.supabase.satisfaction)), String(Math.round(game.cafes.claude.satisfaction)), game.cafes.supabase.satisfaction, game.cafes.claude.satisfaction],
  ];
  return (
    <div className="overlay">
      <div className="day-report pixel-panel">
        <div className="results-kicker">🌙 CLOSING TIME</div>
        <h2 className="day-title">DAY {day} COMPLETE</h2>
        <table className="day-table">
          <thead>
            <tr><th /><th className="green-text">SUPABASE CAFÉ</th><th className="orange-text">CLAUDE CAFÉ</th></tr>
          </thead>
          <tbody>
            {rows.map(([k, a, b, an, bn]) => (
              <tr key={k}>
                <td>{k}</td>
                <td className={an > bn ? 'lead' : ''}>{a}</td>
                <td className={bn > an ? 'lead' : ''}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="pixel-btn big gold" onClick={onNext} autoFocus>
          {game.status === 'finished' ? 'FINAL RESULTS 🏆' : `START DAY ${day + 1} ☀️`}
        </button>
      </div>
    </div>
  );
}
