import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { DataProvider, useData } from "./lib/data";
import { hexToRgba } from "./lib/cards";
import { Home } from "./views/Home";
import { Teams } from "./views/Teams";
import { TierList } from "./views/TierList";
import { Collection } from "./views/Collection";
import { Redeem } from "./views/Redeem";
import { Spotlight } from "./components/Spotlight";
import { Login } from "./views/Login";
import { Account } from "./components/Account";
import { Editor } from "./views/Editor";
import { Legal } from "./views/Legal";
import { Compare } from "./views/Compare";
import { LineupBuilder } from "./views/LineupBuilder";
import { PlayerProfile } from "./views/PlayerProfile";
import { cardPath, navigate, useLocation } from "./lib/navigation";

const REPO = "https://github.com/hagizao/deadcards";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

type Tab = "home" | "teams" | "tierlist" | "collection" | "redeem" | "editor" | "privacy" | "terms" | "compare" | "lineup" | "profile";
const PATHS: Record<Tab, string> = { home: "/", teams: "/times", tierlist: "/tier-list", collection: "/colecao", redeem: "/resgatar", editor: "/editor", privacy: "/privacidade", terms: "/termos", compare: "/comparar", lineup: "/montar-time", profile: "/jogador" };
const TABS: { id: Exclude<Tab, "home" | "privacy" | "terms" | "profile">; label: string }[] = [
  { id: "teams", label: "Times" },
  { id: "tierlist", label: "Tier List" },
  { id: "collection", label: "Coleção" },
  { id: "compare", label: "Comparar" },
  { id: "lineup", label: "Montar Time" },
  { id: "redeem", label: "Resgatar" },
];

export default function App() {
  const route = useLocation();
  return (
    <MotionConfig reducedMotion="user">
      <DataProvider>
        {route.split("?")[0] === "/login" ? <><Background /><Login /></> : <Shell />}
      </DataProvider>
    </MotionConfig>
  );
}

function Background() {
  const { settings } = useData();
  const bg = settings.bg;
  if (!bg) return null;
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
      {bg.imageUrl && (
        <div
          className="absolute -inset-6 bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${bg.imageUrl}")`, backgroundSize: bg.size || "cover", opacity: bg.imageOpacity / 100, filter: `blur(${bg.blur}px)` }}
        />
      )}
      <div className="absolute inset-0" style={{ background: hexToRgba(bg.color, bg.overlayOpacity / 100) }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.03) 0%, rgba(9,9,11,0.72) 100%)" }} />
    </div>
  );
}

function Shell() {
  const route = useLocation();
  const pathname = route.split("?")[0];
  const segment = pathname.split("/")[2];
  const tab: Tab = pathname.startsWith("/jogador/") ? "profile" : pathname.startsWith("/escalacao/") ? "lineup" : pathname.startsWith("/carta/") ? "collection" : (Object.keys(PATHS) as Tab[]).find((key) => PATHS[key] === pathname) ?? "home";
  const setTab = (next: Tab) => navigate(PATHS[next]);
  const [focusTeam, setFocusTeam] = useState<string>();
  const spotlight = pathname.startsWith("/carta/") ? segment : null;
  const [cardReturn, setCardReturn] = useState("/colecao");
  const setSpotlight = (id: string | null) => {
    if (id) { if (!spotlight) setCardReturn(route); navigate(cardPath(id)); }
    else navigate(cardReturn);
  };
  const [editId, setEditId] = useState<string | null>(null);
  const { me, players } = useData();
  useEffect(() => {
    const selected = players.find((p) => p.id === segment);
    document.title = selected && (spotlight || tab === "profile") ? `${selected.name} · Deadlock Cards` : `${tab === "compare" ? "Comparar" : tab === "lineup" ? "Montar Time" : "Deadlock Cards"} · Deadlock Cards`;
  }, [segment, spotlight, tab, players]);
  const tabs = me?.admin ? [...TABS, { id: "editor" as const, label: "Editor" }] : TABS;
  const openTeam = (id: string) => { setFocusTeam(id); setTab("teams"); };
  const editCard = (id: string) => { setSpotlight(null); setEditId(id); setTab("editor"); };

  return (
    <>
      <Background />
      <header className="sticky top-0 z-40 noir-glass border-b border-zinc-200/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setTab("home")} className="brand-badge shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl flex items-center gap-3 text-left">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-100 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
            <span className="text-base sm:text-xl font-extrabold uppercase tracking-[0.18em] text-zinc-100"><span className="sm:hidden">DC</span><span className="hidden sm:inline">Deadlock Cards</span></span>
          </button>
          <nav className="relative ml-auto min-w-0 flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto [scrollbar-width:none] py-1" aria-label="Navegação principal">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setFocusTeam(undefined); setTab(t.id); }}
                aria-current={tab === t.id ? "page" : undefined}
                className={`relative shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wider uppercase cursor-pointer border transition-colors ${
                  tab === t.id ? "text-zinc-950 border-white" : "text-zinc-300 hover:text-white border-zinc-200/15 bg-zinc-900/60"
                }`}
              >
                {tab === t.id && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-zinc-100 shadow-[0_0_18px_rgba(244,244,245,0.35)]" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="shrink-0"><Account /></div>
        </div>
      </header>

      <ReducedMotionNotice />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10" onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a");
        if (!anchor || anchor.target || anchor.hasAttribute("download") || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const url = new URL(anchor.href);
        if (url.origin === location.origin && url.pathname !== "/login") { e.preventDefault(); navigate(url.pathname + url.search); }
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "home" && <Home onOpenTeam={openTeam} />}
            {tab === "teams" && <Teams focusTeamId={focusTeam} onOpenCard={setSpotlight} />}
            {tab === "tierlist" && <TierList onOpenCard={setSpotlight} onOpenTeam={openTeam} />}
            {tab === "collection" && <Collection onOpenCard={setSpotlight} />}
            {tab === "redeem" && <Redeem onOpenCard={setSpotlight} />}
            {tab === "compare" && <Compare onOpenCard={setSpotlight} />}
            {tab === "lineup" && <LineupBuilder id={pathname.startsWith("/escalacao/") ? segment : undefined} />}
            {tab === "profile" && <PlayerProfile id={segment ?? ""} onOpenCard={setSpotlight} />}
            {spotlight && !players.some((p) => p.id === spotlight) && <p role="alert" className="feature-panel">Carta não encontrada. Escolha outra carta no catálogo.</p>}
            {tab === "editor" && me?.admin && <Editor editId={editId} onEditId={setEditId} />}
            {(tab === "privacy" || tab === "terms") && <Legal page={tab} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-zinc-200/10 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <a href={REPO} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-bold uppercase tracking-wider text-zinc-300 hover:text-white">
            <GitHubIcon /> Código aberto no GitHub
          </a>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Links do projeto">
            <a href={`${REPO}/issues/new/choose`} target="_blank" rel="noreferrer" className="hover:text-white">Relatar problema</a>
            <a href={`${REPO}/issues/new/choose`} target="_blank" rel="noreferrer" className="hover:text-white">Sugerir ideia</a>
            <a href={`${REPO}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer" className="hover:text-white">Como contribuir</a>
            <button type="button" onClick={() => setTab("privacy")} className="hover:text-white cursor-pointer">Privacidade</button>
            <button type="button" onClick={() => setTab("terms")} className="hover:text-white cursor-pointer">Termos</button>
          </nav>
        </div>
        <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 text-xs text-zinc-500">
          Projeto 4fun gerenciado pelo Hagizao:{" "}
          <a href="https://www.youtube.com/@hagizao" target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-white">YouTube</a> ·{" "}
          <a href="https://www.twitch.tv/hagizao" target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-white">Twitch</a> ·{" "}
          <a href="https://kick.com/hagizao" target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-white">Kick</a>.
          Não afiliado à Valve.
        </p>
      </footer>

      <AnimatePresence>
        {spotlight && <Spotlight key="spotlight" playerId={spotlight} onClose={() => setSpotlight(null)} onSwitch={setSpotlight} onEdit={me?.admin ? editCard : undefined} />}
      </AnimatePresence>
    </>
  );
}

function ReducedMotionNotice() {
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem("rm-notice") === "1"; } catch { return false; } });
  if (!reduced || hidden) return null;
  const close = () => { setHidden(true); try { localStorage.setItem("rm-notice", "1"); } catch { /* sem storage */ } };
  return (
    <div role="status" className="max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-start gap-3 rounded-xl border border-zinc-200/15 bg-zinc-900/80 px-4 py-3 text-xs text-zinc-300">
        <p className="flex-1">Seu sistema está com <strong>movimento reduzido</strong> ativado, então as animações das cartas estão desligadas. Para vê-las, desative essa opção nas configurações de acessibilidade do seu sistema.</p>
        <button type="button" onClick={close} aria-label="Fechar aviso" className="shrink-0 text-zinc-400 hover:text-white cursor-pointer">✕</button>
      </div>
    </div>
  );
}
