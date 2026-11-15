import { STAT_KEYS } from "../lib/cards";
import type { Stats } from "../lib/types";

export function StatsRadar({ series }: { series: { label: string; stats: Stats; color: string }[] }) {
  const point = (i: number, value: number) => {
    const angle = i * Math.PI / 3 - Math.PI / 2;
    return [160 + Math.cos(angle) * value, 150 + Math.sin(angle) * value];
  };
  return <figure className="min-w-0">
    <svg viewBox="0 0 320 300" role="img" aria-label={`Radar de atributos: ${series.map((s) => s.label).join(" e ")}`} className="w-full max-w-96 mx-auto">
      {[25, 50, 75, 99].map((v) => <polygon key={v} points={STAT_KEYS.map((_, i) => point(i, v).join(",")).join(" ")} fill="none" stroke="#3f3f46" />)}
      {STAT_KEYS.map((k, i) => { const [x, y] = point(i, 124); const [endX, endY] = point(i, 99); return <g key={k}>
        <line x1="160" y1="150" x2={endX} y2={endY} stroke="#3f3f46" />
        <text x={x} y={y + 4} textAnchor="middle" fill="#d4d4d8" fontSize="12" fontWeight="700">{k}</text>
      </g>; })}
      {series.map((s, index) => <polygon key={index} points={STAT_KEYS.map((k, i) => point(i, s.stats[k]).join(",")).join(" ")} fill={s.color} fillOpacity=".15" stroke={s.color} strokeWidth="2" strokeDasharray={index ? "5 3" : undefined}><title>{s.label}: {STAT_KEYS.map((k) => `${k} ${s.stats[k]}`).join(", ")}</title></polygon>)}
    </svg>
    <figcaption className="flex flex-wrap justify-center gap-4 text-xs">{series.map((s, i) => <span key={i} style={{ color: s.color }}>{i ? "┄" : "━"} {s.label}</span>)}</figcaption>
  </figure>;
}
