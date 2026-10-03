import { useEffect, useState } from 'react';
import TitleScreen from './components/TitleScreen';
import DifficultySelect from './components/DifficultySelect';
import GameScreen from './components/GameScreen';
import FinalScreen from './components/FinalScreen';
import type { Difficulty, GameState } from './engine/types';
import { api } from './lib/api';
import { storage, type SaveData } from './lib/storage';

type Screen = { name: 'title' } | { name: 'difficulty' } | { name: 'game'; save: SaveData } | { name: 'final'; game: GameState };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [saved, setSaved] = useState<SaveData | null>(() => storage.load());
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.health>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

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

  const resume = () => {
    const s = storage.load();
    if (!s) return;
    if (s.state.status === 'finished') setScreen({ name: 'final', game: s.state });
    else setScreen({ name: 'game', save: s });
  };

  const toTitle = () => {
    setSaved(storage.load());
    setScreen({ name: 'title' });
  };

  return (
    <div className="app">
      {screen.name === 'title' && (
        <TitleScreen canResume={!!saved} onStart={() => setScreen({ name: 'difficulty' })} onResume={resume} health={health} />
      )}
      {screen.name === 'difficulty' && <DifficultySelect onPick={start} onBack={toTitle} busy={busy} />}
      {screen.name === 'game' && (
        <GameScreen
          key={screen.save.state.sessionId}
          save={screen.save}
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
      {err && <div className="toast" onClick={() => setErr(null)}>{err}</div>}
    </div>
  );
}
