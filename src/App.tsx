import { useCallback, useEffect, useRef, useState } from 'react';
import TitleScreen from './components/TitleScreen';
import DifficultySelect from './components/DifficultySelect';
import GameScreen from './components/GameScreen';
import FinalScreen from './components/FinalScreen';
import AuthDialog, { type AuthMode } from './components/AuthDialog';
import type { Difficulty, GameState } from './engine/types';
import { api } from './lib/api';
import { auth, supa, type Player } from './lib/auth';
import { setStorageOwner, storage, type SaveData } from './lib/storage';

type Screen = { name: 'title' } | { name: 'difficulty' } | { name: 'game'; save: SaveData } | { name: 'final'; game: GameState };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [saved, setSaved] = useState<SaveData | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.health>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [authAvailable, setAuthAvailable] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [dialog, setDialog] = useState<AuthMode | null>(null);
  const playerRef = useRef<Player | null>(null);

  /** Load the player's latest unfinished game: Supabase is authoritative; local cache keeps the sealed pending decision. */
  const refreshSave = useCallback(async (p: Player | null, available: boolean): Promise<SaveData | null> => {
    setStorageOwner(p?.id ?? null);
    const local = storage.load();
    if (!available || !p) {
      const s = available ? null : local;
      setSaved(s);
      return s;
    }
    try {
      const me = await api.me();
      let s: SaveData | null = null;
      if (me.active) {
        s = local && local.state.sessionId === me.active.sessionId && local.state.roundIndex === me.active.roundIndex ? local : { state: me.active };
        storage.save(s);
      } else if (local?.state.status === 'finished') {
        s = local;
      } else {
        storage.clear();
      }
      setSaved(s);
      return s;
    } catch (e) {
      setErr(String((e as Error).message));
      setSaved(local);
      return local;
    }
  }, []);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    let unsub = () => {};
    (async () => {
      const available = !!(await supa());
      setAuthAvailable(available);
      const p = await auth.current();
      playerRef.current = p;
      setPlayer(p);
      await refreshSave(p, available);
      unsub = await auth.onChange((np) => {
        const prev = playerRef.current;
        playerRef.current = np;
        setPlayer(np);
        // Same user id (token refresh or guest→account upgrade) keeps everything; a different user reloads.
        if (prev?.id !== np?.id) refreshSave(np, available);
      });
    })();
    return () => unsub();
  }, [refreshSave]);

  const start = async (d: Difficulty) => {
    setBusy(true);
    setErr(null);
    try {
      const { state } = await api.createSession(d);
      const save = { state };
      storage.save(save);
      setSaved(save);
      setScreen({ name: 'game', save });
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const resume = (s: SaveData | null = storage.load()) => {
    if (!s) return;
    if (s.state.status === 'finished') setScreen({ name: 'final', game: s.state });
    else setScreen({ name: 'game', save: s });
  };

  const toTitle = () => {
    setSaved(storage.load());
    setScreen({ name: 'title' });
  };

  const playAsGuest = async () => {
    setAuthBusy(true);
    setErr(null);
    setAuthNote(null);
    try {
      const p = await auth.guest();
      playerRef.current = p;
      setPlayer(p);
      await refreshSave(p, true);
      setScreen({ name: 'difficulty' }); // fastest path: straight into the game
    } catch (e) {
      setErr(`Couldn't start a guest session: ${(e as Error).message}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const onAuthDone = async (p: Player | null, note?: string) => {
    setDialog(null);
    setAuthNote(note ?? null);
    if (!p) return;
    playerRef.current = p;
    setPlayer(p);
    const s = await refreshSave(p, true);
    if (s && s.state.status === 'playing') resume(s); // signed-in players drop straight back into their active game
  };

  const signOut = async () => {
    await auth.signOut();
    playerRef.current = null;
    setPlayer(null);
    setStorageOwner(null);
    setSaved(null);
    setAuthNote(null);
    setScreen({ name: 'title' });
  };

  const identity = player ? (player.isGuest ? 'GUEST' : player.email ?? 'SIGNED IN') : undefined;

  return (
    <div className="app">
      {screen.name === 'title' && (
        <TitleScreen
          canResume={!!saved}
          onStart={() => setScreen({ name: 'difficulty' })}
          onResume={() => resume(saved)}
          health={health}
          player={player}
          authAvailable={authAvailable}
          authBusy={authBusy}
          authNote={authNote}
          onGuest={playAsGuest}
          onAuth={(m) => { setAuthNote(null); setDialog(m); }}
          onSignOut={signOut}
        />
      )}
      {screen.name === 'difficulty' && <DifficultySelect onPick={start} onBack={toTitle} busy={busy} />}
      {screen.name === 'game' && (
        <GameScreen
          key={screen.save.state.sessionId}
          save={screen.save}
          identity={identity}
          onQuit={toTitle}
          onFinished={(g) => setScreen({ name: 'final', game: g })}
        />
      )}
      {screen.name === 'final' && (
        <FinalScreen
          game={screen.game}
          onPlayAgain={() => { storage.clear(); setSaved(null); setScreen({ name: 'difficulty' }); }}
          onTitle={() => { storage.clear(); setSaved(null); setScreen({ name: 'title' }); }}
        />
      )}
      {dialog && <AuthDialog mode={dialog} onDone={onAuthDone} onClose={() => setDialog(null)} />}
      {err && <div className="toast" onClick={() => setErr(null)}>{err}</div>}
    </div>
  );
}
