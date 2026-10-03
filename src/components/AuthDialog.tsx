import { useState } from 'react';
import { Portrait } from './CafeScene';
import { auth, type Player } from '../lib/auth';
import { sfx } from '../lib/sfx';

export type AuthMode = 'signin' | 'signup' | 'upgrade';

const COPY: Record<AuthMode, { title: string; sub: string; cta: string }> = {
  signin: { title: 'SIGN IN', sub: 'Welcome back, barista. Your café is waiting.', cta: '▶ SIGN IN' },
  signup: { title: 'CREATE ACCOUNT', sub: 'Save your café to an account and continue on any device.', cta: '▶ CREATE ACCOUNT' },
  upgrade: { title: 'SAVE YOUR PROGRESS', sub: 'Turn this Guest café into an account — your current game comes with you.', cta: '▶ CREATE ACCOUNT' },
};

export default function AuthDialog({
  mode: initial,
  onDone,
  onClose,
}: {
  mode: AuthMode;
  onDone: (p: Player | null, note?: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const c = COPY[mode];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setNote(null);
    if (!email.includes('@')) return setErr('Enter a valid email.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    sfx.click();
    try {
      if (mode === 'signin') {
        onDone(await auth.signIn(email.trim(), password));
      } else if (mode === 'signup') {
        const r = await auth.signUp(email.trim(), password);
        if (r.needsConfirm) setNote('Check your inbox and click the confirmation link, then sign in.');
        else onDone(r.player);
      } else {
        const r = await auth.upgradeGuest(email.trim(), password);
        if (r.needsConfirm) setNote('Check your inbox and click the confirmation link — your guest progress stays linked to it.');
        else onDone(r.player, 'Account created — your guest progress is saved to it.');
      }
    } catch (ex) {
      setErr(String((ex as Error).message || ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="auth-dialog dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="auth-head">
          <div className="mini-portrait"><Portrait side="supabase" /></div>
          <div>
            <div className="auth-title">{c.title}</div>
            <div className="auth-sub">{c.sub}</div>
          </div>
        </div>
        <label className="auth-field">
          <span>EMAIL</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="barista@cafe.dev" />
        </label>
        <label className="auth-field">
          <span>PASSWORD</span>
          <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" />
        </label>
        {err && <div className="auth-err">⚠ {err}</div>}
        {note && <div className="auth-note">✉ {note}</div>}
        <button className="pixel-btn big gold" type="submit" disabled={busy}>{busy ? 'ONE MOMENT…' : c.cta}</button>
        <div className="auth-links">
          {mode === 'signin' && <button type="button" onClick={() => setMode('signup')}>New here? Create an account</button>}
          {mode === 'signup' && <button type="button" onClick={() => setMode('signin')}>Have an account? Sign in</button>}
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
