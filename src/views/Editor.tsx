import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, useData } from "../lib/data";
import { DEFAULT_TIER_CONFIG, REGIONS, calculateOVR, getPlayerOvr } from "../lib/cards";
import { FRAME_PRESETS, getCardTier, type Tier } from "../lib/rarity";
import type { BgSettings, Player, Stats, Team, TierBand } from "../lib/types";
import { Card } from "../components/Card";
import { TeamLogo } from "../components/TeamLogo";
import { HoldButton } from "../components/HoldButton";

const POSITIONS = ["Carry", "OffCarry", "Frontline", "Flex", "Suporte"];
const STAT_KEYS: (keyof Stats)[] = ["MIR", "MAC", "SUP", "MOV", "POL", "CON"];
const SECTIONS = [
  { id: "card", label: "Carta" },
  { id: "teams", label: "Times" },
  { id: "heroes", label: "Heróis" },
  { id: "look", label: "Aparência" },
  { id: "codes", label: "Códigos" },
] as const;
type Section = (typeof SECTIONS)[number]["id"];

const input = "w-full rounded-xl bg-zinc-950/80 border border-zinc-200/20 focus:border-zinc-200/70 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none";
const btn = "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const primary = `${btn} bg-zinc-100 hover:bg-white text-zinc-950`;
const ghost = `${btn} border border-zinc-200/20 text-zinc-300 hover:text-white bg-zinc-900/60`;
const danger = `${btn} bg-red-600/90 hover:bg-red-500 text-white`;
const today = () => new Date().toISOString().slice(0, 10);
const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400"><span>{label}</span><span className="text-zinc-100 tabular-nums">{value}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-zinc-100" />
    </label>
  );
}

function ImagePick({ folder, onUrl, label = "Enviar imagem" }: { folder: Parameters<typeof api.upload>[0]; onUrl: (url: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`${ghost} inline-flex items-center gap-2 ${busy ? "opacity-50" : ""}`}>
      {busy ? "Enviando…" : label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try { onUrl(await api.upload(folder, f)); } catch (err) { alert((err as Error).message); } finally { setBusy(false); }
        }}
      />
    </label>
  );
}

function useSaver(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg("");
    try { await fn(); await reload(); setMsg(ok); } catch (e) { setMsg(`Erro: ${(e as Error).message}`); } finally { setBusy(false); }
  };
  return { busy, msg, run };
}

function Toast({ msg }: { msg: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p key={msg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`text-sm ${msg.startsWith("Erro") ? "text-red-300" : "text-emerald-300"}`}>
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function Editor({ editId, onEditId }: { editId: string | null; onEditId: (id: string | null) => void }) {
  const [section, setSection] = useState<Section>("card");
  useEffect(() => { if (editId) setSection("card"); }, [editId]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSection(s.id)} className={`relative px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border ${section === s.id ? "text-zinc-950 border-white" : "text-zinc-300 border-zinc-200/15 bg-zinc-900/60 hover:text-white"}`}>
            {section === s.id && <motion.span layoutId="editor-pill" className="absolute inset-0 rounded-xl bg-zinc-100" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className="relative">{s.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
          {section === "card" && <PlayerForm key={editId ?? "new"} editId={editId} onEditId={onEditId} />}
          {section === "teams" && <TeamsForm />}
          {section === "heroes" && <HeroesForm />}
          {section === "look" && <LookForm />}
          {section === "codes" && <CodesForm />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function blankPlayer(teamId: string): Player {
  const stats = { MIR: 88, MAC: 86, SUP: 82, MOV: 87, POL: 85, CON: 86 };
  return { id: "", teamId, name: "", position: "Carry", hero: "Abrams", stats, ovr: calculateOVR(stats), c1: "#0e7490", c2: "#082f49", history: [], footer: "Deadlock Cards" };
}

function withHistory(p: Player, date: string, rebase: boolean): Player {
  const ovr = Math.min(99, Math.max(1, Math.round(p.ovr ?? calculateOVR(p.stats))));
  const history = (p.id ? p.history : []).map((h) => ({ ...h }));
  const same = history.find((h) => h.date === date);
  if (same) { same.ovr = ovr; same.stats = { ...p.stats }; } else history.push({ date, ovr, stats: { ...p.stats } });
  history.sort((a, b) => a.date.localeCompare(b.date));
  if (rebase) history[history.length - 1].base = true;
  return { ...p, ovr, history };
}

function PlayerForm({ editId, onEditId }: { editId: string | null; onEditId: (id: string | null) => void }) {
  const { players, teams, heroNames, heroIcon, settings, reload } = useData();
  const existing = editId ? players.find((p) => p.id === editId) : undefined;
  const [d, setD] = useState<Player>(() => (existing ? structuredClone({ ...existing, ovr: getPlayerOvr(existing) }) : blankPlayer(teams[0]?.id ?? "")));
  const [date, setDate] = useState(today);
  const [rebase, setRebase] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const { busy, msg, run } = useSaver(reload);
  const set = (patch: Partial<Player>) => setD((p) => ({ ...p, ...patch }));
  const setStat = (k: keyof Stats, v: number) => setD((p) => { const stats = { ...p.stats, [k]: v }; return { ...p, stats, ovr: calculateOVR(stats) }; });
  const preview = withHistory({ ...d, name: d.name || "NOVO JOGADOR" }, date, rebase);
  const frame = d.frame ?? { style: "deco" };

  const save = () => {
    const id = d.id || newId("p");
    const body = { ...preview, id, name: d.name.trim() || "NOVO JOGADOR", footer: d.footer?.trim().slice(0, 30), specialText: d.special ? d.specialText?.trim().slice(0, 400) : undefined, frame: d.special ? frame : undefined };
    run(async () => { await api.save("players", id, body); onEditId(id); }, `Carta de "${body.name}" salva!`);
  };
  const remove = () => {
    if (!d.id) return;
    run(async () => { await api.remove("players", d.id); onEditId(null); }, "Carta excluída.");
  };

  if (!teams.length) return <p className="text-zinc-300">Crie um time na aba Times antes de criar cartas.</p>;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-8 items-start">
      <div className="noir-glass rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <span className="rk-chip">{d.id ? "Modo Edição" : "Modo Criação"}</span>
            <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-white mt-2">{d.id ? `Editar: ${existing?.name ?? d.name}` : "Criar Nova Carta"}</h2>
          </div>
          <div className="flex gap-2">
            <select className={`${input} w-auto`} value={editId ?? ""} onChange={(e) => onEditId(e.target.value || null)} aria-label="Carregar carta">
              <option value="">+ Nova carta</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name} · {teams.find((t) => t.id === p.teamId)?.tag ?? "?"}{p.inactive ? " (versão)" : ""}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome"><input className={input} value={d.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} placeholder="NOVO JOGADOR" /></Field>
          <Field label="Time">
            <select className={input} value={d.teamId} onChange={(e) => set({ teamId: e.target.value })}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.tag})</option>)}
            </select>
          </Field>
          <Field label="Posição">
            <select className={input} value={d.position} onChange={(e) => set({ position: e.target.value })}>
              {POSITIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Data do registro"><input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value || today())} /></Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Herói: <span className="text-zinc-100">{d.hero}</span></span>
            <input className={`${input} max-w-48 py-1.5`} placeholder="Buscar herói" value={heroQuery} onChange={(e) => setHeroQuery(e.target.value)} />
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-44 overflow-y-auto pr-1">
            {heroNames.filter((h) => h.toLowerCase().includes(heroQuery.toLowerCase())).map((h) => {
              const icon = heroIcon(h);
              return (
                <motion.button key={h} type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} onClick={() => set({ hero: h })} title={h} aria-pressed={d.hero === h}
                  className={`aspect-square rounded-lg overflow-hidden border cursor-pointer bg-zinc-900 ${d.hero === h ? "border-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" : "border-zinc-200/10 opacity-70 hover:opacity-100"}`}>
                  {icon ? <img src={icon} alt={h} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-[9px] text-zinc-300">{h}</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {STAT_KEYS.map((k) => <Range key={k} label={k} value={d.stats[k]} min={1} max={99} onChange={(v) => setStat(k, v)} />)}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <Field label={`OVR (média ${calculateOVR(d.stats)})`}>
            <input type="number" min={1} max={99} className={input} value={d.ovr ?? ""} onChange={(e) => set({ ovr: Number(e.target.value) })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2 pb-2.5">
            <input type="checkbox" checked={rebase} onChange={(e) => setRebase(e.target.checked)} className="accent-zinc-100" />
            Nova base de overall (zera a variação ▲/▼)
          </label>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Cor 1"><input type="color" className="w-full h-10 rounded-lg bg-transparent cursor-pointer" value={d.c1} onChange={(e) => set({ c1: e.target.value })} /></Field>
          <Field label="Cor 2"><input type="color" className="w-full h-10 rounded-lg bg-transparent cursor-pointer" value={d.c2} onChange={(e) => set({ c2: e.target.value })} /></Field>
          <Field label="Rodapé"><input className={input} maxLength={30} value={d.footer ?? ""} onChange={(e) => set({ footer: e.target.value })} /></Field>
          <Field label="Cor do rodapé"><input type="color" className="w-full h-10 rounded-lg bg-transparent cursor-pointer" value={d.footerColor ?? "#f4f4f5"} onChange={(e) => set({ footerColor: e.target.value })} /></Field>
        </div>
        <Range label="Tamanho do rodapé (px)" value={d.footerSize ?? 12} min={8} max={20} onChange={(v) => set({ footerSize: v })} />

        <div className="space-y-3 rounded-2xl border border-zinc-200/10 p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Arte própria da carta</span>
            <div className="flex gap-2">
              <ImagePick folder="players" onUrl={(url) => set({ art: { url, zoom: 100, x: 50, y: 50 } })} />
              {d.art && <button type="button" className={ghost} onClick={() => set({ art: undefined })}>Usar arte do herói</button>}
            </div>
          </div>
          {d.art && (
            <div className="grid sm:grid-cols-3 gap-4">
              <Range label="Zoom" value={d.art.zoom ?? 100} min={50} max={300} onChange={(v) => set({ art: { ...d.art!, zoom: v } })} />
              <Range label="X" value={d.art.x ?? 50} min={0} max={100} onChange={(v) => set({ art: { ...d.art!, x: v } })} />
              <Range label="Y" value={d.art.y ?? 50} min={0} max={100} onChange={(v) => set({ art: { ...d.art!, y: v } })} />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-amber-200/15 p-4">
          <label className="flex items-center gap-2 text-sm font-bold text-amber-200">
            <input type="checkbox" checked={!!d.special} onChange={(e) => set({ special: e.target.checked || undefined })} className="accent-amber-300" />
            Carta especial
          </label>
          {d.special && (
            <>
              <div className="flex flex-wrap gap-2">
                {Object.entries(FRAME_PRESETS).map(([k, pr]) => (
                  <button key={k} type="button" onClick={() => set({ frame: { style: k } })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${frame.style === k ? "text-zinc-950 border-white" : "text-zinc-200 border-zinc-200/15"}`}
                    style={frame.style === k ? { background: `linear-gradient(135deg, ${pr.c1}, ${pr.c2})` } : undefined}>
                    {pr.name}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Cor da moldura"><input type="color" className="w-full h-10 rounded-lg bg-transparent cursor-pointer" value={frame.c1 ?? FRAME_PRESETS[frame.style]?.c1 ?? "#d9a93a"} onChange={(e) => set({ frame: { ...frame, c1: e.target.value } })} /></Field>
                <Field label="Cor do brilho"><input type="color" className="w-full h-10 rounded-lg bg-transparent cursor-pointer" value={frame.c2 ?? FRAME_PRESETS[frame.style]?.c2 ?? "#fff0b8"} onChange={(e) => set({ frame: { ...frame, c2: e.target.value } })} /></Field>
                <Range label="Espessura" value={frame.pad ?? FRAME_PRESETS[frame.style]?.pad ?? 4} min={2} max={10} onChange={(v) => set({ frame: { ...frame, pad: v } })} />
              </div>
              <Field label="Texto especial"><textarea className={input} rows={2} maxLength={400} value={d.specialText ?? ""} onChange={(e) => set({ specialText: e.target.value })} /></Field>
            </>
          )}
        </div>

        <fieldset className="space-y-4 rounded-2xl border border-zinc-200/10 p-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-zinc-300">Perfil público (opcional)</legend>
          <Field label="Biografia curta"><textarea className={input} rows={3} maxLength={500} value={d.profile?.bio ?? ""} onChange={(e) => set({ profile: { ...d.profile, bio: e.target.value } })} /></Field>
          <Field label="SteamID (17 dígitos)"><input className={input} inputMode="numeric" maxLength={17} value={d.profile?.steamId ?? ""} onChange={(e) => set({ profile: { ...d.profile, steamId: e.target.value } })} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">{(["twitch", "steam", "discord", "website"] as const).map((key) => <Field key={key} label={key === "website" ? "Outra rede / site (URL HTTPS)" : `${key} (URL HTTPS)`}><input className={input} type="url" maxLength={300} placeholder="https://…" value={d.profile?.socials?.[key] ?? ""} onChange={(e) => set({ profile: { ...d.profile, socials: { ...d.profile?.socials, [key]: e.target.value } } })} /></Field>)}</div>
          <Field label="Versão de outro jogador"><select className={input} value={d.variantOf ?? ""} onChange={(e) => set({ variantOf: e.target.value || undefined })}><option value="">Carta principal / jogador independente</option>{players.filter((p) => p.id !== d.id && (!p.variantOf || p.variantOf === p.id)).map((p) => <option value={p.id} key={p.id}>{p.name} · {p.hero}</option>)}</select></Field>
          <p className="text-xs text-zinc-500">Edite os dados do perfil na carta principal. O vínculo entre versões impede duplicatas nas escalações.</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primary} disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar carta"}</button>
          {d.id && <HoldButton className={danger} disabled={busy} onConfirm={remove} label={`Excluir a carta de ${d.name}`}>Segure p/ excluir</HoldButton>}
          {d.id && <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={!!d.inactive} onChange={(e) => set({ inactive: e.target.checked || undefined })} className="accent-zinc-100" />Fora do elenco (versão guardada)</label>}
          <Toast msg={msg} />
        </div>
      </div>

      <div className="lg:sticky lg:top-28 flex justify-center">
        <motion.div key={d.hero + (d.special ? frame.style : "")} initial={{ rotateY: -25, opacity: 0.4 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }} style={{ transformPerspective: 1200 }}>
          <TierPulse tier={getCardTier(preview, settings.tierConfig!)}>
            <Card player={preview} variant="editor" />
          </TierPulse>
        </motion.div>
      </div>
    </div>
  );
}

function TierPulse({ tier, children }: { tier: Tier; children: ReactNode }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const id = `${tier.key}:${tier.frame ?? ""}`;
  const prev = useRef(id);
  useEffect(() => {
    if (prev.current === id) return;
    prev.current = id;
    animate(scope.current, { scale: [1, 1.04, 1] }, { duration: 0.4, ease: [0.22, 1, 0.36, 1] });
    animate("[data-glow]", { opacity: [0, 0.6, 0] }, { duration: 0.3 });
  }, [id, animate, scope]);
  return (
    <div ref={scope} className="relative">
      {children}
      <div data-glow aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0" style={{ boxShadow: `0 0 48px 12px ${tier.c}` }} />
    </div>
  );
}

function TeamsForm() {
  const { teams, players, reload } = useData();
  const [d, setD] = useState<Team | null>(null);
  const { busy, msg, run } = useSaver(reload);
  const set = (patch: Partial<Team>) => setD((t) => (t ? { ...t, ...patch } : t));

  const save = () => {
    if (!d || !d.name.trim() || !d.tag.trim()) return;
    const id = d.id || newId("t");
    run(async () => { await api.save("teams", id, { ...d, id, name: d.name.trim(), tag: d.tag.trim().toUpperCase().slice(0, 6) }); setD(null); }, `Time "${d.name}" salvo!`);
  };
  const remove = (t: Team) => {
    run(() => api.remove("teams", t.id), "Time excluído.");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="noir-glass rounded-3xl p-5 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">Times ({teams.length})</h2>
          <button type="button" className={primary} onClick={() => setD({ id: "", name: "", tag: "", region: "Europa" })}>+ Novo time</button>
        </div>
        {teams.map((t) => (
          <motion.div layout key={t.id} className="flex items-center gap-3 rounded-xl bg-zinc-950/50 border border-zinc-200/10 p-2.5">
            <div className="w-10 h-10 shrink-0"><TeamLogo team={t} /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-100 truncate">{t.name} <span className="text-zinc-400">({t.tag})</span></p>
              <p className="text-xs text-zinc-400">{t.region} · {players.filter((p) => p.teamId === t.id).length} cartas</p>
            </div>
            <button type="button" className={ghost} onClick={() => setD(structuredClone(t))}>Editar</button>
            <HoldButton className={danger} disabled={busy} onConfirm={() => remove(t)} label={`Excluir ${t.name} e suas ${players.filter((p) => p.teamId === t.id).length} cartas`}>✕</HoldButton>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {d && (
          <motion.div key={d.id || "new"} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="noir-glass rounded-3xl p-5 space-y-4">
            <h3 className="text-lg font-black uppercase tracking-[0.12em] text-white">{d.id ? `Editar ${d.name}` : "Novo time"}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome"><input className={input} value={d.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} /></Field>
              <Field label="Tag"><input className={input} value={d.tag} maxLength={6} onChange={(e) => set({ tag: e.target.value })} /></Field>
              <Field label="Região">
                <select className={input} value={d.region} onChange={(e) => set({ region: e.target.value })}>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <div className="flex items-end gap-3">
                {d.logo && <div className="w-12 h-12"><TeamLogo team={d} /></div>}
                <ImagePick folder="teams" label="Logo" onUrl={(logo) => set({ logo })} />
                {d.logo && <button type="button" className={ghost} onClick={() => set({ logo: undefined })}>Remover</button>}
              </div>
            </div>
            <BgFields bg={d.bg} onChange={(bg) => set({ bg })} folder="teams" title="Fundo do time" />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={primary} disabled={busy || !d.name.trim() || !d.tag.trim()} onClick={save}>{busy ? "Salvando…" : "Salvar time"}</button>
              <button type="button" className={ghost} onClick={() => setD(null)}>Cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="lg:col-span-2"><Toast msg={msg} /></div>
    </div>
  );
}

const DEFAULT_BG: BgSettings = { enabled: true, color: "#09090b", imageOpacity: 60, overlayOpacity: 55, blur: 0, size: "cover" };

function BgFields({ bg, onChange, folder, title }: { bg?: BgSettings; onChange: (bg: BgSettings | undefined) => void; folder: "bg" | "teams"; title: string }) {
  const b = bg ?? DEFAULT_BG;
  const set = (patch: Partial<BgSettings>) => onChange({ ...b, ...patch });
  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{title}</span>
        <div className="flex gap-2">
          <ImagePick folder={folder} label="Imagem" onUrl={(imageUrl) => set({ imageUrl })} />
          {b.imageUrl && <button type="button" className={ghost} onClick={() => set({ imageUrl: undefined })}>Sem imagem</button>}
          {bg && <button type="button" className={ghost} onClick={() => onChange(undefined)}>Padrão</button>}
        </div>
      </div>
      {b.imageUrl && <img src={b.imageUrl} alt="" className="h-20 rounded-lg object-cover" />}
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Cor"><input type="color" className="w-full h-10 rounded-lg bg-transparent cursor-pointer" value={b.color} onChange={(e) => set({ color: e.target.value })} /></Field>
        <Field label="Ajuste">
          <select className={input} value={b.size} onChange={(e) => set({ size: e.target.value })}>
            <option value="cover">Cobrir</option><option value="contain">Conter</option><option value="auto">Original</option>
          </select>
        </Field>
        <Range label="Opacidade da imagem" value={b.imageOpacity} min={0} max={100} onChange={(v) => set({ imageOpacity: v })} />
        <Range label="Escurecer" value={b.overlayOpacity} min={0} max={100} onChange={(v) => set({ overlayOpacity: v })} />
        <Range label="Desfoque" value={b.blur} min={0} max={20} onChange={(v) => set({ blur: v })} />
      </div>
    </div>
  );
}

function HeroesForm() {
  const { heroNames, heroes, heroArt, heroIcon, players, teams, reload } = useData();
  const [name, setName] = useState(heroNames[0] ?? "Abrams");
  const [art, setArt] = useState(() => heroArt(name));
  const { busy, msg, run } = useSaver(reload);
  useEffect(() => { setArt(heroArt(name)); }, [name]); // eslint-disable-line react-hooks/exhaustive-deps
  const sample: Player = { ...(players[0] ?? { id: "x", teamId: teams[0]?.id ?? "", position: "Flex", stats: { MIR: 85, MAC: 85, SUP: 85, MOV: 85, POL: 85, CON: 85 }, c1: "#0e7490", c2: "#082f49", history: [] }), name: name.toUpperCase(), hero: name, art: art ?? undefined, special: undefined };

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-8 items-start">
      <div className="noir-glass rounded-3xl p-5 space-y-5">
        <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">Arte dos heróis</h2>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-52 overflow-y-auto pr-1">
          {heroNames.map((h) => {
            const icon = heroIcon(h);
            return (
              <button key={h} type="button" onClick={() => setName(h)} title={h} aria-pressed={name === h}
                className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer bg-zinc-900 ${name === h ? "border-white" : "border-zinc-200/10 opacity-70 hover:opacity-100"}`}>
                {icon ? <img src={icon} alt={h} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-[9px] text-zinc-300">{h}</span>}
                {heroes[h] && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400" aria-label="arte própria" />}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-zinc-300"><b className="text-white">{name}</b> · {heroes[name] ? "arte própria salva" : "usando arte da deadlock-api"}</p>
        <div className="flex flex-wrap gap-2">
          <ImagePick folder="heroes" onUrl={(url) => setArt({ name, url, zoom: 100, x: 50, y: 30 })} />
          {heroes[name] && <button type="button" className={danger} disabled={busy} onClick={() => run(() => api.remove("heroes", name), "Arte própria removida.")}>Remover arte própria</button>}
        </div>
        {art && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Range label="Zoom" value={art.zoom} min={50} max={300} onChange={(zoom) => setArt({ ...art, zoom })} />
            <Range label="X" value={art.x} min={0} max={100} onChange={(x) => setArt({ ...art, x })} />
            <Range label="Y" value={art.y} min={0} max={100} onChange={(y) => setArt({ ...art, y })} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <button type="button" className={primary} disabled={busy || !art?.url.startsWith("/img/")} onClick={() => run(() => api.save("heroes", name, art), `Arte de ${name} salva!`)}>
            {busy ? "Salvando…" : "Salvar arte"}
          </button>
          <Toast msg={msg} />
        </div>
      </div>
      <div className="lg:sticky lg:top-28 flex justify-center"><Card player={sample} variant="editor" /></div>
    </div>
  );
}

function LookForm() {
  const { settings, reload } = useData();
  const [bg, setBg] = useState(settings.bg);
  const [homeHero, setHomeHero] = useState(settings.homeHero);
  const [tiers, setTiers] = useState<TierBand[]>(() => structuredClone(settings.tierConfig ?? DEFAULT_TIER_CONFIG));
  const { busy, msg, run } = useSaver(reload);
  const setTier = (i: number, patch: Partial<TierBand>) => setTiers((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="noir-glass rounded-3xl p-5 space-y-5">
        <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">Fundo e capa</h2>
        <BgFields bg={bg} onChange={setBg} folder="bg" title="Fundo do site" />
        <div className="space-y-3 rounded-2xl border border-zinc-200/10 p-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Imagem da capa (Home)</span>
          {homeHero && <img src={homeHero} alt="" className="h-28 rounded-lg object-cover" />}
          <div className="flex gap-2">
            <ImagePick folder="home" onUrl={setHomeHero} />
            {homeHero && <button type="button" className={ghost} onClick={() => setHomeHero(undefined)}>Remover</button>}
          </div>
        </div>
      </div>
      <div className="noir-glass rounded-3xl p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">Tier List</h2>
          <button type="button" className={ghost} onClick={() => setTiers(structuredClone(DEFAULT_TIER_CONFIG))}>Padrão</button>
        </div>
        {tiers.map((t, i) => (
          <div key={t.key} className="grid grid-cols-[3rem_1fr_1fr_2.5rem_2.5rem] gap-2 items-center">
            <span className="h-9 rounded-lg flex items-center justify-center font-black" style={{ background: t.bg, color: t.text }}>{t.key}</span>
            <input type="number" className={input} value={t.min} aria-label={`Mínimo ${t.key}`} onChange={(e) => setTier(i, { min: Number(e.target.value) })} />
            <input type="number" className={input} value={t.max} aria-label={`Máximo ${t.key}`} onChange={(e) => setTier(i, { max: Number(e.target.value) })} />
            <input type="color" className="w-full h-9 rounded bg-transparent cursor-pointer" value={t.bg} aria-label={`Cor ${t.key}`} onChange={(e) => setTier(i, { bg: e.target.value })} />
            <input type="color" className="w-full h-9 rounded bg-transparent cursor-pointer" value={t.text} aria-label={`Texto ${t.key}`} onChange={(e) => setTier(i, { text: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="lg:col-span-2 flex items-center gap-3">
        <button type="button" className={primary} disabled={busy} onClick={() => run(() => api.save("settings", "app", { bg: bg ?? null, homeHero: homeHero ?? null, tierConfig: tiers }), "Aparência salva!")}>
          {busy ? "Salvando…" : "Salvar aparência"}
        </button>
        <Toast msg={msg} />
      </div>
    </div>
  );
}

type Code = { code: string; player_id: string; max_uses: number; uses: number; starts_at: number | null; expires_at: number | null };

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHABET[b % ALPHABET.length]).join("");
const toTs = (v: string) => (v ? Math.floor(new Date(v).getTime() / 1000) : null);
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmtTs = (ts: number | null) => (ts ? new Date(ts * 1000).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "sem limite");

function codeStatus(c: Code, now: number) {
  if (c.uses >= c.max_uses) return { label: "esgotado", cls: "text-zinc-400" };
  if (c.expires_at && c.expires_at <= now) return { label: "expirado", cls: "text-red-300" };
  if (c.starts_at && c.starts_at > now) return { label: "agendado", cls: "text-amber-300" };
  return { label: "ativo", cls: "text-emerald-300" };
}

function CodesForm() {
  const { players, teams } = useData();
  const [codes, setCodes] = useState<Code[]>([]);
  const [code, setCode] = useState(randomCode);
  const [pick, setPick] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const label = (p: Player) => `${p.name} · ${p.hero} · ${teams.find((t) => t.id === p.teamId)?.tag ?? ""}`;
  const byLabel = new Map(players.map((p) => [label(p), p.id]));
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  const load = () =>
    fetch("/api/codes")
      .then((r) => (r.ok ? (r.json() as Promise<Code[]>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setCodes)
      .catch((e: Error) => setMsg(`Erro: ${e.message}`));

  useEffect(() => { load(); }, []);

  const expireIn = (ms: number | null) => setExpiresAt(ms === null ? "" : localInput(new Date(Date.now() + ms)));

  const create = async () => {
    const playerId = byLabel.get(pick);
    if (!playerId) return setMsg("Erro: escolha uma carta da lista");
    setBusy(true);
    setMsg("");
    try {
      await api.createCode({ code, playerId, maxUses, startsAt: toTs(startsAt), expiresAt: toTs(expiresAt) });
      setMsg(`Código ${code} criado`);
      setCode(randomCode());
      await load();
    } catch (e) {
      setMsg(`Erro: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: string) => {
    if (!confirm(`Apagar o código ${c}?`)) return;
    try {
      await api.removeCode(c);
      await load();
    } catch (e) {
      setMsg(`Erro: ${(e as Error).message}`);
    }
  };

  const now = Math.floor(Date.now() / 1000);
  const quick = "px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-zinc-200/20 text-zinc-300 hover:text-white bg-zinc-900/60 cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="noir-glass rounded-3xl p-5 sm:p-7 space-y-6">
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-[0.12em] text-zinc-100">Novo código</h2>
          <p className="text-xs text-zinc-400 mt-1">Quem digitar o código na aba Resgatar ganha a carta escolhida.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="1. Código">
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${input} tracking-[0.15em] font-bold`} />
              <button type="button" onClick={() => setCode(randomCode())} className={ghost}>Gerar</button>
            </div>
          </Field>

          <Field label="2. Carta">
            <input list="codes-players" value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Digite o nome do jogador…" className={input} />
            <datalist id="codes-players">
              {[...players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => <option key={p.id} value={label(p)} />)}
            </datalist>
          </Field>

          <Field label="3. Quantas pessoas podem resgatar">
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} className={`${input} w-28`} />
              {[1, 10, 100].map((n) => <button key={n} type="button" onClick={() => setMaxUses(n)} className={quick}>{n}</button>)}
            </div>
          </Field>

          <Field label="4. Validade">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => expireIn(null)} className={quick}>Sem prazo</button>
              <button type="button" onClick={() => expireIn(3600000)} className={quick}>1 hora</button>
              <button type="button" onClick={() => expireIn(86400000)} className={quick}>1 dia</button>
              <button type="button" onClick={() => expireIn(7 * 86400000)} className={quick}>7 dias</button>
            </div>
          </Field>

          <Field label="Começa em (opcional)">
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} />
          </Field>

          <Field label="Expira em (opcional)">
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={input} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={create} disabled={busy || !code || !pick} className={primary}>{busy ? "Criando…" : "Criar código"}</button>
          <Toast msg={msg} />
        </div>
      </div>

      <div className="noir-glass rounded-3xl p-5 sm:p-7 space-y-3">
        <h2 className="text-lg font-extrabold uppercase tracking-[0.12em] text-zinc-100">Códigos criados</h2>
        {codes.length === 0 && <p className="text-xs text-zinc-400">Nenhum código ainda.</p>}
        {codes.map((c) => {
          const st = codeStatus(c, now);
          return (
            <div key={c.code} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 rounded-2xl bg-zinc-900/60 border border-zinc-200/10 text-xs text-zinc-200">
              <span className="font-extrabold tracking-[0.15em] text-zinc-100">{c.code}</span>
              <span className="truncate max-w-48">{nameOf(c.player_id)}</span>
              <span>{c.uses}/{c.max_uses} usos</span>
              <span className="text-zinc-400">{fmtTs(c.starts_at)} → {fmtTs(c.expires_at)}</span>
              <span className={`font-bold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
              <button type="button" onClick={() => remove(c.code)} className="ml-auto px-3 py-1.5 rounded-lg text-red-300 hover:bg-red-950/40 cursor-pointer">Apagar</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
