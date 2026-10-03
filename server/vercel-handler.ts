// Vercel serverless entry (bundled by scripts/build-vercel.mjs into .vercel/output).
// Plain Node (req, res): no reliance on Vercel request helpers.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRoute } from '../src/server/handlers';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  const route = (url.searchParams.get('route') || url.pathname.replace(/^\/api\//, '')).replace(/\/$/, '');
  const send = (status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  try {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const auth = String(req.headers.authorization || '');
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
    const out = await handleRoute(route, req.method || 'GET', body, token);
    send(out.status, out.body);
  } catch (err) {
    console.error('[api]', err);
    send(500, { error: String((err as Error)?.message || err) });
  }
}
