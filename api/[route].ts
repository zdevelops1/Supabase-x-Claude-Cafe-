// Vercel serverless entry: /api/:route → shared server handlers (same code the Vite dev server runs).
import { handleRoute } from '../src/server/handlers';

export default async function handler(req: any, res: any) {
  const route = String(req.query?.route ?? '');
  try {
    let body = req.body;
    if (typeof body === 'string') body = body ? JSON.parse(body) : {};
    const out = await handleRoute(route, req.method || 'GET', body ?? {});
    res.status(out.status).json(out.body);
  } catch (err) {
    console.error('[api]', err);
    res.status(500).json({ error: String((err as Error)?.message || err) });
  }
}
