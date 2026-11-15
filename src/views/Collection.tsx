import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useState } from "react";
import { useData } from "../lib/data";
import { getPlayerOvr, isMainCard, teamOf } from "../lib/cards";
import { Card } from "../components/Card";
import { strings, useT, useLabel } from "../lib/i18n";

type SortKey = "ovr" | "name" | "MIR" | "MAC" | "SUP" | "MOV" | "POL" | "CON";
const PAGE = 24;

const S = strings({
  pt: {
    title: "Coleção",
    count: (n: number) => `${n} carta(s)`,
    searchPlaceholder: "Buscar jogador, herói, time…",
    search: "Buscar",
    team: "Time",
    allTeams: "Todos os times",
    hero: "Herói",
    allHeroes: "Todos os heróis",
    role: "Role",
    allRoles: "Todas as roles",
    sort: "Ordenar",
    sortBy: (k: string) => `Ordenar: ${k}`,
    name: "Nome",
    allVersions: "Todas as versões",
    more: (n: number) => `Mostrar mais (${n})`,
  },
  en: {
    title: "Collection",
    count: (n: number) => `${n} card(s)`,
    searchPlaceholder: "Search player, hero, team…",
    search: "Search",
    team: "Team",
    allTeams: "All teams",
    hero: "Hero",
    allHeroes: "All heroes",
    role: "Role",
    allRoles: "All roles",
    sort: "Sort",
    sortBy: (k: string) => `Sort: ${k}`,
    name: "Name",
    allVersions: "All versions",
    more: (n: number) => `Show more (${n})`,
  },
  es: {
    title: "Colección",
    count: (n: number) => `${n} carta(s)`,
    searchPlaceholder: "Buscar jugador, héroe, equipo…",
    search: "Buscar",
    team: "Equipo",
    allTeams: "Todos los equipos",
    hero: "Héroe",
    allHeroes: "Todos los héroes",
    role: "Rol",
    allRoles: "Todos los roles",
    sort: "Ordenar",
    sortBy: (k: string) => `Ordenar: ${k}`,
    name: "Nombre",
    allVersions: "Todas las versiones",
    more: (n: number) => `Mostrar más (${n})`,
  },
});

export function Collection({ onOpenCard }: { onOpenCard: (id: string) => void }) {
  const t = useT(S);
  const label = useLabel();
  const { teams, players } = useData();
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("ALL");
  const [hero, setHero] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("ovr");
  const [allVersions, setAllVersions] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const query = useDeferredValue(q.trim().toLowerCase());

  const heroes = [...new Set(players.map((p) => p.hero))].sort();
  const roles = [...new Set(players.map((p) => p.position))].sort();
  const list = players
    .filter((p) => (allVersions || isMainCard(p)) && (team === "ALL" || p.teamId === team) && (hero === "ALL" || p.hero === hero) && (role === "ALL" || p.position === role))
    .filter((p) => !query || `${p.name} ${p.hero} ${p.position} ${teamOf(teams, p).name}`.toLowerCase().includes(query))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "ovr" ? getPlayerOvr(b) - getPlayerOvr(a) : b.stats[sort] - a.stats[sort]));

  const field = "px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-200/15 text-xs text-zinc-100";

  return (
    <section className="space-y-5">
      <div className="noir-glass rounded-2xl p-5 sm:p-7 space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-[0.11em] text-zinc-100">{t.title}</h1>
          <p className="text-xs text-zinc-400 mt-1.5">{t.count(list.length)}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder={t.searchPlaceholder} aria-label={t.search} className={`${field} w-60 placeholder:text-zinc-500`} />
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label={t.team} className={field}>
            <option value="ALL">{t.allTeams}</option>
            {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
          </select>
          <select value={hero} onChange={(e) => setHero(e.target.value)} aria-label={t.hero} className={field}>
            <option value="ALL">{t.allHeroes}</option>
            {heroes.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={t.role} className={field}>
            <option value="ALL">{t.allRoles}</option>
            {roles.map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={t.sort} className={field}>
            <option value="ovr">{t.sortBy("OVR")}</option>
            <option value="name">{t.sortBy(t.name)}</option>
            {(["MIR", "MAC", "SUP", "MOV", "POL", "CON"] as const).map((k) => <option key={k} value={k}>{t.sortBy(k)}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={allVersions} onChange={(e) => setAllVersions(e.target.checked)} />
            {t.allVersions}
          </label>
        </div>
      </div>

      <motion.div layout className="flex flex-wrap justify-center sm:justify-start gap-6">
        <AnimatePresence mode="popLayout">
          {list.slice(0, limit).map((p) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.3 }}>
              <Card player={p} variant="medium" onOpen={() => onOpenCard(p.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {list.length > limit && (
        <div className="text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-extrabold uppercase tracking-wider cursor-pointer">
            {t.more(list.length - limit)}
          </button>
        </div>
      )}
    </section>
  );
}
