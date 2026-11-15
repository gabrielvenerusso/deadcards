import { useState } from "react";
import { formatDateBR } from "../lib/cards";
import type { HistoryPoint } from "../lib/types";

export function HistoryChart({ points, color }: { points: HistoryPoint[]; color: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!points.length) return <p className="text-sm text-zinc-400">Sem histórico disponível.</p>;
  const W = 520, H = 180, P = 30;
  const vals = points.map((p) => p.ovr);
  const min = Math.min(...vals) - 2, max = Math.max(...vals) + 2;
  const x = (i: number) => points.length === 1 ? W / 2 : P + i * (W - P * 2) / (points.length - 1);
  const y = (v: number) => H - P - (v - min) / (max - min) * (H - P * 2);
  const active = Math.min(selected ?? points.length - 1, points.length - 1);
  const point = points[active];
  return <div className="space-y-3">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-black/30 border border-zinc-200/10" role="img" aria-label="Evolução de OVR; selecione um registro abaixo para consultar a data e o valor">
      <path d={points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.ovr)}`).join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => <g key={`${p.date}-${i}`}>
        <circle cx={x(i)} cy={y(p.ovr)} r={active === i ? 6 : 4} fill={active === i ? color : "#09090b"} stroke={color} strokeWidth="2" />
        <circle cx={x(i)} cy={y(p.ovr)} r="12" fill="transparent" onPointerEnter={() => setSelected(i)} onClick={() => setSelected(i)}><title>{formatDateBR(p.date)}: {p.ovr} OVR</title></circle>
        {(i === 0 || i === points.length - 1 || i === active) && <text x={x(i)} y={y(p.ovr) - 14} textAnchor="middle" fontSize="12" fill="#f4f4f5">{p.ovr}</text>}
      </g>)}
      <text x={P} y={H - 8} fontSize="11" fill="#a1a1aa">{formatDateBR(points[0].date)}</text><text x={W - P} y={H - 8} textAnchor="end" fontSize="11" fill="#a1a1aa">{formatDateBR(points.at(-1)!.date)}</text>
    </svg>
    <label className="feature-label">Registro do histórico<select className="feature-input mt-2" value={active} onChange={(e) => setSelected(Number(e.target.value))}>{points.map((p, i) => <option key={i} value={i}>{formatDateBR(p.date)} · {p.ovr} OVR{p.note ? ` · ${p.note}` : ""}</option>)}</select></label>
    <p className="text-xs text-zinc-300" role="status">{formatDateBR(point.date)} · <strong>{point.ovr} OVR</strong>{active > 0 ? ` · Variação ${point.ovr - points[active - 1].ovr >= 0 ? "+" : ""}${point.ovr - points[active - 1].ovr}` : " · Primeiro registro"}</p>
  </div>;
}
