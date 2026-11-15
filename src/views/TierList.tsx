import { motion } from "motion/react";
import { useState, type CSSProperties } from "react";
import { useData } from "../lib/data";
import { getPlayerOvr, getPlayerTrend, isMainCard, REGIONS, regionClass, teamOf, teamOvr, teamTrend, tierKeyForOvr } from "../lib/cards";
import { strings, useT, useLabel } from "../lib/i18n";
import { getCardTier, rarityStyleVars } from "../lib/rarity";
import { RegionBackdrop } from "../components/RegionBackdrop";
import { TeamLogo } from "../components/TeamLogo";

const S = strings({
  pt: {
    players: "Jogadores", teams: "Times", region: "Região", allRegions: "Todas as regiões", search: "Buscar", placeholder: "Buscar…",
    rankedPlayers: (n: number) => `${n} jogador(es) classificado(s)`, rankedTeams: (n: number) => `${n} time(s) classificado(s)`,
    nobody: (min: number, max: number) => `Ninguém nesta faixa (${min}–${max} OVR)`, count: (n: number) => `${n} jogador(es)`,
  },
  en: {
    players: "Players", teams: "Teams", region: "Region", allRegions: "All regions", search: "Search", placeholder: "Search…",
    rankedPlayers: (n: number) => `${n} ranked ${n === 1 ? "player" : "players"}`, rankedTeams: (n: number) => `${n} ranked ${n === 1 ? "team" : "teams"}`,
    nobody: (min: number, max: number) => `Nobody in this range (${min}–${max} OVR)`, count: (n: number) => `${n} ${n === 1 ? "player" : "players"}`,
  },
  es: {
    players: "Jugadores", teams: "Equipos", region: "Región", allRegions: "Todas las regiones", search: "Buscar", placeholder: "Buscar…",
    rankedPlayers: (n: number) => `${n} ${n === 1 ? "jugador clasificado" : "jugadores clasificados"}`, rankedTeams: (n: number) => `${n} ${n === 1 ? "equipo clasificado" : "equipos clasificados"}`,
    nobody: (min: number, max: number) => `Nadie en este rango (${min}–${max} OVR)`, count: (n: number) => `${n} ${n === 1 ? "jugador" : "jugadores"}`,
  },
});

export function TierList({ onOpenCard, onOpenTeam }: { onOpenCard: (id: string) => void; onOpenTeam: (id: string) => void }) {
  const { teams, players, settings, heroArt } = useData();
  const cfg = settings.tierConfig!;
  const tr = useT(S);
  const label = useLabel();
  const [mode, setMode] = useState<"players" | "teams">("players");
  const [region, setRegion] = useState("ALL");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const rankedPlayers = players
    .map((p) => ({ p, team: teamOf(teams, p), ovr: getPlayerOvr(p) }))
    .filter(({ p, team }) => {
      if (p.inactive) return false;
      if (!isMainCard(p) && region === "ALL") return false;
      if (region !== "ALL" && team.region !== region) return false;
      return !query || `${p.name} ${team.name} ${team.tag} ${p.hero} ${p.position}`.toLowerCase().includes(query);
    })
    .sort((a, b) => b.ovr - a.ovr || b.p.stats.MIR - a.p.stats.MIR);

  const rankedTeams = teams
    .map((t) => ({ t, ...teamOvr(players, t.id), delta: teamTrend(players, t.id) }))
    .filter(({ t }) => (region === "ALL" || t.region === region) && (!query || `${t.name} ${t.tag} ${t.region} ${label(t.region)}`.toLowerCase().includes(query)))
    .sort((a, b) => b.exact - a.exact || a.t.name.localeCompare(b.t.name));

  const tab = (active: boolean) =>
    `px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${active ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-900/70 text-zinc-300 border-zinc-200/15 hover:text-white"}`;

  return (
    <section className="space-y-5">
      <div className="noir-glass rounded-2xl p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-[0.11em] text-zinc-100">Tier List</h1>
          <p className="text-xs text-zinc-400 mt-1.5">{mode === "players" ? tr.rankedPlayers(rankedPlayers.length) : tr.rankedTeams(rankedTeams.length)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={tab(mode === "players")} onClick={() => setMode("players")}>{tr.players}</button>
          <button type="button" className={tab(mode === "teams")} onClick={() => setMode("teams")}>{tr.teams}</button>
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label={tr.region} className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-200/15 text-xs text-zinc-200">
            <option value="ALL">{tr.allRegions}</option>
            {REGIONS.map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr.placeholder} aria-label={tr.search} className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-200/15 text-xs text-zinc-100 placeholder:text-zinc-500 w-40" />
        </div>
      </div>

      <div className="tierlist-board rounded-xl overflow-hidden">
        {cfg.map((tier) => {
          const pItems = mode === "players" ? rankedPlayers.filter((x) => tierKeyForOvr(x.ovr, cfg) === tier.key) : [];
          const tItems = mode === "teams" ? rankedTeams.filter((x) => (x.count ? tierKeyForOvr(x.rounded, cfg) : cfg[cfg.length - 1].key) === tier.key) : [];
          const empty = mode === "players" ? !pItems.length : !tItems.length;
          return (
            <div key={tier.key} className="tierlist-row">
              <div className="tierlist-label-cell py-3 px-2" style={{ backgroundColor: tier.bg, color: tier.text }}>
                <span className="text-2xl sm:text-[26px] font-semibold tracking-wide leading-none">{tier.key}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 mt-1">{tier.min}–{tier.max}</span>
              </div>
              <div className="tierlist-content-cell">
                {empty && <span className="text-[11px] text-zinc-500 italic px-2">{tr.nobody(tier.min, tier.max)}</span>}
                {pItems.map(({ p, team, ovr }, i) => {
                  const art = heroArt(p.hero);
                  const delta = getPlayerTrend(p);
                  return (
                    <motion.button
                      key={p.id}
                      type="button"
                      onClick={() => onOpenCard(p.id)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      whileHover={{ y: -3 }}
                      className="rk-tier-item relative w-[92px] h-[112px] rounded-lg overflow-hidden text-left cursor-pointer"
                      style={rarityStyleVars(getCardTier(p, cfg)) as CSSProperties}
                      title={`${p.name} • ${team.name}`}
                    >
                      {art && <img src={art.url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `${art.x}% ${art.y}%` }} />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <span className="absolute top-1 left-1.5 text-lg font-black text-white card-txt-shadow">{ovr}</span>
                      {delta !== 0 && <span className={`absolute top-1.5 right-1.5 text-[9px] font-extrabold ${delta > 0 ? "text-emerald-300" : "text-red-300"}`}>{delta > 0 ? `▲${delta}` : `▼${-delta}`}</span>}
                      <span className="absolute bottom-1.5 inset-x-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white truncate card-txt-shadow">{p.name}</span>
                    </motion.button>
                  );
                })}
                {tItems.map(({ t, rounded, count, delta }) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenTeam(t.id)}
                    className={`team-region-card ${regionClass(t.region)} relative overflow-hidden rounded-lg border border-zinc-200/20 hover:border-white bg-zinc-950 p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2.5 w-64 cursor-pointer`}
                  >
                    <RegionBackdrop region={t.region} />
                    <div className="relative z-10 w-12 py-1.5 rounded-md bg-zinc-100 text-zinc-950 border border-white flex flex-col items-center shrink-0 shadow">
                      <span className="text-xl font-black leading-none">{count ? rounded : "--"}</span>
                      <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-80 mt-0.5">OVR</span>
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="team-logo-frame w-5 h-5" style={{ borderRadius: 4 }}><TeamLogo team={t} /></span>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-white truncate">{t.name}</span>
                        {delta > 0 && <span className="text-[9px] font-extrabold text-emerald-300">▲+{delta}</span>}
                        {delta < 0 && <span className="text-[9px] font-extrabold text-red-300">▼{delta}</span>}
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-300 font-semibold">{label(t.region)} • {tr.count(count)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
