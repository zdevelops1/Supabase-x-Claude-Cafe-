/**
 * Emits Vercel Build Output API v3 (.vercel/output): the Vite site as static files
 * and the whole API as ONE pre-bundled CommonJS function. This avoids Vercel's
 * per-file TypeScript compilation (ESM/CJS mismatches) entirely.
 */
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const out = '.vercel/output';
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/static`, { recursive: true });
cpSync('dist', `${out}/static`, { recursive: true });

const fn = `${out}/functions/api/handler.func`;
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: ['server/vercel-handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: `${fn}/index.js`,
  logLevel: 'warning',
});
writeFileSync(`${fn}/.vc-config.json`, JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', maxDuration: 30 }, null, 2));
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/api/([^/?]+)/?$', dest: '/api/handler?route=$1' },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);
console.log('✓ .vercel/output written (static + api/handler function)');
