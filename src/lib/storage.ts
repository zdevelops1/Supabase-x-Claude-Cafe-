import type { ClaudeDecision, GameState } from '../engine/types';

const KEY = 'sxc-cafe-save-v1';
export interface SaveData {
  state: GameState;
  pending?: { roundIndex: number; decision: ClaudeDecision };
}
export const storage = {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      const d = raw ? (JSON.parse(raw) as SaveData) : null;
      return d?.state?.version === 1 ? d : null;
    } catch {
      return null;
    }
  },
  save(d: SaveData) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  },
};
