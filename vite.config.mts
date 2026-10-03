import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only plugin: serves /api/* using the same server handlers that Vercel
 * runs in production (api/[route].ts). Keeps secrets on the server.
 */
function apiDevServer(): Plugin {
  return {
    name: 'cafe-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        const route = req.url.replace(/^\/api\//, '').split('?')[0];
        try {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          const body = raw ? JSON.parse(raw) : {};
          const mod = await server.ssrLoadModule('/src/server/handlers.ts');
          const auth = String(req.headers.authorization || '');
          const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
          const out = await mod.handleRoute(route, req.method || 'GET', body, token);
          res.statusCode = out.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(out.body));
        } catch (err) {
          console.error('[api]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String((err as Error)?.message || err) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose ALL .env vars to server-side code in dev (never to the client bundle;
  // only VITE_* vars are inlined into browser code).
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
  return { plugins: [react(), apiDevServer()], server: { host: true, port: 5173 } };
});
