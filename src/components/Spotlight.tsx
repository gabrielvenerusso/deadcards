import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useData } from "../lib/data";
import { strings, useT, useLabel } from "../lib/i18n";
import { getPlayerHistory, getPlayerOvr, getPlayerTrend, isMainCard, teamOf } from "../lib/cards";
import { getCardTier } from "../lib/rarity";
import { Card } from "./Card";
import { TrendBadge } from "./TrendBadge";
import { HistoryChart } from "./HistoryChart";
import { ShareActions } from "./ShareActions";
import { cardPath, profilePath } from "../lib/navigation";
import { playerIdentity } from "../lib/lineups";
import { Icon } from "./Icon";
import { pill } from "../lib/ui";

gsap.registerPlugin(SplitText);
const revealed = new Set<string>();

const S = strings({
  pt: { cardOf: (name: string) => `Carta de ${name}`, close: "Fechar", special: "Especial", edit: "Editar carta", history: "Histórico de OVR", versions: "Versões", main: "Principal", version: "Versão" },
  en: { cardOf: (name: string) => `${name}'s card`, close: "Close", special: "Special", edit: "Edit card", history: "OVR history", versions: "Versions", main: "Main", version: "Version" },
  es: { cardOf: (name: string) => `Carta de ${name}`, close: "Cerrar", special: "Especial", edit: "Editar carta", history: "Historial de OVR", versions: "Versiones", main: "Principal", version: "Versión" },
});

export function Spotlight({ playerId, onClose, onSwitch, onEdit }: { playerId: string; onClose: () => void; onSwitch: (id: string) => void; onEdit?: (id: string) => void }) {
  const t = useT(S);
  const label = useLabel();
  const { teams, players, settings } = useData();
  const player = players.find((p) => p.id === playerId);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const tier = player ? getCardTier(player, settings.tierConfig!) : null;
  const ovr = player ? getPlayerOvr(player) : 0;
  const reveal = useMemo(
    () => !!tier && !revealed.has(playerId) && (tier.lvl >= 3 || !!tier.custom) && !matchMedia("(prefers-reduced-motion: reduce)").matches,
    [playerId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useLayoutEffect(() => {
    if (!reveal || !cardRef.current) return;
    revealed.add(playerId);
    const ovrEl = cardRef.current.querySelector("[data-ovr]")?.firstChild;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.12 });
      tl.fromTo(flashRef.current, { opacity: 0, scale: 0.5 }, { opacity: 0.9, scale: 1.1, duration: 0.25, ease: "power2.out" })
        .to(flashRef.current, { opacity: 0, scale: 1.35, duration: 0.5, ease: "power2.in" });
      tl.from(cardRef.current, { y: 40, scale: 0.85, opacity: 0, duration: 0.6, ease: "back.out(1.6)", clearProps: "transform,opacity" }, 0.05);
      if (ovrEl) {
        const n = { v: 0 };
        ovrEl.nodeValue = "0";
        tl.to(n, { v: ovr, duration: 0.5, ease: "power2.out", onUpdate: () => { ovrEl.nodeValue = String(Math.round(n.v)); } }, 0.3);
      }
      if (nameRef.current) {
        const split = SplitText.create(nameRef.current, { type: "chars" });
        tl.from(split.chars, { opacity: 0, y: 12, duration: 0.3, stagger: 0.025, ease: "power2.out" }, 0.4);
      }
    });
    return () => { ctx.revert(); if (ovrEl) ovrEl.nodeValue = String(ovr); };
  }, [reveal, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], select, [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose]);

  if (!player) return null;
  const team = teamOf(teams, player);
  if (!tier) return null;
  const history = getPlayerHistory(player);
  const groupKey = playerIdentity(player, players);
  const versions = players.filter((p) => playerIdentity(p, players) === groupKey);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label={t.cardOf(player.name)}
    >
      <motion.div
        className="noir-glass-strong flex max-h-[92dvh] w-full max-w-4xl flex-col items-center gap-8 overflow-y-auto rounded-3xl p-4 sm:p-8 md:flex-row md:items-start"
        initial={{ scale: 0.8, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div key={player.id} className="relative spotlight-card w-full max-w-[350px] shrink-0" initial={reveal ? false : { rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ transformPerspective: 1200 }}>
          {reveal && (
            <div ref={flashRef} aria-hidden="true" className="pointer-events-none absolute -inset-16 rounded-full opacity-0" style={{ background: `radial-gradient(circle, ${tier.hi} 0%, ${tier.c}99 30%, transparent 68%)` }} />
          )}
          <div ref={cardRef} className="relative">
            <Card player={player} variant="editor" />
          </div>
        </motion.div>

        <div className="w-full min-w-0 flex-1 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-black tracking-[0.12em] text-dl-text uppercase"><span ref={nameRef} key={player.id + player.name}>{player.name}</span></h2>
              <p className="mt-1 text-sm text-zinc-300">{label(team.name)} ({team.tag}) · {label(player.position || "Flex")} · {player.hero}</p>
            </div>
            <button type="button" onClick={onClose} aria-label={t.close} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-800/60 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 sm:size-9"><Icon name="x" /></button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rk-chip" style={{ color: tier.c, borderColor: tier.c }}>{tier.custom ? t.special : tier.name}</span>
            <TrendBadge delta={getPlayerTrend(player)} size="editor" />
            {onEdit && <button type="button" onClick={() => onEdit(player.id)} className={`${pill(true)} ml-auto hover:bg-white`}>{t.edit}</button>}
            {player.special && player.specialText && <span className="text-xs font-bold text-amber-200">✦ {player.specialText}</span>}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase">{t.history}</h3>
            <HistoryChart points={history} color={tier.c} />
          </div>
          <div className="flex flex-wrap gap-2"><a className="feature-button" href={profilePath(groupKey)}>Ver perfil do jogador ↗</a><a className="feature-button" href={`/comparar?a=${encodeURIComponent(player.id)}`}>Comparar jogador</a></div>
          <ShareActions title={`${player.name} · OVR ${ovr}`} path={cardPath(player.id)} imageUrl={`/api/card-image/${encodeURIComponent(player.id)}`} />

          {versions.length > 1 && (
            <div>
              <h3 className="mb-2 text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase">{t.versions} ({versions.length})</h3>
              <div className="flex flex-wrap gap-2">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSwitch(v.id)}
                    className={pill(v.id === player.id)}
                  >
                    {isMainCard(v) ? t.main : v.special ? t.special : t.version} · {teamOf(teams, v).tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
