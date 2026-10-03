# ☕ Supabase x Claude Café — Human vs. Agent

> **Hackathon theme: “Build Something Agents Want.”**
> You run **Supabase Café**. Across the street, an autonomous **Claude agent** runs **Claude Café**. Both businesses face the same market and the same events — but Claude independently observes its business, reasons about what to do, remembers previous rounds, and competes against you. Higher difficulty = more context and strategic memory for the agent.

**Live demo:** https://supabase-x-claude-cafe.vercel.app

A pixel-art, split-screen café business battle: 4 days × 3 scenarios = **12 rounds**. Each round you pick A/B/C/D, Claude picks its own move (sealed — it can't see yours), and a **deterministic engine** referees both outcomes in a **shared market** where customers choose between the two cafés.

---

## Architecture

```
MARKET EVENT ──► GAME STATE
                    │
        ┌───────────┴───────────┐
        │ HUMAN decision        │ CLAUDE AGENT decision      ← /api/agent (server-side, forced tool call,
        │ (UI buttons)          │ (allowed actionId only)       validated against the allowed action list)
        └───────────┬───────────┘
                    ▼
     DETERMINISTIC SIMULATION ENGINE                         ← /api/resolve (src/engine/engine.ts)
                    ▼
          SUPABASE PERSISTENCE                               ← sessions, rounds, agent memory, results
                    ▼
          UPDATED SHARED WORLD ──► NEXT ROUND
```

- **The LLM never touches numbers.** Claude returns `{ actionId, reason, strategyNote? }` via a forced `choose_action` tool whose `actionId` is an enum of the round's options. The server re-validates it; the engine computes everything.
- **Shared market.** Each round ~200 × event-demand customers split between the cafés via a logit on attraction (reputation, satisfaction, quality, appeal, buzz, discounts, price). Overflow beyond staff capacity or inventory walks out — hurting satisfaction and reputation.
- **Difficulty = information, not cheats.**
  - 🟢 **Easy** — own cash, inventory, reputation, the event, the actions. Short-term prompt.
  - 🟡 **Medium** — + staffing, pricing, satisfaction, quality, market mechanics, its last 3 decisions/outcomes, its own strategy notes.
  - 🔴 **Hard** — + the human's café stats & pricing, full history of both cafés, a derived profile of the human's habits/strengths/weaknesses, market-share history, the live score, all memory. Prompted to predict and beat you.
- **Agent memory.** On Medium/Hard Claude writes a private `strategyNote` each round; it's stored in Supabase `agent_memories` and fed back next round (shown in the UI as *Claude's notebook*).
- **Transparent winner.** `Score = final cash + reputation × $30 + satisfaction × $15`.

### Stack
- React + TypeScript + Vite (pixel art is hand-drawn SVG — no asset pipeline)
- Server API: `src/server/*` — served by a Vite dev middleware locally and by a single pre-bundled Vercel function (`server/vercel-handler.ts`, emitted by `scripts/build-vercel.mjs` via the Build Output API) in production
- Anthropic Messages API (server-side only)
- Supabase Postgres + RLS + Realtime (live Human-vs-Claude record on the title screen)

```
src/engine/      types, 12 scenarios, deterministic engine (pure functions)
src/server/      agent.ts (Claude), fallbackAgent.ts, supabase.ts, handlers.ts
src/components/  TitleScreen, DifficultySelect, GameScreen, CafePanel, CafeScene (SVG), FinalScreen
server/vercel-handler.ts  Vercel serverless entry (bundled at build)
supabase/migrations/  schema
scripts/simulate.ts   balance checker (npm run sim)
```

---

## Setup

```bash
npm install
cp .env.example .env     # fill in keys (all optional — see below)
npm run dev              # http://localhost:5173
```

| Variable | Where it's used | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | server only | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | server only (default `claude-sonnet-5-5`) | — |
| `SUPABASE_URL` | server only | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Supabase → Project Settings → API → `service_role` |
| `VITE_SUPABASE_URL` | browser (Realtime leaderboard) | same Project URL |
| `VITE_SUPABASE_ANON_KEY` | browser (read-only via RLS) | Supabase → API → `anon` public key |

**Graceful fallbacks:** no Anthropic key → an offline lookahead strategist plays Claude Café and the UI clearly labels it *“Offline fallback strategist”*. No Supabase → the game runs fully; state lives in localStorage.

### Database
Run `supabase/migrations/20261003000000_init.sql` in the Supabase SQL editor (or `supabase db push`). Tables: `game_sessions`, `game_rounds`, `agent_memories`, `final_results` + `leaderboard` view. RLS blocks all anon access except reading `final_results`; all writes go through the server with the service role key.

### Deploy (Vercel)
Import the repo → framework **Vite** → add the env vars above → deploy. `npm run build` writes `.vercel/output` (static site + one bundled API function + routes), which Vercel deploys as-is.

---

## Demo script (≈2 min)
1. Title screen: point at the split café art and the **live global record** (Supabase Realtime).
2. Pick **HARD** — read the “Claude receives” list: difficulty changes what the agent *knows*.
3. Round 1: show **CLAUDE IS THINKING… → 🔒 DECISION LOCKED** (sealed move), then choose yours.
4. Reveal: **CLAUDE CHOSE: …** + its one-line reason; watch customers and floating cash land, then the side-by-side results and market-share bar.
5. A few rounds in, point at **Claude's notebook** — it's writing notes about *you*.
6. Finish the day → day report; finish Day 4 → final scoreboard with the transparent formula. Claude can and does win.

## Art & music
- **Café interiors** are the project's own concept art (`public/art/*.webp`), cropped so no static UI from the concept remains. Everything dynamic (walk-in customers by customers served, extra seated guests by market share, lamp flicker, espresso steam, Claude's thinking glow, register flash, floaters, stats) is a live SVG layer drawn in the art's coordinate space.
- **Music:** J.S. Bach, *Prelude in C major, BWV 846* (1722, public domain), performed live in the browser by a synthesized piano (WebAudio) — no recording, nothing to license. Starts after the first click (autoplay rules), ♪ toggle remembers the choice.

## Accounts (Guest + email/password)
- **PLAY AS GUEST** → `supabase.auth.signInAnonymously()`; full game, refresh-safe on the same browser.
- **CREATE ACCOUNT / SIGN IN** → email + password. A guest who creates an account is converted in place (`updateUser`), keeping the same user id and active game.
- The API verifies the Supabase access token server-side and stamps `user_id` on sessions, rounds, memories and results; every game route checks ownership. RLS gives signed-in users owner-only reads; all writes stay service-role only (`supabase/migrations/20261003120000_auth_ownership.sql`).
- Supabase Auth settings used: *Allow anonymous sign-ins* ON; *Confirm email* OFF for the hackathon (turn back on afterwards).
- `/authtest.html?run=1` runs the guest/account/isolation matrix against a deployment (requires `ENABLE_DIAGNOSTICS=1`).

## Live verification (Phase 2)
With the env vars set on the server (plus `AGENT_FALLBACK=off`, `ENABLE_DIAGNOSTICS=1`):
```bash
node scripts/verify-live.mjs https://your-app.vercel.app
```
It plays a full Hard game through the real API and checks against Supabase: live Anthropic on every round (any offline-strategist decision = FAIL), sealed decisions (no plaintext move before the human commits; tampered tokens rejected), valid actions, reasons, session/round/final rows, strategy notes written **and** loaded back as memory, and the leaderboard count. Exit code 0 = all PASS. Set `ENABLE_DIAGNOSTICS=0` again before the public demo.

**Sealed decisions:** `/api/agent` returns only an AES-GCM-encrypted token; `/api/resolve` decrypts it server-side, so Claude's move can't be read in DevTools or forged.
**No silent fallbacks:** with a key configured, a failed Anthropic call shows the exact error + Retry. Supabase write failures show a red banner with the exact Postgres error.

Reloading mid-game resumes where you left off (**RESUME GAME**). `npm run sim` prints a balance check of every scenario's options.
