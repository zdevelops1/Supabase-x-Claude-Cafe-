import { useEffect, useState } from 'react';
import { music } from '../lib/music';

/** Small on/off control for the classical background music. */
export default function MusicButton({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(music.isPlaying());
  const [wanted, setWanted] = useState(music.wanted());
  useEffect(() => music.subscribe((p) => { setOn(p); setWanted(music.wanted()); }), []);
  const label = on ? 'Music on — Bach, Prelude in C (click to mute)' : wanted ? 'Music starts on your first click' : 'Music off (click to play)';
  return (
    <button
      type="button"
      className={`music-btn ${on ? 'on' : 'off'} ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={(e) => { e.stopPropagation(); music.toggle(); setWanted(music.wanted()); }}
    >
      <span className="music-note">♪</span>
      <span className="music-bars"><i /><i /><i /></span>
    </button>
  );
}
