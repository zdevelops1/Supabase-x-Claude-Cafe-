// CLI: node scripts/verify-live.mjs https://your-app.vercel.app
import { run } from '../public/verify-live.mjs';
const r = await run((process.argv[2] || 'http://localhost:5173').replace(/\/$/, ''));
console.log(JSON.stringify(r, null, 2));
process.exit(Object.values(r).some((v) => String(v).startsWith('FAIL')) ? 1 : 0);
