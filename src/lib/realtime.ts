import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser client uses ONLY the public anon key — read-only access to final_results via RLS.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const browserSupabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

/** Subscribe to new finished games (Realtime). Returns an unsubscribe fn. */
export function onNewResult(cb: () => void): () => void {
  if (!browserSupabase) return () => {};
  const ch = browserSupabase
    .channel('final-results-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'final_results' }, () => cb())
    .subscribe();
  return () => { browserSupabase?.removeChannel(ch); };
}
