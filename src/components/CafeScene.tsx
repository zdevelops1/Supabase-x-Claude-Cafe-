import type { ReactNode } from 'react';
import type { Side, Slot } from '../engine/types';

/**
 * Luxe pixel-art café interior, drawn entirely with SVG rects (crispEdges) on a 240×150 grid.
 * `queue` / `seated` come from real game state (customers served / market share),
 * so a café that's winning the market visibly fills up.
 */

export const THEMES = {
  supabase: {
    wall: '#0d3a2b', wallMid: '#11483a', wallDark: '#082419', panel: '#0f4232', accent: '#3ecf8e', accentLight: '#8af0c2', accentDark: '#1f8a5b',
    velvet: '#1c7a52', velvetDark: '#0f4e34', velvetLight: '#2fa06c', rug: '#0f4a35', rugInner: '#12583f', apron: '#249a66',
    sign: 'SUPABASE CAFÉ', tagline: 'GOOD APIS · BETTER COFFEE', flower: '#7ff0bd',
  },
  claude: {
    wall: '#3d1d12', wallMid: '#4c2618', wallDark: '#25110a', panel: '#46221a', accent: '#e8875f', accentLight: '#ffc2a3', accentDark: '#b5582f',
    velvet: '#b8592f', velvetDark: '#7d3a1d', velvetLight: '#d8784a', rug: '#55251a', rugInner: '#66301f', apron: '#d97757',
    sign: 'CLAUDE CAFÉ', tagline: 'THINK DEEPER · TOGETHER', flower: '#f08a3c',
  },
} as const;
type Theme = (typeof THEMES)[Side];

const GOLD = '#d9ad4f';
const GOLD_L = '#f6d98a';
const GOLD_D = '#8f6a22';
const MARBLE = '#efe9dd';
const MARBLE_2 = '#d9d1c2';
const MARBLE_VEIN = '#c2b8a6';
const WOOD = '#2a1a12';
const WOOD_2 = '#3a2618';
const CREAM = '#f3e3c3';
const SKINS = ['#f1c7a1', '#d9a07a', '#a96f4b', '#7a4a2e', '#ffdcb8', '#c68b62'];
const HAIRS = ['#2b1b12', '#5a3418', '#141414', '#c08a3e', '#7a2b1a', '#3b3b4a', '#e8d27a'];
const SHIRTS = ['#4a7bd1', '#d14a6b', '#e2c044', '#6bb36b', '#9b59b6', '#e67e22', '#ecf0f1', '#34495e', '#16a3a3'];

const R = (x: number, y: number, w: number, h: number, fill: string, key?: string | number, extra?: Record<string, unknown>) => (
  <rect key={key} x={x} y={y} width={w} height={h} fill={fill} {...extra} />
);

/* ─────────────── people ─────────────── */
/** Chibi customer sprite (12×20 grid) with dark outline + shading, sized to match the painted guests. */
export function Person({ i, x, y, seated = false, flip = false }: { i: number; x: number; y: number; seated?: boolean; flip?: boolean }) {
  const O = '#1b120c';
  const skin = SKINS[i % SKINS.length];
  const hair = HAIRS[(i * 3 + 1) % HAIRS.length];
  const shirt = SHIRTS[(i * 5 + 2) % SHIRTS.length];
  const long = i % 3 === 1;
  const bun = i % 4 === 2;
  return (
    <g transform={`translate(${x} ${y})${flip ? ' scale(-1 1) translate(-12 0)' : ''}`}>
      {/* head */}
      {bun && R(4, -2, 4, 3, O)}
      {bun && R(5, -1, 2, 2, hair)}
      {R(1, 0, 10, 10, O)}
      {R(2, 1, 8, 4, hair)}
      {R(2, 3, 8, 6, skin)}
      {R(2, 3, 8, 1, hair)}
      {R(2, 4, 1, 3, hair)}
      {R(9, 4, 1, 3, hair)}
      {long && R(1, 5, 1, 7, O)}
      {long && R(10, 5, 1, 7, O)}
      {long && R(2, 7, 1, 4, hair)}
      {long && R(9, 7, 1, 4, hair)}
      {R(4, 5, 1, 2, '#1d1d1d')}
      {R(7, 5, 1, 2, '#1d1d1d')}
      {R(4, 5, 1, 1, '#ffffff')}
      {R(7, 5, 1, 1, '#ffffff')}
      {R(3, 7, 1, 1, '#f2a3a0')}
      {R(8, 7, 1, 1, '#f2a3a0')}
      {R(5, 8, 2, 1, '#b4584c')}
      {R(3, 1, 3, 1, 'rgba(255,255,255,0.22)')}
      {/* body */}
      {R(1, 10, 10, seated ? 6 : 7, O)}
      {R(2, 10, 8, seated ? 5 : 6, shirt)}
      {R(2, seated ? 13 : 14, 8, 2, 'rgba(0,0,0,0.22)')}
      {R(5, 10, 2, 1, 'rgba(255,255,255,0.7)')}
      {R(1, 13, 1, 2, skin)}
      {R(10, 13, 1, 2, skin)}
      {seated ? (
        <>
          {R(2, 15, 8, 2, O)}
          {R(3, 15, 6, 1, '#2c3e50')}
        </>
      ) : (
        <>
          {R(2, 16, 8, 4, O)}
          {R(3, 16, 2, 3, '#2c3e50')}
          {R(7, 16, 2, 3, '#2c3e50')}
          {R(3, 19, 2, 1, '#0d0d0d')}
          {R(7, 19, 2, 1, '#0d0d0d')}
        </>
      )}
    </g>
  );
}

function HumanBarista({ t }: { t: Theme }) {
  return (
    <g className="barista">
      {R(3, -3, 8, 3, '#4a2a14')}
      {R(5, -6, 4, 3, '#4a2a14')}
      {R(2, 0, 10, 7, '#f1c7a1')}
      {R(2, 0, 10, 2, '#4a2a14')}
      {R(4, 3, 2, 2, '#1d1d1d')}
      {R(8, 3, 2, 2, '#1d1d1d')}
      {R(3, 5, 1, 1, '#f0a3a3')}
      {R(10, 5, 1, 1, '#f0a3a3')}
      {R(6, 6, 2, 1, '#b5483f')}
      {R(1, 7, 12, 9, '#f4f4f4')}
      {R(3, 8, 8, 8, t.apron)}
      {R(5, 10, 4, 3, t.accentLight)}
      {R(-1, 8, 2, 6, '#f1c7a1')}
      {R(13, 8, 2, 6, '#f1c7a1')}
    </g>
  );
}

function RobotBarista({ t, busy }: { t: Theme; busy: boolean }) {
  return (
    <g className="barista">
      {R(6, -9, 1, 4, '#9aa0a6')}
      <rect x={5} y={-11} width={3} height={3} fill={busy ? '#ffd2b8' : t.accent} className={busy ? 'blink' : ''} />
      {R(1, -5, 12, 11, '#f5f5f5')}
      {R(0, -3, 1, 6, '#d6d6d6')}
      {R(13, -3, 1, 6, '#d6d6d6')}
      {R(2, -3, 10, 6, '#1b1c24')}
      <rect x={3} y={-2} width={3} height={3} fill={t.accent} className={busy ? 'scan' : ''} />
      <rect x={8} y={-2} width={3} height={3} fill={t.accent} className={busy ? 'scan' : ''} />
      {R(5, 2, 4, 1, t.accentDark)}
      {R(1, 6, 12, 10, '#e8e8e8')}
      {R(3, 7, 8, 9, t.apron)}
      {R(6, 9, 2, 5, '#fff')}
      {R(4, 11, 6, 1, '#fff')}
      {R(-2, 7, 3, 6, '#d6d6d6')}
      {R(13, 7, 3, 6, '#d6d6d6')}
    </g>
  );
}

/* ─────────────── decor ─────────────── */
function Logo({ side, s = 1 }: { side: Side; s?: number }) {
  if (side === 'supabase') {
    return (
      <g transform={`scale(${s})`}>
        <polygon points="8,0 0,12 7,12 4,22 14,8 7,8 11,0" fill="#3ecf8e" />
        <polygon points="8,0 0,12 4,12 8,5" fill="#9cf5cf" opacity="0.7" />
      </g>
    );
  }
  return (
    <g transform={`translate(${7 * s} ${11 * s}) scale(${s})`}>
      {[0, 30, 60, 90, 120, 150].map((a) => (
        <rect key={a} x={-1.5} y={-11} width={3} height={22} fill="#e8875f" transform={`rotate(${a})`} />
      ))}
      <rect x={-3} y={-3} width={6} height={6} fill="#ffc2a3" />
    </g>
  );
}

function Plant({ x, y, tall = false, flower }: { x: number; y: number; tall?: boolean; flower?: string }) {
  const h = tall ? 18 : 9;
  return (
    <g transform={`translate(${x} ${y - h})`}>
      {R(4, 2, 2, h - 2, '#2f6b2f')}
      {R(0, 0, 4, 3, '#3fa34d')}
      {R(6, 1, 5, 3, '#3fa34d')}
      {R(-1, 4, 5, 2, '#2f7d32')}
      {R(6, 5, 5, 2, '#2f7d32')}
      {tall && R(0, 9, 4, 2, '#3fa34d')}
      {tall && R(6, 11, 5, 2, '#3fa34d')}
      {R(3, -2, 4, 3, '#4fbf5d')}
      {flower && R(1, -1, 2, 2, flower)}
      {flower && R(8, 3, 2, 2, flower)}
      {flower && tall && R(-1, 8, 2, 2, flower)}
      {R(1, h, 8, 6, GOLD)}
      {R(1, h, 8, 1, GOLD_L)}
      {R(2, h + 6, 6, 1, GOLD_D)}
    </g>
  );
}

function Lamp({ x, len = 8 }: { x: number; len?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <polygon points={`2,${len + 5} 6,${len + 5} 18,${len + 48} -10,${len + 48}`} fill="#ffe7a3" opacity="0.07" />
      {R(3, 0, 1, len, '#2a2a2a')}
      {R(0, len, 7, 2, GOLD_D)}
      {R(-1, len + 2, 9, 3, GOLD)}
      {R(-1, len + 2, 9, 1, GOLD_L)}
      <rect x={1} y={len + 5} width={5} height={2} fill="#fff1bf" className="lamp" />
    </g>
  );
}

function Sconce({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={2} cy={2} r={6} fill="#ffe7a3" opacity="0.1" />
      {R(1, 4, 2, 4, GOLD_D)}
      {R(0, 0, 4, 4, '#fff1bf')}
      {R(-1, 3, 6, 1, GOLD)}
    </g>
  );
}

function Window({ x, slot }: { x: number; slot: Slot }) {
  const sky = slot === 'Evening' ? ['#141c45', '#28356f'] : slot === 'Afternoon' ? ['#f09a52', '#ffd08e'] : ['#7fc8ec', '#cbeefc'];
  return (
    <g transform={`translate(${x} 8)`}>
      {R(0, 2, 28, 40, GOLD_D)}
      {R(2, 0, 24, 2, GOLD_D)}
      {R(1, 3, 26, 38, sky[0])}
      {R(1, 26, 26, 15, sky[1])}
      {slot === 'Evening' ? (
        <>
          {R(5, 7, 1, 1, '#fff')}
          {R(19, 11, 1, 1, '#fff')}
          {R(12, 5, 1, 1, '#fff')}
          {R(18, 5, 5, 5, '#f4f1d0')}
          {R(19, 6, 3, 3, '#141c45', undefined, { opacity: 0.4 })}
        </>
      ) : (
        <>
          {R(17, 7, 6, 6, slot === 'Afternoon' ? '#fff0c0' : '#fff3a0')}
          {R(3, 11, 9, 2, '#fff')}
          {R(5, 10, 4, 1, '#fff')}
        </>
      )}
      {/* skyline */}
      {R(1, 30, 5, 11, '#0c1430', undefined, { opacity: slot === 'Evening' ? 1 : 0.35 })}
      {R(7, 25, 6, 16, '#0c1430', undefined, { opacity: slot === 'Evening' ? 1 : 0.35 })}
      {R(14, 28, 5, 13, '#0c1430', undefined, { opacity: slot === 'Evening' ? 1 : 0.35 })}
      {R(20, 22, 7, 19, '#0c1430', undefined, { opacity: slot === 'Evening' ? 1 : 0.35 })}
      {slot === 'Evening' && [
        [9, 28], [10, 32], [16, 31], [22, 26], [24, 30], [22, 34], [3, 33],
      ].map(([wx, wy]) => R(wx, wy, 1, 1, '#ffd36b', `${wx}-${wy}`))}
      {R(13, 3, 2, 38, GOLD_D)}
      {R(1, 20, 26, 1, GOLD_D)}
      {R(-1, 41, 30, 2, GOLD)}
    </g>
  );
}

function MenuBoard({ x, t }: { x: number; t: Theme }) {
  return (
    <g transform={`translate(${x} 14)`}>
      {R(-1, -1, 30, 26, GOLD_D)}
      {R(0, 0, 28, 24, '#141414')}
      {R(0, 0, 28, 1, GOLD)}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          {R(3, 4 + i * 4, 12 - (i % 3) * 2, 1, '#e6e6e6')}
          {R(22, 4 + i * 4, 3, 1, t.accent)}
        </g>
      ))}
      {R(12, 22, 4, 1, t.accent)}
    </g>
  );
}

function Shelf({ x, t }: { x: number; t: Theme }) {
  const jars = [CREAM, '#7a4a2e', t.accent, '#c98a4b', '#e8e8e8', '#5a3418', t.accentLight];
  return (
    <g transform={`translate(${x} 44)`}>
      {jars.map((c, i) => (
        <g key={i}>
          {R(i * 6, -5, 4, 5, c)}
          {R(i * 6, -6, 4, 1, '#9aa0a6')}
        </g>
      ))}
      {R(-2, 0, 44, 2, GOLD)}
      {R(-2, 2, 44, 1, GOLD_D)}
    </g>
  );
}

function EspressoMachine({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 50)`}>
      {R(0, 0, 20, 12, '#c5c8cc')}
      {R(0, 0, 20, 2, '#eef0f2')}
      {R(1, 2, 18, 1, '#9aa0a6')}
      {R(2, 4, 4, 2, '#e85d4a')}
      {R(14, 4, 4, 2, '#49c06b')}
      {R(4, 8, 3, 4, '#333')}
      {R(13, 8, 3, 4, '#333')}
      {R(4, 12, 3, 1, CREAM)}
      {R(13, 12, 3, 1, CREAM)}
      {R(8, -3, 4, 3, GOLD)}
      <rect x={6} y={-6} width={1} height={3} fill="#fff" className="steam" />
      <rect x={12} y={-7} width={1} height={3} fill="#fff" className="steam s2" />
    </g>
  );
}

function PastryCase({ x }: { x: number }) {
  const pastries = ['#d18b47', '#e8b04f', '#b55a3a', '#f2d29b', '#c46b3c', '#e2a85c'];
  return (
    <g transform={`translate(${x} 48)`}>
      {R(0, 0, 26, 14, '#cfe8ee', undefined, { opacity: 0.85 })}
      {R(0, 0, 26, 1, '#ffffff')}
      {R(0, 6, 26, 1, GOLD)}
      {pastries.map((c, i) => R(2 + (i % 3) * 8, i < 3 ? 2 : 8, 6, 3, c, i))}
      {R(0, 13, 26, 1, GOLD_D)}
    </g>
  );
}

function Register({ x, t, ching }: { x: number; t: Theme; ching: boolean }) {
  return (
    <g transform={`translate(${x} 51)`} className={ching ? 'register-ching' : ''}>
      {R(0, 3, 14, 8, '#2e2e2e')}
      {R(2, -1, 10, 5, '#1a1a1a')}
      {R(3, 0, 8, 3, t.accent)}
      {[0, 1, 2].map((i) => R(2 + i * 4, 6, 2, 1, '#bbb', i))}
      {R(0, 11, 14, 1, GOLD)}
    </g>
  );
}

function Counter({ t, children }: { t: Theme; children?: ReactNode }) {
  return (
    <g>
      {/* marble top */}
      {R(54, 62, 132, 4, MARBLE)}
      {R(54, 62, 132, 1, '#ffffff')}
      {[62, 88, 121, 150, 172].map((vx) => R(vx, 63, 7, 1, MARBLE_VEIN, vx))}
      {R(54, 66, 132, 1, GOLD)}
      {/* wood front with gold-framed panels */}
      {R(56, 67, 128, 20, WOOD)}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          {R(59 + i * 16, 70, 12, 14, WOOD_2)}
          {R(59 + i * 16, 70, 12, 1, GOLD_D)}
          {R(59 + i * 16, 83, 12, 1, GOLD_D)}
          {R(64 + i * 16, 75, 2, 4, t.accentDark, undefined, { opacity: 0.6 })}
        </g>
      ))}
      {R(56, 86, 128, 1, GOLD)}
      {children}
    </g>
  );
}

function Table({ x, y, t, guests, startIdx }: { x: number; y: number; t: Theme; guests: number; startIdx: number }) {
  const chair = (cx: number) => (
    <g>
      {R(cx, 0, 9, 12, t.velvet)}
      {R(cx, 0, 9, 3, t.velvetDark)}
      {R(cx + 1, 3, 7, 1, t.velvetLight)}
      {R(cx - 1, 5, 2, 7, t.velvetDark)}
      {R(cx + 8, 5, 2, 7, t.velvetDark)}
      {R(cx + 1, 12, 1, 2, GOLD_D)}
      {R(cx + 7, 12, 1, 2, GOLD_D)}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`}>
      {chair(-12)}
      {chair(17)}
      {guests > 0 && <Person i={startIdx} x={-11} y={-4} seated />}
      {guests > 1 && <Person i={startIdx + 1} x={18} y={-4} seated flip />}
      {/* marble table */}
      {R(0, 5, 14, 3, MARBLE)}
      {R(0, 5, 14, 1, '#fff')}
      {R(0, 8, 14, 1, MARBLE_2)}
      {R(6, 9, 2, 6, GOLD_D)}
      {R(3, 15, 8, 1, GOLD)}
      {/* candle */}
      {R(6, 2, 2, 3, CREAM)}
      <rect x={6.5} y={0} width={1} height={2} fill="#ffcf5a" className="lamp" />
      <circle cx={7} cy={1} r={4} fill="#ffcf5a" opacity="0.15" />
      {guests > 0 && (
        <g>
          {R(2, 3, 3, 2, CREAM)}
          <rect x={3} y={0} width={1} height={2} fill="#fff" className="steam" />
        </g>
      )}
      {guests > 1 && (
        <g>
          {R(9, 3, 3, 2, CREAM)}
          <rect x={10} y={0} width={1} height={2} fill="#fff" className="steam s2" />
        </g>
      )}
    </g>
  );
}

function Floor() {
  const tiles: ReactNode[] = [];
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 24; x++)
      tiles.push(R(x * 10, 88 + y * 9, 10, 9, (x + y) % 2 ? MARBLE : MARBLE_2, `${x}-${y}`));
  return (
    <g>
      {tiles}
      {/* gold grout inlays */}
      {Array.from({ length: 8 }, (_, y) => R(0, 88 + y * 9, 240, 1, GOLD, `gy${y}`, { opacity: 0.35 }))}
    </g>
  );
}

function Rug({ t, side }: { t: Theme; side: Side }) {
  return (
    <g>
      {R(64, 102, 112, 44, GOLD_D)}
      {R(65, 103, 110, 42, t.rug)}
      {R(68, 106, 104, 36, t.rugInner)}
      {R(68, 106, 104, 1, t.accent, undefined, { opacity: 0.5 })}
      {R(68, 141, 104, 1, t.accent, undefined, { opacity: 0.5 })}
      <g transform="translate(113 114)" opacity="0.55">
        <Logo side={side} s={0.75} />
      </g>
    </g>
  );
}

/* ─────────────── illustrated scene + live overlay layer ───────────────
 * The café interiors are the project's own concept art (public/art/*.webp, cropped so no
 * baked-in UI remains). Everything dynamic is drawn on top in the art's own coordinate
 * space (665×486): walk-in customers (count = customers served), extra seated guests
 * (driven by market share), lamp/candle flicker, espresso steam, the robot's "thinking"
 * glow and a register flash when a round resolves.
 */
type Pt = { x: number; y: number };
const ART: Record<Side, {
  src: string;
  queue: Pt[]; // feet positions for walk-in customers
  seats: Pt[]; // empty armchairs (sprite top-left)
  lamps: Array<Pt & { r: number }>;
  steam: Pt;
  barista: Pt;
  register: Pt;
  enter: number; // x the walkers come from
}> = {
  supabase: {
    src: '/art/supabase-cafe.webp',
    queue: [{ x: 430, y: 356 }, { x: 386, y: 360 }, { x: 342, y: 356 }, { x: 604, y: 350 }, { x: 298, y: 362 }, { x: 646, y: 356 }],
    seats: [{ x: 386, y: 404 }, { x: 524, y: 408 }],
    lamps: [{ x: 258, y: 32, r: 46 }, { x: 604, y: 36, r: 46 }, { x: 66, y: 138, r: 40 }, { x: 360, y: 452, r: 30 }, { x: 585, y: 458, r: 30 }],
    steam: { x: 516, y: 150 },
    barista: { x: 466, y: 168 },
    register: { x: 440, y: 222 },
    enter: 700,
  },
  claude: {
    src: '/art/claude-cafe.webp',
    queue: [{ x: 250, y: 356 }, { x: 294, y: 360 }, { x: 338, y: 356 }, { x: 58, y: 350 }, { x: 382, y: 362 }, { x: 20, y: 356 }],
    seats: [{ x: 110, y: 404 }, { x: 238, y: 408 }],
    lamps: [{ x: 60, y: 34, r: 46 }, { x: 406, y: 36, r: 46 }, { x: 598, y: 146, r: 40 }, { x: 76, y: 458, r: 30 }, { x: 302, y: 454, r: 30 }],
    steam: { x: 236, y: 176 },
    barista: { x: 195, y: 166 },
    register: { x: 222, y: 224 },
    enter: -40,
  },
};

const SLOT_TINT: Record<Slot, { color: string; opacity: number; blend: string }> = {
  Morning: { color: '#fff3d6', opacity: 0.1, blend: 'soft-light' },
  Afternoon: { color: '#ff9d4a', opacity: 0.1, blend: 'soft-light' },
  Evening: { color: '#0b1030', opacity: 0.12, blend: 'multiply' },
};

export default function CafeScene({
  side,
  slot,
  queue,
  seated,
  busy = false,
  bump = 0,
  cover = false,
}: {
  side: Side;
  slot: Slot;
  queue: number;
  seated: number;
  busy?: boolean;
  bump?: number;
  /** Fill the box edge-to-edge (title/final backdrops) instead of fitting the whole interior. */
  cover?: boolean;
}) {
  const a = ART[side];
  const t = THEMES[side];
  const q = Math.max(0, Math.min(a.queue.length, queue));
  const extra = Math.max(0, Math.min(a.seats.length, seated));
  const tint = SLOT_TINT[slot];
  const S = 3.3; // sprite scale → ~66px chibis, matching the painted guests
  return (
    <span className={`scene-art ${side}`} style={{ backgroundImage: `url(${a.src})` }}>
    <svg className={`cafe-scene art ${side}`} viewBox="0 0 665 486" preserveAspectRatio={cover ? (side === 'supabase' ? 'xMaxYMid slice' : 'xMinYMid slice') : side === 'supabase' ? 'xMaxYMid meet' : 'xMinYMid meet'} role="img" aria-label={`${t.sign} interior`}>
      <defs>
        <radialGradient id={`lamp-${side}`}>
          <stop offset="0%" stopColor="#ffe7a8" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffcf73" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffcf73" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`think-${side}`}>
          <stop offset="0%" stopColor="#ffb38a" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#e8875f" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e8875f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`vig-${side}`} cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.38" />
        </radialGradient>
      </defs>

      <image href={a.src} x={0} y={0} width={665} height={486} preserveAspectRatio="none" />

      {/* warm light flicker */}
      <g className="lights" style={{ mixBlendMode: 'screen' } as React.CSSProperties}>
        {a.lamps.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={`url(#lamp-${side})`} className="glow" style={{ animationDelay: `${(i * 0.7) % 3}s` }} />
        ))}
      </g>

      {/* espresso steam */}
      <g className="steam-wisps" transform={`translate(${a.steam.x} ${a.steam.y})`}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={i * 5 - 5} y={0} width={3} height={6} fill="#fff" className="wisp" style={{ animationDelay: `${i * 0.55}s` }} />
        ))}
      </g>

      {/* robot thinking glow / barista sparkle */}
      {side === 'claude' && busy && (
        <g>
          <circle cx={a.barista.x} cy={a.barista.y} r={52} fill={`url(#think-${side})`} className="think-pulse" style={{ mixBlendMode: 'screen' } as React.CSSProperties} />
          <g transform={`translate(${a.barista.x - 10} ${a.barista.y - 62})`} className="think-dots">
            <rect x={0} y={0} width={5} height={5} fill="#ffc2a3" />
            <rect x={9} y={0} width={5} height={5} fill="#ffc2a3" />
            <rect x={18} y={0} width={5} height={5} fill="#ffc2a3" />
          </g>
        </g>
      )}
      {side === 'supabase' && (
        <g className="sparkle" transform={`translate(${a.barista.x + 26} ${a.barista.y - 30})`}>
          <rect x={2} y={0} width={2} height={6} fill="#c9ffe6" />
          <rect x={0} y={2} width={6} height={2} fill="#c9ffe6" />
        </g>
      )}

      {/* register flash when a round resolves */}
      {bump > 0 && (
        <circle key={`flash-${bump}`} cx={a.register.x} cy={a.register.y} r={34} fill={`url(#lamp-${side})`} className="register-flash" style={{ mixBlendMode: 'screen' } as React.CSSProperties} />
      )}

      {/* extra seated guests: tables fill as market share grows */}
      <g shapeRendering="crispEdges">
        {a.seats.slice(0, extra).map((p, i) => (
          <g key={`seat-${i}-${bump}`} className="seat-in" transform={`translate(${p.x} ${p.y}) scale(${S})`}>
            <Person i={i * 3 + (side === 'claude' ? 5 : 2)} x={0} y={0} seated flip={side === 'supabase' ? i === 0 : i === 1} />
          </g>
        ))}
      </g>

      {/* walk-in customers (count = customers this café served) */}
      <g shapeRendering="crispEdges">
        {a.queue.slice(0, q).map((p, i) => (
          <g
            key={`q-${i}-${queue}-${bump}`}
            className="walker"
            style={{ ['--from' as string]: `${a.enter - p.x}px`, animationDelay: `${i * 0.16}s` } as React.CSSProperties}
          >
            <ellipse cx={p.x} cy={p.y} rx={17} ry={5} fill="#000" opacity={0.3} />
            <g transform={`translate(${p.x - 19.8} ${p.y - 66}) scale(${S})`}>
              <g className="bob" style={{ animationDelay: `${i * 0.13}s` }}>
                <Person i={i + (side === 'claude' ? 4 : 0)} x={0} y={0} flip={side === 'claude'} />
              </g>
            </g>
          </g>
        ))}
      </g>

      {/* time of day + soft vignette */}
      <rect x={0} y={0} width={665} height={486} fill={tint.color} opacity={tint.opacity} style={{ mixBlendMode: tint.blend } as React.CSSProperties} />
      <rect x={0} y={0} width={665} height={486} fill={`url(#vig-${side})`} />
    </svg>
    </span>
  );
}

/* ─────────────── portraits for UI panels ─────────────── */
export function Portrait({ side, busy = false }: { side: Side; busy?: boolean }) {
  return (
    <span className={`portrait ${side} ${busy ? 'busy' : ''}`} aria-hidden="true">
      <img src={side === 'supabase' ? '/art/barista.webp' : '/art/robot.webp'} alt="" draggable={false} />
    </span>
  );
}
