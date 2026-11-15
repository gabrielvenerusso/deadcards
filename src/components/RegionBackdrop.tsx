import { regionClass } from "../lib/cards";

const STARS = Array.from({ length: 12 }, (_, i) => {
  const a = ((i * 30 - 90) * Math.PI) / 180;
  return [70 + 44 * Math.cos(a), 70 + 44 * Math.sin(a)];
});

export function RegionBackdrop({ region }: { region: string }) {
  const cls = regionClass(region);
  const svg = (() => {
    switch (cls) {
      case "team-region-europa":
        return (
          <svg viewBox="0 0 140 140" className="absolute top-1/2 right-4 size-32 -translate-y-1/2 opacity-25">
            {STARS.map(([x, y], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.4" fill="#facc15" />)}
          </svg>
        );
      case "team-region-brasil":
        return (
          <svg viewBox="0 0 200 140" className="absolute top-1/2 right-3 h-28 w-40 -translate-y-1/2 opacity-20">
            <polygon points="100,10 190,70 100,130 10,70" fill="#facc15" />
            <circle cx="100" cy="70" r="34" fill="#1d4ed8" />
          </svg>
        );
      case "team-region-americasul":
        return (
          <svg viewBox="0 0 160 180" className="absolute top-1/2 right-4 h-36 w-32 -translate-y-1/2 opacity-35">
            <path d="M58,18 C78,12 96,26 94,46 C92,64 74,72 58,68 C42,64 36,42 44,28 Z" fill="#0ea5e9" opacity="0.85" />
            <path d="M74,24 C98,22 126,42 122,64 C118,86 92,98 76,88 C62,78 62,38 74,24 Z" fill="#f43f5e" opacity="0.82" />
            <path d="M62,62 C86,58 106,74 100,96 C94,116 74,124 62,112 C52,102 52,72 62,62 Z" fill="#facc15" opacity="0.85" />
            <path d="M58,92 C74,90 84,108 76,134 C68,158 58,172 50,168 C42,164 46,118 58,92 Z" fill="#22c55e" opacity="0.88" />
          </svg>
        );
      case "team-region-semtime":
        return (
          <svg viewBox="0 0 140 140" className="absolute top-1/2 right-4 size-28 -translate-y-1/2 opacity-15">
            <circle cx="70" cy="70" r="42" fill="none" stroke="#a1a1aa" strokeWidth="5" strokeDasharray="10 8" />
          </svg>
        );
      case "team-region-asia":
        return (
          <svg viewBox="0 0 140 140" className="absolute top-1/2 right-4 size-28 -translate-y-1/2 opacity-20">
            <circle cx="70" cy="70" r="44" fill="#fbbf24" />
          </svg>
        );
      default:
        return null;
    }
  })();
  return <div className="team-region-backdrop">{svg}</div>;
}
