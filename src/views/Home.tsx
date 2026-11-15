import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Team } from "../lib/types";
import { useData } from "../lib/data";
import { regionClass, teamOvr, teamTrend, tierKeyForOvr } from "../lib/cards";
import { strings, useT, useLabel } from "../lib/i18n";
import { RegionBackdrop } from "../components/RegionBackdrop";
import { TeamLogo3D } from "../components/TeamLogo3D";
import { usePointerTilt } from "../lib/tilt";
import { Icon } from "../components/Icon";

const S = strings({
  pt: { featured: "Herói em destaque", prev: "Herói anterior", next: "Próximo herói", none: "Nenhum time cadastrado ainda.", players: (n: number) => `${n} ${n === 1 ? "jogador" : "jogadores"}` },
  en: { featured: "Featured hero", prev: "Previous hero", next: "Next hero", none: "No teams registered yet.", players: (n: number) => `${n} ${n === 1 ? "player" : "players"}` },
  es: { featured: "Héroe destacado", prev: "Héroe anterior", next: "Siguiente héroe", none: "Aún no hay equipos registrados.", players: (n: number) => `${n} ${n === 1 ? "jugador" : "jugadores"}` },
});

export function Home({ onOpenTeam }: { onOpenTeam: (teamId: string) => void }) {
  const { teams, players, settings, heroNames, heroArt } = useData();
  const t = useT(S);
  const label = useLabel();
  const slides = useMemo(() => {
    const list = heroNames.flatMap((n) => {
      const url = heroArt(n)?.url;
      return url ? [{ name: n, url }] : [];
    });
    return settings.homeHero ? [{ name: "", url: settings.homeHero }, ...list] : list;
  }, [heroNames, heroArt, settings.homeHero]);
  const [[heroIdx, dir], setHero] = useState([0, 1]);
  const slide = slides[heroIdx % Math.max(1, slides.length)];
  const hero = slide?.name;
  const homeImg = slide?.url;
  const step = (d: number) => setHero(([i]) => [(i + d + slides.length) % slides.length, d]);

  const ranked = teams
    .map((team) => ({ team, ...teamOvr(players, team.id), delta: teamTrend(players, team.id) }))
    .sort((a, b) => b.exact - a.exact || a.team.name.localeCompare(b.team.name));

  return (
    <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="home-col home-hero-box noir-glass relative overflow-hidden rounded-2xl">
        <AnimatePresence initial={false} custom={dir}>
          {homeImg && (
            <motion.img
              key={homeImg}
              src={homeImg}
              alt={hero || t.featured}
              draggable={false}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -40 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 size-full object-cover object-center select-none"
            />
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(to top, rgba(9,9,11,0.55), transparent)" }} />
        {slides.length > 1 && (
          <>
            <button type="button" className="home-hero-arrow home-hero-arrow--l" onClick={() => step(-1)} aria-label={t.prev}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" className="home-hero-arrow home-hero-arrow--r" onClick={() => step(1)} aria-label={t.next}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
        {hero && <div className="home-hero-tag">{hero}</div>}
      </div>

      <div className="home-col home-teams-scroll flex flex-col gap-4" style={{ "--ft": "0px", "--fb": "120px" } as React.CSSProperties}>
        {ranked.length === 0 && <div className="noir-glass rounded-2xl p-6 text-sm text-zinc-300">{t.none}</div>}
        {ranked.map((r, idx) => (
          <TeamRow
            key={r.team.id}
            r={r}
            idx={idx}
            tier={r.count ? settings.tierConfig!.find((t) => t.key === tierKeyForOvr(r.rounded, settings.tierConfig!)) : undefined}
            meta={`${r.team.tag} · ${label(r.team.region)} · ${t.players(r.count)}`}
            onOpen={() => onOpenTeam(r.team.id)}
          />
        ))}
      </div>
    </section>
  );
}

function TeamRow({ r, idx, tier, meta, onOpen }: {
  r: { team: Team; rounded: number; count: number; delta: number };
  idx: number;
  tier?: { key: string; bg: string; text: string };
  meta: string;
  onOpen: () => void;
}) {
  const { rotateX, rotateY, ...tiltHandlers } = usePointerTilt();

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      {...tiltHandlers}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover="hover"
      variants={{ hover: { y: -2 } }}
      className={`home-team-box noir-glass team-region-card ${regionClass(r.team.region)} relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-100 sm:gap-5 sm:px-5`}
    >
      <RegionBackdrop region={r.team.region} />
      <span className="relative z-10 w-9 shrink-0 text-center text-xl font-black text-zinc-300 tabular-nums sm:text-2xl">#{idx + 1}</span>
      <TeamLogo3D team={r.team} className="size-14 sm:size-16" radius={12} tilt={{ rotateX, rotateY }} />
      <div className="relative z-10 min-w-0 flex-1">
        <div className="line-clamp-2 font-display text-base/tight font-extrabold tracking-wider text-balance text-dl-text uppercase sm:text-xl/tight">{r.team.name}</div>
        <div className="mt-1 text-[11px] font-bold tracking-wider text-zinc-300 uppercase">{meta}</div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-center gap-1">
        <div className="team-ovr-chip team-ovr-chip--stack">
          <span className="team-ovr-num">{r.count ? r.rounded : "--"}</span>
          <span className="team-ovr-lbl">OVR</span>
        </div>
        <div className="flex items-center gap-1.5">
          {tier && <span className="rounded-md border border-black/25 px-2 py-0.5 text-xs font-black" style={{ background: tier.bg, color: tier.text }}>{tier.key}</span>}
          {r.delta > 0 && <span className="flex items-center gap-0.5 text-xs font-extrabold text-emerald-300 tabular-nums"><Icon name="arrow-up" className="size-3" />+{r.delta}</span>}
          {r.delta < 0 && <span className="flex items-center gap-0.5 text-xs font-extrabold text-red-300 tabular-nums"><Icon name="arrow-down" className="size-3" />{r.delta}</span>}
        </div>
      </div>
    </motion.button>
  );
}
