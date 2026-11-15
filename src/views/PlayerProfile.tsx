import { CardPreview } from "../components/CardPreview";
import { HistoryChart } from "../components/HistoryChart";
import { ShareActions } from "../components/ShareActions";
import { STAT_KEYS, formatDateBR, getPlayerHistory, getPlayerOvr, teamOf } from "../lib/cards";
import { useData } from "../lib/data";
import { playerIdentity } from "../lib/lineups";
import { profilePath } from "../lib/navigation";
import { getCardTier } from "../lib/rarity";

export function PlayerProfile({ id, onOpenCard }: { id: string; onOpenCard: (id: string) => void }) {
  const { players, teams, settings } = useData();
  const requested = players.find((p) => p.id === id);
  if (!requested) return <div className="feature-panel"><h1 className="feature-subtitle">Jogador não encontrado</h1><a href="/comparar" className="feature-button">Explorar jogadores</a></div>;
  const identity = playerIdentity(requested, players);
  const player = players.find((p) => p.id === identity) ?? requested;
  const versions = players.filter((p) => playerIdentity(p, players) === identity);
  const team = teamOf(teams, player);
  const tier = getCardTier(player, settings.tierConfig!);
  const history = getPlayerHistory(player);
  const previous = [...history].reverse().find((h, i) => i > 0 && h.stats);
  const profile = player.profile;
  const updated = profile?.updatedAt || player.updatedAt;
  return <div className="space-y-8">
    <header className="feature-heading"><span className="feature-eyebrow">Perfil do jogador</span><h1>{player.name}</h1><p>{team.name} · {player.position} · {player.hero}</p></header>
    <div className="grid md:grid-cols-[minmax(0,295px)_minmax(0,1fr)] gap-8 items-start">
      <CardPreview player={player} onOpen={() => onOpenCard(player.id)} />
      <section className="feature-panel space-y-6">
        <div className="flex items-center gap-5"><strong className="text-6xl font-black text-white">{getPlayerOvr(player)}</strong><div><p className="feature-label">OVR atual</p><span className="text-lg font-bold" style={{ color: tier.c }}>{tier.name}{player.special ? " · Especial" : ""}</span></div></div>
        {profile?.bio && <p className="text-zinc-300 whitespace-pre-wrap break-words">{profile.bio}</p>}
        <div className="grid grid-cols-3 gap-3">{STAT_KEYS.map((k) => <div key={k} className="rounded-xl border border-white/10 p-3"><span className="feature-label">{k}</span><strong className="block text-2xl text-white">{player.stats[k]}</strong></div>)}</div>
        {profile?.socials && <div className="flex flex-wrap gap-3">{Object.entries(profile.socials).filter(([, url]) => /^https:\/\//.test(url)).map(([key, url]) => <a key={key} href={url} target="_blank" rel="noreferrer" className="feature-button capitalize">{key === "website" ? "Outra rede / site" : key} ↗</a>)}</div>}
        {profile?.steamId && <p className="text-xs text-zinc-400 break-all">SteamID: {profile.steamId}</p>}
        <a href={`/comparar?a=${encodeURIComponent(player.id)}`} className="feature-button feature-primary">Comparar jogador</a>
        <ShareActions title={`${player.name} · Deadlock Cards`} path={profilePath(identity)} imageUrl={`/api/card-image/${encodeURIComponent(player.id)}`} />
        <p className="text-xs text-zinc-500">{updated ? `Última atualização: ${new Date(updated).toLocaleString("pt-BR")}` : "Data da última atualização ainda não registrada."}</p>
      </section>
    </div>
    <section className="feature-panel space-y-5"><h2 className="feature-subtitle">Evolução de OVR</h2><HistoryChart points={history} color={tier.c} />
      {previous?.stats ? <div><h3 className="feature-label">Atributos atuais × registro de {formatDateBR(previous.date)}</h3><table className="feature-table"><thead><tr><th>Atributo</th><th>Anterior</th><th>Atual</th><th>Variação</th></tr></thead><tbody>{STAT_KEYS.map((k) => { const delta = player.stats[k] - previous.stats![k]; return <tr key={k}><th>{k}</th><td>{previous.stats![k]}</td><td>{player.stats[k]}</td><td className={delta > 0 ? "text-emerald-300" : delta < 0 ? "text-red-300" : "text-zinc-400"}>{delta > 0 ? "+" : ""}{delta}</td></tr>; })}</tbody></table></div> : <p className="text-sm text-zinc-400">Ainda não há atributos anteriores registrados. Os próximos registros de evolução permitirão compará-los aqui.</p>}
    </section>
    <section className="space-y-5"><h2 className="feature-subtitle">Todas as versões <span className="text-zinc-500">({versions.length})</span></h2><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">{versions.map((v) => <div key={v.id} className="space-y-3 min-w-0"><CardPreview player={v} onOpen={() => onOpenCard(v.id)} /><p className="text-xs text-center text-zinc-300">{v.id === player.id ? "Principal" : v.specialText || "Versão"} · OVR {getPlayerOvr(v)}</p></div>)}</div></section>
  </div>;
}
