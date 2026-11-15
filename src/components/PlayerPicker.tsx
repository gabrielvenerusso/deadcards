import { useId, useState } from "react";
import { getPlayerOvr, isMainCard, teamOf } from "../lib/cards";
import { useData } from "../lib/data";
import type { Player } from "../lib/types";

export function PlayerPicker({ label, value, onChange, available }: { label: string; value: string; onChange: (id: string) => void; available?: Player[] }) {
  const { players, teams } = useData();
  const [query, setQuery] = useState("");
  const id = useId();
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matches = (available ?? players).filter((p) => normalize(`${p.name} ${p.hero} ${teamOf(teams, p).name}`).includes(normalize(query)));
  const current = players.find((p) => p.id === value);
  const options = current && !matches.some((p) => p.id === value) ? [current, ...matches] : matches;
  return <div className="space-y-2 min-w-0">
    <label className="feature-label" htmlFor={id}>{label}</label>
    <input id={id} type="search" className="feature-input" placeholder="Buscar nome, herói ou time…" value={query} onChange={(e) => setQuery(e.target.value)} />
    <select className="feature-input" aria-label={`Selecionar ${label.toLowerCase()}`} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Selecione uma carta</option>
      {options.map((p) => <option key={p.id} value={p.id}>{p.name} · {getPlayerOvr(p)} · {isMainCard(p) ? "Principal" : p.specialText || "Versão especial"} · {p.hero} · {teamOf(teams, p).tag}</option>)}
    </select>
    {!matches.length && <p className="text-xs text-zinc-400" role="status">Nenhum jogador encontrado.</p>}
  </div>;
}
