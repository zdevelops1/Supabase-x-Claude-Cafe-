import type { Side, Slot } from '../engine/types';

/**
 * Pixel-art café scene drawn entirely with SVG rects (crispEdges) on a 200×120 grid.
 * `queue` / `seated` drive how busy the café looks — more customers = winning the market.
 */

const THEMES = {
  supabase: {
    wall: '#0f3326', wallDark: '#0a241b', wallLine: '#164a37', accent: '#3ecf8e', accentDark: '#1f8a5b',
    chair: '#1e6b4a', chairDark: '#134a33', rug: '#145238', rugEdge: '#3ecf8e', apron: '#249a66', sign: 'SUPABASE',
  },
  claude: {
    wall: '#3a1a10', wallDark: '#2a120b', wallLine: '#4f2516', accent: '#e8875f', accentDark: '#b5582f',
    chair: '#b5582f', chairDark: '#7d3a1d', rug: '#5a2716', rugEdge: '#e8875f', apron: '#d97757', sign: 'CLAUDE',
  },
} as const;

const GOLD = '#d9ad4f';
const GOLD_D = '#9c7426';
const CREAM = '#f3e3c3';
const SKINS = ['#f1c7a1', '#d9a07a', '#a96f4b', '#7a4a2e', '#ffdcb8'];
const HAIRS = ['#2b1b12', '#5a3418', '#111', '#c08a3e', '#7a2b1a', '#3b3b4a'];
const SHIRTS = ['#4a7bd1', '#d14a6b', '#e2c044', '#6bb36b', '#9b59b6', '#e67e22', '#ecf0f1', '#34495e'];

function R(x: number, y: number, w: number, h: number, fill: string, key?: string | number) {
  return <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />;
}

function Person({ i, x, y, seated = false }: { i: number; x: number; y: number; seated?: boolean }) {
  const skin = SKINS[i % SKINS.length];
  const hair = HAIRS[(i * 3) % HAIRS.length];
  const shirt = SHIRTS[(i * 5 + 2) % SHIRTS.length];
  return (
    <g transform={`translate(${x} ${y})`}>
      {R(1, 0, 4, 2, hair)}
      {R(1, 2, 4, 3, skin)}
      {R(0, 1, 1, 3, hair)}
      {R(2, 3, 1, 1, '#222')}
      {R(4, 3, 1, 1, '#222')}
      {R(0, 5, 6, 5, shirt)}
      {R(-1, 6, 1, 3, skin)}
      {R(6, 6, 1, 3, skin)}
      {seated ? (
        <>{R(1, 10, 5, 2, '#2c3e50')}</>
      ) : (
        <>
          {R(1, 10, 2, 3, '#2c3e50')}
          {R(3, 10, 2, 3, '#2c3e50')}
          {R(1, 13, 2, 1, '#111')}
          {R(3, 13, 2, 1, '#111')}
        </>
      )}
    </g>
  );
}

function HumanBarista({ apron }: { apron: string }) {
  return (
    <g className="barista">
      {R(2, -2, 6, 2, '#5a3418')}
      {R(4, -4, 2, 2, '#5a3418')}
      {R(2, 0, 6, 5, '#f1c7a1')}
      {R(3, 2, 1, 1, '#222')}
      {R(6, 2, 1, 1, '#222')}
      {R(4, 4, 2, 1, '#c0605a')}
      {R(1, 5, 8, 7, '#ecf0f1')}
      {R(2, 6, 6, 6, apron)}
      {R(0, 6, 1, 4, '#f1c7a1')}
      {R(9, 6, 1, 4, '#f1c7a1')}
    </g>
  );
}

function RobotBarista({ apron, busy }: { apron: string; busy: boolean }) {
  return (
    <g className="barista">
      {R(4, -5, 1, 3, '#bbb')}
      <rect x={3} y={-7} width={3} height={2} fill={busy ? '#ffb38a' : apron} className={busy ? 'blink' : ''} />
      {R(0, -2, 10, 8, '#f2f2f2')}
      {R(1, 0, 8, 4, '#1d1d24')}
      <rect x={2} y={1} width={2} height={2} fill={apron} className={busy ? 'scan' : ''} />
      <rect x={6} y={1} width={2} height={2} fill={apron} className={busy ? 'scan' : ''} />
      {R(-1, 1, 1, 3, '#cfcfcf')}
      {R(10, 1, 1, 3, '#cfcfcf')}
      {R(1, 6, 8, 7, '#dcdcdc')}
      {R(2, 7, 6, 6, apron)}
      {R(4, 8, 2, 2, '#fff')}
      {R(-1, 7, 2, 4, '#cfcfcf')}
      {R(9, 7, 2, 4, '#cfcfcf')}
    </g>
  );
}

function Logo({ side }: { side: Side }) {
  if (side === 'supabase') {
    return (
      <g>
        <polygon points="6,0 0,9 5,9 3,16 10,6 5,6 8,0" fill="#3ecf8e" />
        <polygon points="6,0 0,9 3,9 6,4" fill="#7ff0bd" opacity="0.6" />
      </g>
    );
  }
  return (
    <g transform="translate(5 8)">
      {[0, 30, 60, 90, 120, 150].map((a) => (
        <rect key={a} x={-1} y={-8} width={2} height={16} fill="#e8875f" transform={`rotate(${a})`} />
      ))}
      <rect x={-2} y={-2} width={4} height={4} fill="#ffb38a" />
    </g>
  );
}

function Plant({ x, y, flower }: { x: number; y: number; flower?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {R(2, 0, 2, 6, '#2f7d32')}
      {R(0, 1, 2, 3, '#3fa34d')}
      {R(4, 2, 3, 3, '#3fa34d')}
      {R(-1, 4, 3, 2, '#2f7d32')}
      {R(5, -1, 2, 2, '#3fa34d')}
      {flower && R(0, -1, 2, 2, flower)}
      {flower && R(5, 3, 2, 2, flower)}
      {R(0, 6, 7, 5, GOLD)}
      {R(0, 6, 7, 1, '#f0cf7a')}
      {R(1, 11, 5, 1, GOLD_D)}
    </g>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {R(3, 0, 1, 7, '#333')}
      {R(0, 7, 7, 3, GOLD)}
      <rect x={1} y={10} width={5} height={2} fill="#ffe7a3" className="lamp" />
      <circle cx={3.5} cy={14} r={10} fill="#ffe7a3" fillOpacity={0.07} />
    </g>
  );
}

function Table({ x, y, theme, guests, startIdx }: { x: number; y: number; theme: (typeof THEMES)[Side]; guests: number; startIdx: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* chairs */}
      {R(-9, 2, 6, 9, theme.chair)}
      {R(-9, 2, 6, 2, theme.chairDark)}
      {R(15, 2, 6, 9, theme.chair)}
      {R(15, 2, 6, 2, theme.chairDark)}
      {guests > 0 && <Person i={startIdx} x={-8} y={-3} seated />}
      {guests > 1 && <Person i={startIdx + 1} x={14} y={-3} seated />}
      {/* table */}
      {R(0, 4, 12, 3, '#f4f1ea')}
      {R(0, 7, 12, 1, '#c9c2b5')}
      {R(5, 8, 2, 5, GOLD_D)}
      {R(3, 13, 6, 1, GOLD)}
      {/* cups */}
      {guests > 0 && (
        <g>
          {R(2, 2, 2, 2, CREAM)}
          <rect x={2.5} y={0} width={1} height={1.5} fill="#fff" className="steam" />
        </g>
      )}
      {guests > 1 && (
        <g>
          {R(8, 2, 2, 2, CREAM)}
          <rect x={8.5} y={0} width={1} height={1.5} fill="#fff" className="steam s2" />
        </g>
      )}
      {R(5, 1, 2, 3, '#ffd36b')}
      <rect x={5.5} y={0} width={1} height={1} fill="#fff6c9" className="lamp" />
    </g>
  );
}

const SKY: Record<Slot, { sky: string; glow: string; body: string }> = {
  Morning: { sky: '#8fd0f0', glow: '#d6f1ff', body: '#fff3a0' },
  Afternoon: { sky: '#f2a45c', glow: '#ffd59a', body: '#fff0c0' },
  Evening: { sky: '#1a2350', glow: '#2c3a78', body: '#f4f1d0' },
};

export default function CafeScene({
  side,
  slot,
  queue,
  seated,
  busy = false,
  bump = 0,
}: {
  side: Side;
  slot: Slot;
  queue: number;
  seated: number;
  busy?: boolean;
  bump?: number;
}) {
  const t = THEMES[side];
  const sky = SKY[slot];
  const doorX = side === 'supabase' ? -12 : 212;
  const queueSlots = [96, 84, 108, 72, 120, 60, 132];
  const q = Math.max(0, Math.min(queueSlots.length, queue));
  const tables = [
    { x: 18, y: 96 },
    { x: 66, y: 100 },
    { x: 122, y: 100 },
    { x: 170, y: 96 },
  ];
  const s = Math.max(0, Math.min(8, seated));
  const floorTiles = [];
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 20; x++)
      floorTiles.push(R(x * 10, 64 + y * 10, 10, 10, (x + y) % 2 ? '#e9e2d6' : '#cfc6b6', `${x}-${y}`));

  return (
    <svg className={`cafe-scene ${side}`} viewBox="0 0 200 120" shapeRendering="crispEdges" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${side} café`}>
      {/* back wall */}
      {R(0, 0, 200, 64, t.wall)}
      {Array.from({ length: 10 }, (_, i) => R(i * 20 + 9, 0, 2, 56, t.wallLine, `wl${i}`))}
      {R(0, 56, 200, 8, t.wallDark)}
      {R(0, 55, 200, 1, GOLD)}

      {/* windows */}
      {[8, 168].map((wx) => (
        <g key={wx}>
          {R(wx - 1, 9, 26, 26, GOLD_D)}
          {R(wx, 10, 24, 24, sky.sky)}
          {R(wx, 26, 24, 8, sky.glow)}
          {slot === 'Evening' ? (
            <>
              {R(wx + 4, 13, 1, 1, '#fff')}
              {R(wx + 14, 16, 1, 1, '#fff')}
              {R(wx + 19, 12, 1, 1, '#fff')}
              {R(wx + 16, 13, 4, 4, sky.body)}
              {/* city lights */}
              {R(wx + 2, 28, 3, 6, '#0d1330')}
              {R(wx + 8, 25, 4, 9, '#0d1330')}
              {R(wx + 15, 27, 5, 7, '#0d1330')}
              {R(wx + 9, 27, 1, 1, '#ffd36b')}
              {R(wx + 16, 29, 1, 1, '#ffd36b')}
            </>
          ) : (
            <>
              {R(wx + 15, 13, 5, 5, sky.body)}
              {R(wx + 3, 15, 7, 2, '#ffffff')}
              {R(wx + 5, 14, 3, 1, '#ffffff')}
            </>
          )}
          {R(wx + 11, 10, 2, 24, GOLD_D)}
          {R(wx, 21, 24, 1, GOLD_D)}
        </g>
      ))}

      {/* banner sign */}
      <g>
        {R(64, 3, 72, 30, t.wallDark)}
        {R(64, 3, 72, 1, GOLD)}
        {R(64, 32, 72, 1, GOLD)}
        {R(64, 3, 1, 30, GOLD)}
        {R(135, 3, 1, 30, GOLD)}
        <g transform="translate(95 6)">
          <Logo side={side} />
        </g>
        <text x={100} y={29} textAnchor="middle" className="sign-text" fill={t.accent}>
          {t.sign} CAFÉ
        </text>
      </g>

      {/* menu board */}
      <g>
        {R(40, 12, 20, 18, '#1d1d1d')}
        {R(39, 11, 22, 1, GOLD)}
        {[0, 1, 2, 3].map((i) => R(42, 15 + i * 4, 10 - (i % 2) * 3, 1, '#d8d8d8', `m${i}`))}
        {[0, 1, 2, 3].map((i) => R(55, 15 + i * 4, 3, 1, t.accent, `p${i}`))}
      </g>
      <g>
        {R(140, 12, 20, 18, '#1d1d1d')}
        {R(139, 11, 22, 1, GOLD)}
        {R(143, 15, 4, 4, '#c98a4b')}
        {R(149, 15, 4, 4, '#e8c07a')}
        {R(143, 22, 4, 4, '#7a4a2e')}
        {R(149, 22, 4, 4, CREAM)}
        {R(155, 16, 2, 10, t.accent)}
      </g>

      <Lamp x={50} />
      <Lamp x={146} />

      {/* floor */}
      {floorTiles}
      <rect x={30} y={88} width={140} height={28} fill={t.rug} opacity={0.85} />
      <rect x={30} y={88} width={140} height={1} fill={t.rugEdge} opacity={0.7} />
      <rect x={30} y={115} width={140} height={1} fill={t.rugEdge} opacity={0.7} />

      {/* barista behind counter */}
      <g transform="translate(95 40)">{side === 'claude' ? <RobotBarista apron={t.apron} busy={busy} /> : <HumanBarista apron={t.apron} />}</g>

      {/* counter */}
      <g className={bump ? 'counter-bump' : ''} key={`counter-${bump}`}>
        {R(46, 52, 108, 3, '#f4f1ea')}
        {R(46, 55, 108, 1, GOLD)}
        {R(46, 56, 108, 16, '#2a1d14')}
        {R(46, 71, 108, 1, GOLD)}
        {Array.from({ length: 9 }, (_, i) => R(50 + i * 12, 59, 8, 10, '#3a2a1e', `cp${i}`))}
        {/* espresso machine */}
        {R(58, 42, 14, 10, '#b9b9b9')}
        {R(58, 42, 14, 2, '#e1e1e1')}
        {R(61, 47, 2, 3, '#333')}
        {R(67, 47, 2, 3, '#333')}
        <rect x={63} y={39} width={1} height={2} fill="#fff" className="steam" />
        <rect x={66} y={38} width={1} height={2} fill="#fff" className="steam s2" />
        {/* register */}
        <g className={bump ? 'register-ching' : ''}>
          {R(124, 44, 14, 8, '#3b3b3b')}
          {R(126, 41, 10, 4, '#222')}
          {R(127, 42, 8, 2, t.accent)}
          {R(126, 47, 2, 1, '#bbb')}
          {R(130, 47, 2, 1, '#bbb')}
          {R(134, 47, 2, 1, '#bbb')}
        </g>
        {/* pastry case */}
        {R(140, 44, 12, 8, '#cfe8ee')}
        {R(141, 47, 3, 2, '#d18b47')}
        {R(145, 47, 3, 2, '#e8b04f')}
        {R(149, 47, 2, 2, '#b55a3a')}
        {/* cups */}
        {R(78, 49, 3, 3, CREAM)}
        {R(83, 49, 3, 3, CREAM)}
        {R(112, 49, 3, 3, t.accent)}
      </g>

      {/* queue of walk-in customers */}
      {Array.from({ length: q }, (_, i) => (
        <g
          key={`q-${i}-${queue}`}
          className="walker"
          style={{ ['--from' as string]: `${doorX - queueSlots[i]}px`, animationDelay: `${i * 0.25}s` } as React.CSSProperties}
        >
          <g transform={`translate(${queueSlots[i]} ${73 + (i % 2) * 2})`}>
            <g className="bob" style={{ animationDelay: `${i * 0.13}s` }}>
              <Person i={i + (side === 'claude' ? 3 : 0)} x={0} y={0} />
            </g>
          </g>
        </g>
      ))}

      {/* tables + seated guests */}
      {tables.map((tb, i) => (
        <Table key={i} x={tb.x} y={tb.y} theme={t} guests={Math.max(0, Math.min(2, s - i * 2))} startIdx={i * 2 + (side === 'claude' ? 7 : 1)} />
      ))}

      <Plant x={2} y={74} flower={side === 'claude' ? '#f08a3c' : undefined} />
      <Plant x={191} y={74} flower={side === 'claude' ? '#f08a3c' : undefined} />
      <Plant x={2} y={106} />
      <Plant x={191} y={106} />

      {/* time-of-day tint */}
      {slot === 'Evening' && <rect x={0} y={0} width={200} height={120} fill="#0b1030" opacity={0.18} />}
      {slot === 'Afternoon' && <rect x={0} y={0} width={200} height={120} fill="#ff9a3c" opacity={0.06} />}
    </svg>
  );
}
