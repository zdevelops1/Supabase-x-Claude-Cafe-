import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser client uses ONLY the public anon key — read-only access to final_results via RLS.
// Config comes from build-time VITE_* vars, or at runtime from /api/config (works with Vercel's Supabase integration).
let clientPromise: Promise<SupabaseClient | null> | null = null;
function getClient(): Promise<SupabaseClient | null> {
  if (clientPromise) return clientPromise;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  clientPromise = url && anon
    ? Promise.resolve(createClient(url, anon))
    : fetch('/api/config')
        .then((r) => r.json())
        .then((c) => (c.supabaseUrl && c.supabaseAnonKey ? createClient(c.supabaseUrl, c.supabaseAnonKey) : null))
        .catch(() => null);
  return clientPromise;
}

/** Subscribe to new finished games (Realtime). Returns an unsubscribe fn. */
export function onNewResult(cb: () => void): () => void {
  let stop = () => {};
  let cancelled = false;
  getClient().then((sb) => {
    if (!sb || cancelled) return;
    const ch = sb
      .channel('final-results-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'final_results' }, () => cb())
      .subscribe();
    stop = () => { sb.removeChannel(ch); };
  });
  return () => { cancelled = true; stop(); };
}
