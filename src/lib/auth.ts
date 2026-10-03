import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client (public anon key only). Used for Auth (guest/anonymous,
 * email+password, guest→account conversion) and the Realtime leaderboard feed.
 * Config comes from VITE_* build vars or, at runtime, from /api/config.
 */
let clientPromise: Promise<SupabaseClient | null> | null = null;
export function supa(): Promise<SupabaseClient | null> {
  if (clientPromise) return clientPromise;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const make = (u: string, k: string) => createClient(u, k, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sxc-auth' } });
  clientPromise =
    url && anon
      ? Promise.resolve(make(url, anon))
      : fetch('/api/config')
          .then((r) => r.json())
          .then((c) => (c.supabaseUrl && c.supabaseAnonKey ? make(c.supabaseUrl, c.supabaseAnonKey) : null))
          .catch(() => null);
  return clientPromise;
}

export interface Player {
  id: string;
  isGuest: boolean;
  email: string | null;
}

export function toPlayer(s: Session | null): Player | null {
  if (!s?.user) return null;
  const u = s.user as typeof s.user & { is_anonymous?: boolean };
  return { id: u.id, isGuest: !!u.is_anonymous, email: u.email ?? null };
}

export async function accessToken(): Promise<string | null> {
  const sb = await supa();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

const need = async () => {
  const sb = await supa();
  if (!sb) throw new Error('Accounts are not available (Supabase not configured).');
  return sb;
};

export const auth = {
  async current(): Promise<Player | null> {
    const sb = await supa();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return toPlayer(data.session);
  },
  async onChange(cb: (p: Player | null) => void) {
    const sb = await supa();
    if (!sb) return () => {};
    const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toPlayer(s)));
    return () => data.subscription.unsubscribe();
  },
  async guest(): Promise<Player> {
    const sb = await need();
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new Error(error.message);
    return toPlayer(data.session)!;
  },
  async signIn(email: string, password: string): Promise<Player> {
    const sb = await need();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return toPlayer(data.session)!;
  },
  /** New account. Returns needsConfirm when the project requires email confirmation. */
  async signUp(email: string, password: string): Promise<{ player: Player | null; needsConfirm: boolean }> {
    const sb = await need();
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
    if (error) throw new Error(error.message);
    return { player: toPlayer(data.session), needsConfirm: !data.session };
  },
  /**
   * Guest → permanent account, keeping the SAME user id (and therefore all game progress).
   * Supabase's supported flow: updateUser({ email }) on the anonymous user, then set a password
   * once the email is attached (immediately if email confirmation is off).
   */
  async upgradeGuest(email: string, password: string): Promise<{ player: Player | null; needsConfirm: boolean }> {
    const sb = await need();
    const { data, error } = await sb.auth.updateUser({ email }, { emailRedirectTo: location.origin });
    if (error) throw new Error(error.message);
    if (!data.user?.email) return { player: null, needsConfirm: true }; // waiting on the confirmation link
    const pw = await sb.auth.updateUser({ password });
    if (pw.error) throw new Error(pw.error.message);
    const { data: s } = await sb.auth.refreshSession();
    return { player: toPlayer(s.session), needsConfirm: false };
  },
  async signOut() {
    const sb = await supa();
    if (sb) await sb.auth.signOut();
  },
};
