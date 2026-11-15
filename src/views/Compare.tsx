import { PlayerPicker } from "../components/PlayerPicker";
import { CardPreview } from "../components/CardPreview";
import { StatsRadar } from "../components/StatsRadar";
import { ShareActions } from "../components/ShareActions";
import { STAT_KEYS, getPlayerOvr, teamOf } from "../lib/cards";
import { useData } from "../lib/data";
import { getCardTier } from "../lib/rarity";
import { navigate, profilePath, useLocation } from "../lib/navigation";
import { playerIdentity } from "../lib/lineups";

export function Compare({ onOpenCard }: { onOpenCard: (id: string) => void }) {
  const { players, teams, settings } = useData();
  const route = useLocation();
  const params = new URLSearchParams(route.split("?")[1]);
  const ids = [params.get("a") || "", params.get("b") || ""];
  const selected = ids.map((id) => players.find((p) => p.id === id));
  const update = (next: string[]) => navigate(`/comparar?${new URLSearchParams({ a: next[0], b: next[1] })}`, true);
  const [left, right] = selected;
  return <div className="space-y-8">
    <header className="feature-heading"><span className="feature-eyebrow">Frente a frente</span><h1>Comparar cartas</h1><p>Dois jogadores. Seis atributos. Cada detalhe conta.</p></header>
    {!players.length && <p className="feature-panel">Ainda não há jogadores no catálogo.</p>}
    <div className="grid grid-cols-2 gap-3 sm:gap-8">
      {selected.map((p, i) => <section key={i} className="min-w-0 space-y-5">
        <PlayerPicker label={`Jogador ${i + 1}`} value={ids[i]} onChange={(id) => update(i ? [ids[0], id] : [id, ids[1]])} />
        {p ? <>
          <CardPreview player={p} onOpen={() => onOpenCard(p.id)} />
          <div className="text-center text-xs sm:text-sm text-zinc-400 space-y-1 break-words">
            <a className="font-bold text-white hover:underline" href={profilePath(playerIdentity(p, players))}>{p.name} ↗</a>
            <p>{teamOf(teams, p).name} · {p.position}</p><p>{p.hero} · {getCardTier(p, settings.tierConfig!).name}{p.special ? " · Especial" : ""}</p>
          </div>
        </> : <div className="feature-empty aspect-[295/430]">{ids[i] ? "Carta não encontrada. Selecione outra." : "Escolha uma carta para comparar"}</div>}
      </section>)}
    </div>
    <div className="flex flex-wrap items-center gap-4"><button type="button" className="feature-button" onClick={() => update([ids[1], ids[0]])}>⇄ Trocar lados</button>{left && right && <ShareActions title={`${left.name} × ${right.name}`} path={route} />}</div>
    {left && right && <div className="grid md:grid-cols-2 gap-6 feature-panel">
      <div><h2 className="feature-subtitle">Atributos em confronto</h2><table className="feature-table"><caption className="sr-only">Valores e diferenças entre {left.name} e {right.name}</caption><thead><tr><th>{left.name}</th><th>Atributo</th><th>{right.name}</th></tr></thead><tbody>
        {(["OVR", ...STAT_KEYS] as const).map((k) => { const a = k === "OVR" ? getPlayerOvr(left) : left.stats[k]; const b = k === "OVR" ? getPlayerOvr(right) : right.stats[k]; return <tr key={k}>
          <td className={a > b ? "text-emerald-300" : a < b ? "text-red-300" : "text-zinc-300"}>{a} <small>{a === b ? "=" : `${a > b ? "+" : "−"}${Math.abs(a - b)}`}</small></td><th>{k}</th>
          <td className={b > a ? "text-emerald-300" : b < a ? "text-red-300" : "text-zinc-300"}>{b} <small>{a === b ? "=" : `${b > a ? "+" : "−"}${Math.abs(a - b)}`}</small></td>
        </tr>; })}
      </tbody></table></div>
      <StatsRadar series={[{ label: left.name, stats: left.stats, color: "#67e8f9" }, { label: right.name, stats: right.stats, color: "#fbbf24" }]} />
    </div>}
  </div>;
}
