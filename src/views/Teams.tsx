import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useData } from "../lib/data";
import { activeRoster, REGIONS, regionClass, teamOvr, teamTrend } from "../lib/cards";
import { strings, useT, useLabel } from "../lib/i18n";
import { RegionBackdrop } from "../components/RegionBackdrop";
import { TeamLogo } from "../components/TeamLogo";
import { TrendBadge } from "../components/TrendBadge";
import { Card } from "../components/Card";

const pill = (active: boolean) =>
  `px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer border ${
    active ? "bg-zinc-100 text-zinc-950 border-white shadow-[0_0_12px_rgba(244,244,245,0.2)]" : "bg-zinc-900/75 text-zinc-300 border-zinc-200/15 hover:text-white hover:border-zinc-200/40"
  }`;

const S = strings({
  pt: {
    title: "Elencos & Cartas", hint: "Clique no nome ou logo de um time para abrir seu elenco. Passe o mouse sobre uma carta para visualizar.",
    desc: "↓ OVR Decrescente", asc: "↑ OVR Crescente", collapseAll: "▴ Recolher Todos", showAll: "▾ Exibir Todos",
    medium: "Cartas Médias", large: "Cartas Grandes", all: (n: number) => `Todas (${n})`, noTeams: "Nenhum time nesta região",
    collapse: "▴ Recolher", open: "▾ Abrir Elenco", count: (n: number) => `${n} jogador(es) no elenco oficial`, emptyRoster: "Nenhum jogador cadastrado neste elenco ainda.",
  },
  en: {
    title: "Rosters & Cards", hint: "Click a team's name or logo to open its roster. Hover over a card to preview it.",
    desc: "↓ OVR Descending", asc: "↑ OVR Ascending", collapseAll: "▴ Collapse All", showAll: "▾ Show All",
    medium: "Medium Cards", large: "Large Cards", all: (n: number) => `All (${n})`, noTeams: "No teams in this region",
    collapse: "▴ Collapse", open: "▾ Open Roster", count: (n: number) => `${n} ${n === 1 ? "player" : "players"} on the official roster`, emptyRoster: "No players registered on this roster yet.",
  },
  es: {
    title: "Rosters y Cartas", hint: "Haz clic en el nombre o el logo de un equipo para abrir su roster. Pasa el mouse sobre una carta para verla.",
    desc: "↓ OVR Descendente", asc: "↑ OVR Ascendente", collapseAll: "▴ Contraer todos", showAll: "▾ Mostrar todos",
    medium: "Cartas medianas", large: "Cartas grandes", all: (n: number) => `Todas (${n})`, noTeams: "Ningún equipo en esta región",
    collapse: "▴ Contraer", open: "▾ Abrir roster", count: (n: number) => `${n} ${n === 1 ? "jugador" : "jugadores"} en el roster oficial`, emptyRoster: "Aún no hay jugadores registrados en este roster.",
  },
});

export function Teams({ focusTeamId, onOpenCard }: { focusTeamId?: string; onOpenCard: (id: string) => void }) {
  const { teams, players } = useData();
  const t = useT(S);
  const label = useLabel();
  const [region, setRegion] = useState("ALL");
  const [desc, setDesc] = useState(true);
  const [size, setSize] = useState<"team" | "medium">("team");
  const [open, setOpen] = useState<Record<string, boolean>>(focusTeamId ? { [focusTeamId]: true } : {});

  useEffect(() => {
    if (focusTeamId) document.getElementById(`team-card-${focusTeamId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusTeamId]);

  const visible = teams
    .filter((t) => region === "ALL" || (t.region || "Europa") === region)
    .map((t) => ({ team: t, o: teamOvr(players, t.id) }))
    .sort((a, b) => (desc ? b.o.exact - a.o.exact : a.o.exact - b.o.exact) || a.team.name.localeCompare(b.team.name));
  const anyOpen = visible.some((v) => open[v.team.id]);

  return (
    <section className="space-y-6">
      <div className="noir-glass rounded-2xl p-5 sm:p-7 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold uppercase tracking-[0.11em] text-zinc-100 leading-tight">{t.title}</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">{t.hint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill(false)} onClick={() => setDesc((d) => !d)}>{desc ? t.desc : t.asc}</button>
            <button type="button" className={pill(false)} onClick={() => setOpen(anyOpen ? {} : Object.fromEntries(visible.map((v) => [v.team.id, true])))}>
              {anyOpen ? t.collapseAll : t.showAll}
            </button>
            <button type="button" className={pill(size === "medium")} onClick={() => setSize((s) => (s === "team" ? "medium" : "team"))}>
              {size === "medium" ? t.medium : t.large}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={pill(region === "ALL")} onClick={() => setRegion("ALL")}>{t.all(teams.length)}</button>
          {REGIONS.map((r) => (
            <button key={r} type="button" className={pill(region === r)} onClick={() => setRegion(r)}>
              {label(r)} ({teams.filter((x) => (x.region || "Europa") === r).length})
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && <div className="noir-glass rounded-2xl p-10 text-center text-sm font-bold uppercase tracking-wider text-zinc-200">{t.noTeams}</div>}

      {visible.map(({ team, o }) => {
        const roster = activeRoster(players, team.id);
        const isOpen = !!open[team.id];
        return (
          <motion.div
            layout
            key={team.id}
            id={`team-card-${team.id}`}
            style={{ scrollMarginTop: "6.5rem" }}
            className={`noir-glass team-region-card ${regionClass(team.region)} rounded-2xl p-4 sm:p-6`}
          >
            <RegionBackdrop region={team.region} />
            <button
              type="button"
              onClick={() => setOpen((s) => ({ ...s, [team.id]: !s[team.id] }))}
              aria-expanded={isOpen}
              className="team-header-trigger flex items-center gap-3.5 text-left group focus:outline-none"
            >
              <div className="team-logo-frame w-[60px] h-[60px]"><TeamLogo team={team} /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="team-title-text text-2xl sm:text-[26px] font-extrabold uppercase tracking-wider text-zinc-100 transition-all duration-200 leading-none">{team.name}</h2>
                  <span className="team-ovr-chip">
                    <span className="team-ovr-num">{o.count ? o.rounded : "--"}</span>
                    <span className="team-ovr-lbl">OVR</span>
                  </span>
                  <TrendBadge delta={teamTrend(players, team.id)} size="editor" />
                  <span className="px-2 py-0.5 rounded-md bg-black/45 border border-zinc-200/25 text-[10px] font-bold uppercase tracking-widest text-zinc-200">{label(team.region)}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 group-hover:bg-zinc-100 group-hover:text-zinc-950 border border-zinc-200/20 text-[10px] font-bold uppercase tracking-wider text-zinc-200 transition-colors">
                    {isOpen ? t.collapse : t.open}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1">{t.count(roster.length)}</p>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="roster"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-6 border-t border-zinc-200/15 flex flex-wrap justify-center sm:justify-start gap-6">
                    {roster.length === 0 && (
                      <div className="w-full py-8 text-center text-xs text-zinc-300 border border-dashed border-zinc-200/20 rounded-xl bg-black/25">{t.emptyRoster}</div>
                    )}
                    {roster.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                        <Card player={p} variant={size} onOpen={() => onOpenCard(p.id)} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </section>
  );
}
