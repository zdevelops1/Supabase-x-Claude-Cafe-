import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { ClaudeDecision } from '../engine/types';

/**
 * Sealed decisions: Claude's choice is encrypted server-side (AES-256-GCM) before it
 * reaches the browser. The client only holds an opaque token until the human commits,
 * so the move can't be peeked at in DevTools or forged on /api/resolve.
 */
function key(): Buffer {
  const material =
    process.env.SEAL_SECRET ||
    `${process.env.ANTHROPIC_API_KEY ?? ''}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}|sxc-seal-v1`;
  return createHash('sha256').update(material).digest();
}

export interface SealPayload {
  sessionId: string;
  roundIndex: number;
  decision: ClaudeDecision;
}

export function seal(p: SealPayload): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(p), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}

export function unseal(token: string): SealPayload {
  const [iv, tag, enc] = String(token).split('.').map((s) => Buffer.from(s, 'base64url'));
  if (!iv || !tag || !enc) throw new Error('Malformed sealed decision');
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  const out = Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  return JSON.parse(out) as SealPayload;
}
