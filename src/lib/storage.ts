import type { GameState } from '../engine/types';
import type { SealedDecision } from './api';

const BASE = 'sxc-cafe-save-v1';
let owner = 'local';
/** Saves are scoped per player so two accounts on one browser never see each other's game. */
export function setStorageOwner(id: string | null) { owner = id || 'local'; }
const key = () => `${BASE}:${owner}`;
export interface SaveData {
  state: GameState;
  pending?: SealedDecision;
}
export const storage = {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(key());
      const d = raw ? (JSON.parse(raw) as SaveData) : null;
      return d?.state?.version === 1 ? d : null;
    } catch {
      return null;
    }
  },
  save(d: SaveData) {
    try { localStorage.setItem(key(), JSON.stringify(d)); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(key()); } catch { /* ignore */ }
  },
};
