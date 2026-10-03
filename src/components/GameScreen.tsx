import { useCallback, useEffect, useRef, useState } from 'react';
import CafePanel from './CafePanel';
import { Portrait } from './CafeScene';
import MusicButton from './MusicButton';
import { currentScenario, dayTotals, describeEffect, finalScore, findAction } from '../engine/engine';
import { SCENARIOS, TOTAL_ROUNDS } from '../engine/scenarios';
import type { ClaudeDecision, GameState, RoundRecord, RoundResult } from '../engine/types';
import { api, type SealedDecision } from '../lib/api';
import { storage, type SaveData } from '../lib/storage';
import { sfx } from '../lib/sfx';
import { money, signed, signedMoney, useTween } from '../lib/useTween';

type Phase = 'deciding' | 'revealing' | 'resolving' | 'money' | 'results' | 'day';
type ClaudeStatus = 'thinking' | 'locked' | 'revealed' | 'error';

const CONTEXT_LABEL = {
  easy: ['own cash · stock · rep', 'this event'],
  medium: ['full café state', 'last 3 rounds', 'strategy notes'],
  hard: ['your café & pricing', 'your full history', 'your habits', 'all memory'],
} as const;

const SLOT_ICON = { Morning: '☀️', Afternoon: '🌤️', Evening: '🌙' } as const;

export default function GameScreen({
  save,
  identity,
  onFinished,
  onQuit,
}: {
  save: SaveData;
  identity?: string;
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
  const pickedRef = useRef(false);
  useEffect(() => {
    if (!choice || !pending || resolvingFor.current === game.roundIndex) return;
    resolvingFor.current = game.roundIndex;
    const g = game;
    setPhase('resolving');
    (async () => {
      try {
        const out = await api.resolve(g, choice, pending.sealed);
        setDbErrors(out.persistErrors ?? []);
        // 1) IMPACT: the player's real engine profit, dead centre, first thing they see.
        setRecord(out.record);
        setPhase('money');
        const ps = (n: number) => (n > 0 ? sfx.chaChing : n < 0 ? sfx.loss : () => {});
        ps(out.record.player.profit)(0, 0.055);
        ps(out.record.claude.profit)(0.25, 0.032);
        await new Promise((r) => setTimeout(r, 1000));
        // 2) Claude's sealed move is revealed.
        setRevealed(out.record.claudeDecision);
        setStatus('revealed');
        setPhase('revealing');
        sfx.reveal();
        await new Promise((r) => setTimeout(r, 1400));
        // 3) CONSEQUENCE: board updates, floaters + customers, then the detailed card.
        setGame(out.state);
        setFloaterKey(out.record.index + 1);
        storage.save({ state: out.state });
        setPhase('results');
        setShowCard(false);
        setTimeout(() => setShowCard(true), 1100); // let floaters + customers land first
      } catch (e) {
        resolvingFor.current = -1;
        pickedRef.current = false;
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
    pickedRef.current = false;
    setChoice(null);
    setPending(null);
    setRevealed(null);
    setStatus('thinking');
    setPhase('deciding');
  };

  const pick = (id: string) => {
    if (phase !== 'deciding' || choice || pickedRef.current) return; // ref blocks same-tick double clicks
    pickedRef.current = true;
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
      <header className="hud-bar">
        <div className="hud-side supabase">
          <button className="icon-btn" onClick={onQuit} title="Back to title">⌂</button>
          <div className="hud-score">
            <span>⚡ SUPABASE{identity && <em className="hud-id" title="Signed in as">{identity}</em>}</span>
            <b className="hud-cash" title="Supabase Café cash"><Num value={game.cafes.supabase.cash} fmt={money} /></b>
          </div>
        </div>
        <div className="hud-center">
          <div className="hud-time">
            <span className="hud-day">DAY {scenario.day}<small>/4</small></span>
            <span className="hud-slot">{SLOT_ICON[displaySlot]} {displaySlot.toUpperCase()}</span>
            <span className="hud-round">ROUND {roundNo}<small>/{TOTAL_ROUNDS}</small></span>
            <span className={`hud-diff ${game.difficulty}`}>{game.difficulty.toUpperCase()}</span>
          </div>
          <div className="round-dots">
            {SCENARIOS.map((sc, i) => {
              const h = game.history[i];
              const cls = h ? (h.player.profit >= h.claude.profit ? 'won' : 'lost') : i === game.roundIndex ? 'now' : '';
              return <span key={sc.id} className={`dot ${cls} ${i % 3 === 2 ? 'day-end' : ''}`} title={sc.title} />;
            })}
          </div>
          <div className="hud-status">
            <span className={`hud-agent ${meta ? (live ? 'live' : 'offline') : 'pending'}`}>
              {meta ? (live ? `● LIVE CLAUDE · ${meta.model}` : '○ OFFLINE FALLBACK') : '◌ CONNECTING CLAUDE'}
            </span>
            {identity && <span className="hud-id-m">{identity === 'GUEST' ? '👤 GUEST' : `☕ ${identity}`}</span>}
            <span className={`hud-db ${game.persisted ? (dbErrors.length ? 'bad' : 'ok') : 'off'}`}>
              {game.persisted ? (dbErrors.length ? '⚠ SUPABASE ERROR' : '● SUPABASE SAVED') : '○ NOT PERSISTED'}
            </span>
          </div>
        </div>
        <div className="hud-side claude">
          <div className="hud-score">
            <span>CLAUDE ✻</span>
            <b className="hud-cash" title="Claude Café cash"><Num value={game.cafes.claude.cash} fmt={money} /></b>
          </div>
          <MusicButton />
          <button className="icon-btn" onClick={() => setMuted(sfx.toggle())} title="Sound effects">{muted ? '🔇' : '🔊'}</button>
        </div>
      </header>

      <div className={`arena ${phase === 'revealing' ? 'shake' : ''}`}>
        <CafePanel side="supabase" cafe={game.cafes.supabase} slot={displaySlot} last={record?.player ?? null} floaterKey={floaterKey} />
        <div className="pillar">
          <div className="pillar-cap" />
          <div className="pillar-shaft" />
          <div className="vs-gem"><span>VS</span></div>
          <div className="pillar-shaft" />
          <div className="pillar-cap" />
        </div>
        <CafePanel side="claude" cafe={game.cafes.claude} slot={displaySlot} last={record?.claude ?? null} busy={status === 'thinking'} floaterKey={floaterKey} />
      </div>

      {/* Shared market event — RPG dialog box */}
      <div className="event-box dialog" key={scenario.id}>
        <div className="event-portrait">{scenario.icon}</div>
        <div className="event-body">
          <div className="event-tag">MARKET EVENT · SAME FOR BOTH CAFÉS</div>
          <div className="event-title">{scenario.title.toUpperCase()}</div>
          <p className="event-desc">{scenario.description}</p>
        </div>
        <div className="event-side">
          <div className="demand">
            <span>DEMAND</span>
            <div className="demand-meter"><i style={{ width: `${Math.min(100, (scenario.demand / 1.6) * 100)}%` }} /></div>
            <b>{Math.round(scenario.demand * 100)}%</b>
          </div>
          {scenario.baseline && <div className="event-warn">⚠ {describeEffect(scenario.baseline).join(' · ')}<small> both cafés</small></div>}
        </div>
      </div>

      <div className="controls-row">
        {/* Human menu */}
        <section className="dialog player-menu">
          <div className="menu-head">
            <div className="mini-portrait"><Portrait side="supabase" /></div>
            <div>
              <div className="menu-title green-text">{choice ? 'YOUR DECISION IS IN' : 'YOUR MOVE'}</div>
              <div className="menu-sub">{choice ? (pending ? 'Revealing both moves…' : 'Waiting for Claude to finish thinking…') : 'Pick one strategy for Supabase Café'}</div>
            </div>
          </div>
          <div className="choices">
            {scenario.actions.map((a) => (
              <button
                key={a.id}
                className={`choice ${choice === a.id ? 'picked' : ''} ${choice && choice !== a.id ? 'dim' : ''}`}
                disabled={phase !== 'deciding' || !!choice}
                onClick={() => pick(a.id)}
                title={a.description}
              >
                <span className="choice-cursor">▶</span>
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
          </div>
        </section>

        <div className="pillar-spacer" />

        {/* Claude agent */}
        <section className={`dialog agent-box ${status}`}>
          <div className="menu-head">
            <div className={`mini-portrait robot ${status}`}><Portrait side="claude" busy={status === 'thinking'} /></div>
            <div className="agent-head-text">
              <div className="menu-title orange-text">CLAUDE · AUTONOMOUS AGENT</div>
              <div className="agent-context">
                {CONTEXT_LABEL[game.difficulty].map((c) => (
                  <span key={c} className="tag orange">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="agent-stage">
            {status === 'thinking' && (
              <div className="agent-state thinking">
                <div className="agent-big">CLAUDE IS THINKING<span className="dots"><i>.</i><i>.</i><i>.</i></span></div>
                <div className="think-bars"><i /><i /><i /><i /><i /></div>
                <div className="agent-sub">Reading the market, its café{game.difficulty !== 'easy' ? ', its memory' : ''}{game.difficulty === 'hard' ? ' — and you' : ''}…</div>
              </div>
            )}
            {status === 'locked' && (
              <div className="agent-state locked">
                <div className="lock-seal">🔒</div>
                <div>
                  <div className="agent-big gold-text">DECISION LOCKED</div>
                  <div className="agent-sub">Claude has committed its move. It can't see yours.</div>
                </div>
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
                    <span>📓 NOTEBOOK</span> {decision.strategyNote}
                  </div>
                )}
              </div>
            )}
            {status === 'error' && (
              <div className="agent-state">
                <div className="agent-big neg">⚠ AGENT UNREACHABLE</div>
                <div className="agent-sub err-text">{err}</div>
                <button className="pixel-btn tiny" onClick={() => { requested.current = -1; askClaude(game); }}>RETRY</button>
              </div>
            )}
          </div>
          {meta && (
            <div className={`agent-source ${live ? 'live' : 'offline'}`}>
              {live
                ? `● LIVE ANTHROPIC CALL · ${meta.model ?? 'Claude'} · ${((meta.latencyMs ?? 0) / 1000).toFixed(1)}s${pending ? ` · ${pending.memory.count} memory notes from ${pending.memory.source}` : ''}`
                : `○ OFFLINE FALLBACK STRATEGIST — ${meta.error ?? 'no API key'}`}
            </div>
          )}
        </section>
      </div>

      {phase === 'revealing' && playerAction && claudeAction && (
        <div className="reveal-banner">
          <div className="rb-side green">
            <small>⚡ SUPABASE CAFÉ</small>
            {playerAction.label}
          </div>
          <div className="rb-vs">VS</div>
          <div className="rb-side orange">
            <small>CLAUDE CAFÉ ✻</small>
            {claudeAction.label}
          </div>
        </div>
      )}
      {phase === 'money' && record && <MoneyPop record={record} />}
      {phase === 'resolving' && <div className="reveal-banner small">⚖ THE ENGINE IS SIMULATING THE MARKET…</div>}

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

function Num({ value, fmt = (n: number) => Math.round(n).toLocaleString() }: { value: number; fmt?: (n: number) => string }) {
  const v = useTween(value, 800);
  return <>{fmt(v)}</>;
}

function ResultCol({ title, r, side, win }: { title: string; r: RoundResult; side: 'supabase' | 'claude'; win: boolean }) {
  return (
    <div className={`result-col ${side} ${win ? 'win' : ''}`}>
      <div className="rc-head">
        <div className="mini-portrait"><Portrait side={side} /></div>
        <div>
          <div className="rc-title">{title}</div>
          <div className="rc-action">{r.actionLabel}</div>
        </div>
        {win && <div className="rc-crown">👑</div>}
      </div>
      <div className={`rc-profit ${r.profit >= 0 ? 'pos' : 'neg'}`}>
        <Num value={r.profit} fmt={signedMoney} />
        <small>PROFIT</small>
      </div>
      <table className="rc-table">
        <tbody>
          <tr><td>Revenue</td><td className="pos">{signedMoney(r.revenue)}</td></tr>
          <tr><td>Expenses</td><td className="neg">-{money(r.expenses)}</td></tr>
          <tr><td>Customers</td><td>{r.customers}</td></tr>
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
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrow(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const ps = grow ? record.player.share * 100 : 50;
  return (
    <div className="overlay">
      <div className="results dialog">
        <div className="results-head">
          <div className="results-kicker">ROUND {record.index + 1} · {record.scenarioTitle.toUpperCase()}</div>
          <div className={`results-verdict ${tie ? 'gold-text' : pWins ? 'green-text' : 'orange-text'}`}>
            {tie ? 'DEAD EVEN' : pWins ? 'SUPABASE CAFÉ TAKES THE ROUND' : 'CLAUDE CAFÉ TAKES THE ROUND'}
          </div>
          <div className="share-bar">
            <div className="sb-green" style={{ width: `${ps}%` }}>⚡ {Math.round(record.player.share * 100)}%</div>
            <div className="sb-orange" style={{ width: `${100 - ps}%` }}>{Math.round(record.claude.share * 100)}% ✻</div>
          </div>
          <div className="results-market">{record.totalDemand} customers in the shared neighborhood this round</div>
        </div>
        <div className="results-cols">
          <ResultCol title="SUPABASE CAFÉ" r={record.player} side="supabase" win={pWins} />
          <ResultCol title="CLAUDE CAFÉ" r={record.claude} side="claude" win={!pWins && !tie} />
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
  const S = game.cafes.supabase;
  const C = game.cafes.claude;
  const rows: Array<[string, number, number, (n: number) => string]> = [
    ['CASH', S.cash, C.cash, money],
    ['DAY PROFIT', p.profit, c.profit, money],
    ['DAY CUSTOMERS', p.customers, c.customers, (n) => String(n)],
    ['REPUTATION', S.reputation, C.reputation, (n) => String(Math.round(n))],
    ['SATISFACTION', S.satisfaction, C.satisfaction, (n) => String(Math.round(n))],
  ];
  const ps = finalScore(S).total;
  const cs = finalScore(C).total;
  const leader = ps === cs ? 'tie' : ps > cs ? 'supabase' : 'claude';
  return (
    <div className="overlay night">
      <div className="day-report dialog">
        <div className="results-kicker">🌙 CLOSING TIME</div>
        <h2 className="day-title">DAY {day} COMPLETE</h2>
        <div className="day-heads">
          <div className="dh supabase"><div className="mini-portrait"><Portrait side="supabase" /></div>SUPABASE CAFÉ</div>
          <div className="dh claude">CLAUDE CAFÉ<div className="mini-portrait"><Portrait side="claude" /></div></div>
        </div>
        <div className="day-rows">
          {rows.map(([k, a, b, f], i) => {
            const total = Math.abs(a) + Math.abs(b) || 1;
            const aw = Math.max(4, (Math.max(0, a) / total) * 100);
            const bw = Math.max(4, (Math.max(0, b) / total) * 100);
            return (
              <div className="day-row" key={k} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className={`dv supabase ${a > b ? 'lead' : ''}`}>{a > b && '▲ '}{f(a)}</div>
                <div className="dbar">
                  <i className="g" style={{ width: `${aw / 2}%` }} />
                  <span>{k}</span>
                  <i className="o" style={{ width: `${bw / 2}%` }} />
                </div>
                <div className={`dv claude ${b > a ? 'lead' : ''}`}>{f(b)}{b > a && ' ▲'}</div>
              </div>
            );
          })}
        </div>
        <div className={`day-leader ${leader}`}>
          {leader === 'tie' ? 'NECK AND NECK' : leader === 'supabase' ? `⚡ SUPABASE CAFÉ LEADS ${ps.toLocaleString()} – ${cs.toLocaleString()}` : `✻ CLAUDE CAFÉ LEADS ${cs.toLocaleString()} – ${ps.toLocaleString()}`}
        </div>
        <button className="pixel-btn big gold" onClick={onNext} autoFocus>
          {game.status === 'finished' ? 'FINAL RESULTS 🏆' : `START DAY ${day + 1} ☀️`}
        </button>
      </div>
    </div>
  );
}

/** Centre-screen result pop. Values come straight from the engine record (profit = cash change). */
function MoneyPop({ record }: { record: RoundRecord }) {
  const p = record.player.profit;
  const c = record.claude.profit;
  const kind = (n: number) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'even');
  const amt = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`;
  return (
    <div className="money-pop" role="status">
      <div className={`mp-main ${kind(p)}`} data-side="supabase" data-amount={p}>
        {p > 0 && <span className="mp-head">CHA-CHING!</span>}
        <b>{amt(p)}</b>
        <small>⚡ SUPABASE CAFÉ</small>
      </div>
      <div className={`mp-sub ${kind(c)}`} data-side="claude" data-amount={c}>
        <small>CLAUDE CAFÉ ✻</small>
        <b>{amt(c)}</b>
      </div>
    </div>
  );
}
