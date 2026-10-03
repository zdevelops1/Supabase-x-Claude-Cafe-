import { supa } from './auth';

/** Subscribe to new finished games (Realtime). Returns an unsubscribe fn. */
export function onNewResult(cb: () => void): () => void {
  let stop = () => {};
  let cancelled = false;
  supa().then((sb) => {
    if (!sb || cancelled) return;
    const ch = sb
      .channel('final-results-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'final_results' }, () => cb())
      .subscribe();
    stop = () => { sb.removeChannel(ch); };
  });
  return () => { cancelled = true; stop(); };
}
