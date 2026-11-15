import { useState } from "react";
import { strings, useLocale, useT } from "../lib/i18n";
import type { HistoryPoint } from "../lib/types";

const S = strings({
  pt: { empty: "Sem histórico disponível.", chart: "Evolução de OVR; selecione um registro abaixo para consultar a data e o valor", record: "Registro do histórico", change: "Variação", first: "Primeiro registro" },
  en: { empty: "No history available.", chart: "OVR history; select a record below to see its date and value", record: "History record", change: "Change", first: "First record" },
  es: { empty: "Sin historial disponible.", chart: "Evolución de OVR; selecciona un registro para consultar la fecha y el valor", record: "Registro del historial", change: "Variación", first: "Primer registro" },
});

export function HistoryChart({ points, color }: { points: HistoryPoint[]; color: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const t = useT(S);
  const locale = useLocale();
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return isNaN(+date) ? iso : date.toLocaleDateString(locale, { timeZone: "UTC" });
  };
  if (!points.length) return <p className="text-sm text-zinc-400">{t.empty}</p>;
  const W = 520, H = 180, P = 30;
  const vals = points.map((p) => p.ovr);
  const min = Math.min(...vals) - 2, max = Math.max(...vals) + 2;
  const x = (i: number) => points.length === 1 ? W / 2 : P + i * (W - P * 2) / (points.length - 1);
  const y = (v: number) => H - P - (v - min) / (max - min) * (H - P * 2);
  const active = Math.min(selected ?? points.length - 1, points.length - 1);
  const point = points[active];
  return <div className="space-y-3">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-black/30 border border-zinc-200/10" role="img" aria-label={t.chart}>
      <path d={points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.ovr)}`).join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => <g key={`${p.date}-${i}`}>
        <circle cx={x(i)} cy={y(p.ovr)} r={active === i ? 6 : 4} fill={active === i ? color : "#09090b"} stroke={color} strokeWidth="2" />
        <circle cx={x(i)} cy={y(p.ovr)} r="12" fill="transparent" onPointerEnter={() => setSelected(i)} onClick={() => setSelected(i)}><title>{formatDate(p.date)}: {p.ovr} OVR</title></circle>
        {(i === 0 || i === points.length - 1 || i === active) && <text x={x(i)} y={y(p.ovr) - 14} textAnchor="middle" fontSize="12" fill="#f4f4f5">{p.ovr}</text>}
      </g>)}
      <text x={P} y={H - 8} fontSize="11" fill="#a1a1aa">{formatDate(points[0].date)}</text><text x={W - P} y={H - 8} textAnchor="end" fontSize="11" fill="#a1a1aa">{formatDate(points.at(-1)!.date)}</text>
    </svg>
    <label className="feature-label">{t.record}<select className="feature-input mt-2" value={active} onChange={(e) => setSelected(Number(e.target.value))}>{points.map((p, i) => <option key={i} value={i}>{formatDate(p.date)} · {p.ovr} OVR{p.note ? ` · ${p.note}` : ""}</option>)}</select></label>
    <p className="text-xs text-zinc-300" role="status">{formatDate(point.date)} · <strong>{point.ovr} OVR</strong>{active > 0 ? ` · ${t.change} ${point.ovr - points[active - 1].ovr >= 0 ? "+" : ""}${point.ovr - points[active - 1].ovr}` : ` · ${t.first}`}</p>
  </div>;
}
