/**
 * Phase-2 live verification. Plays a full Hard game through the real API and checks
 * every claim against Supabase via /api/diag (requires ENABLE_DIAGNOSTICS=1 on the server).
 *
 *   node scripts/verify-live.mjs https://your-app.vercel.app      (or http://localhost:5173)
 *
 * Also runs in a browser console on the app's origin:  (await import('/scripts/verify-live.mjs')) is NOT served —
 * paste the run() function instead and call run(location.origin).
 * Never falls back silently: any offline-strategist decision or DB error is a FAIL with the exact message.
 */
export async function run(base, log = console.log) {
  const R = {};
  const fail = (k, msg) => { R[k] = `FAIL — ${msg}`; log(`✗ ${k}: ${msg}`); };
  const pass = (k, msg = '') => { if (!String(R[k] ?? '').startsWith('FAIL')) R[k] = 'PASS'; log(`✓ ${k} ${msg}`); };
  const call = async (route, body) => {
    const res = await fetch(`${base}/api/${route}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, j };
  };

  // 1. health + schema
  const h = (await call('health')).j;
  log('health:', JSON.stringify(h));
  if (!h.anthropic) fail('anthropic', 'ANTHROPIC_API_KEY not configured on server');
  if (h.fallbackAllowed) fail('anthropic', 'AGENT_FALLBACK allows the offline strategist — set AGENT_FALLBACK=off');
  if (!h.supabase) fail('schema', 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured on server');
  else if (!h.schema?.ok) fail('schema', JSON.stringify(h.schema.tables));
  else pass('schema', JSON.stringify(h.schema.tables));
  if (!h.diagnostics) { fail('diagnostics', 'ENABLE_DIAGNOSTICS=1 is required for DB read-back'); return R; }
  if (!h.supabase || !h.schema?.ok) return R;

  const scen = (await call('scenarios')).j.scenarios;
  const lb0 = (await call('leaderboard')).j;
  if (lb0.error) fail('leaderboard', lb0.error);
  const games0 = (lb0.rows ?? []).reduce((s, r) => s + Number(r.human_wins) + Number(r.claude_wins) + Number(r.ties), 0);

  // 2. hard session persisted
  const sess = await call('session', { difficulty: 'hard' });
  if (!sess.ok) { fail('session', JSON.stringify(sess.j)); return R; }
  let state = sess.j.state;
  const d0 = (await call('diag', { sessionId: state.sessionId })).j;
  if (d0.session?.id === state.sessionId && d0.session.difficulty === 'hard') pass('session', state.sessionId);
  else fail('session', `row not found: ${JSON.stringify(d0)}`);

  const picks = [0, 1, 2, 1, 0, 3, 0, 1, 2, 0, 1, 1];
  let notesSoFar = 0;
  for (let i = 0; i < 12; i++) {
    const allowed = scen[i].actions;
    const ag = await call('agent', { state });
    if (!ag.ok) { fail('anthropic', `round ${i + 1}: HTTP ${ag.status} ${JSON.stringify(ag.j)}`); return R; }
    const a = ag.j;
    // sealed: no plaintext move leaks before the human commits
    const leaked = allowed.some((id) => JSON.stringify(a).includes(id)) || 'actionId' in a || 'decision' in a;
    leaked ? fail('sealed', `round ${i + 1} response leaks the move`) : pass('sealed');
    if (a.meta.source !== 'claude') { fail('anthropic', `round ${i + 1} used ${a.meta.source}: ${a.meta.error}`); return R; }
    pass('anthropic', `r${i + 1} ${a.meta.model} ${a.meta.latencyMs}ms`);
    // memory loaded back from Supabase
    if (a.memory.source !== 'supabase' || a.memory.count < notesSoFar) fail('memory', `round ${i + 1}: loaded ${a.memory.count} from ${a.memory.source}, expected ≥${notesSoFar} from supabase`);
    else pass('memory', `r${i + 1} loaded ${a.memory.count} notes`);
    // tamper check
    const bad = await call('resolve', { state, playerActionId: allowed[0], sealed: a.sealed.slice(0, -4) + 'AAAA' });
    bad.status === 400 ? pass('tamper') : fail('tamper', `tampered token accepted (${bad.status})`);

    const rs = await call('resolve', { state, playerActionId: allowed[picks[i]], sealed: a.sealed });
    if (!rs.ok) { fail('rounds', `resolve r${i + 1}: ${JSON.stringify(rs.j)}`); return R; }
    if (rs.j.persistErrors?.length) fail('rounds', rs.j.persistErrors.join(' | '));
    const rec = rs.j.record;
    allowed.includes(rec.claude.actionId) ? pass('validAction') : fail('validAction', rec.claude.actionId);
    rec.claudeDecision.reason ? pass('reason') : fail('reason', `empty reason r${i + 1}`);
    state = rs.j.state;
    const d = (await call('diag', { sessionId: state.sessionId })).j;
    if (d.errors?.length) fail('rounds', d.errors.join(' | '));
    const row = d.rounds?.find((r) => r.round_index === i);
    if (!row || row.player_action !== rec.player.actionId || row.claude_action !== rec.claude.actionId || row.claude_source !== 'claude')
      fail('rounds', `round ${i + 1} row mismatch: ${JSON.stringify(row)}`);
    else pass('rounds', `r${i + 1} ${row.player_action} vs ${row.claude_action}`);
    if (d.session?.round_index !== i + 1) fail('session', `session.round_index=${d.session?.round_index} expected ${i + 1}`);
    notesSoFar = d.memories.strategy.length;
    if (i >= 1 && notesSoFar === 0) fail('memory', 'no strategy notes written to agent_memories');
    log(`  r${i + 1} ${scen[i].id}: human ${rec.player.actionId} | claude ${rec.claude.actionId} — "${rec.claudeDecision.reason}"`);
  }

  const df = (await call('diag', { sessionId: state.sessionId })).j;
  df.final && df.session.status === 'finished' ? pass('final', JSON.stringify(df.final)) : fail('final', JSON.stringify(df));
  const lb1 = (await call('leaderboard')).j;
  const games1 = (lb1.rows ?? []).reduce((s, r) => s + Number(r.human_wins) + Number(r.claude_wins) + Number(r.ties), 0);
  games1 === games0 + 1 ? pass('leaderboard', `${games0} → ${games1} games`) : fail('leaderboard', `${games0} → ${games1}`);
  R.sessionId = state.sessionId;
  log('\nRESULT', JSON.stringify(R, null, 2));
  return R;
}

if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('verify-live.mjs')) {
  run((process.argv[2] || 'http://localhost:5173').replace(/\/$/, '')).then((r) => {
    process.exit(Object.values(r).some((v) => String(v).startsWith('FAIL')) ? 1 : 0);
  });
}
