import { useEffect, useState } from "react";
import { CardPreview } from "../components/CardPreview";
import { PlayerPicker } from "../components/PlayerPicker";
import { StatsRadar } from "../components/StatsRadar";
import { ShareActions } from "../components/ShareActions";
import { HoldButton } from "../components/HoldButton";
import { STAT_KEYS, getPlayerOvr } from "../lib/cards";
import { useData } from "../lib/data";
import { lineupPlayers, lineupSummary, playerIdentity } from "../lib/lineups";
import { navigate } from "../lib/navigation";
import { downloadPng } from "../lib/share";
import type { Lineup } from "../lib/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível carregar as escalações.");
  return body;
}
const empty = () => Array<string>(6).fill("");

export function LineupBuilder({ id }: { id?: string }) {
  const { players, me } = useData();
  const [ids, setIds] = useState(empty);
  const [name, setName] = useState("Meu time");
  const [saved, setSaved] = useState<Lineup[]>([]);
  const [current, setCurrent] = useState<Lineup | null>(null);
  const [slot, setSlot] = useState(0);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [listError, setListError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!me) { setSaved([]); return; }
    request<Lineup[]>("/api/lineups", { signal: controller.signal }).then((list) => { setSaved(list); setListError(""); }).catch((e: Error) => { if (e.name !== "AbortError") setListError(e.message); });
    return () => controller.abort();
  }, [me, retry]);
  useEffect(() => {
    const controller = new AbortController();
    setMessage(""); setCurrent(null);
    if (!id) {
      let draft: { name: string; ids: string[] } | null = null;
      try {
        const raw = JSON.parse(sessionStorage.getItem("lineup-draft") || "null");
        if (raw && typeof raw.name === "string" && Array.isArray(raw.ids) && raw.ids.length === 6 && raw.ids.every((v: unknown) => typeof v === "string")) draft = raw;
        sessionStorage.removeItem("lineup-draft");
      } catch { /* O rascunho é opcional quando o armazenamento não está disponível. */ }
      setIds(draft?.ids ?? empty()); setName(draft?.name ?? "Meu time"); setLoading(false); return;
    }
    setLoading(true);
    request<Lineup>(`/api/lineups/${encodeURIComponent(id)}`, { signal: controller.signal }).then((lineup) => { setCurrent(lineup); setName(lineup.name); setIds(lineup.playerIds); }).catch((e: Error) => { if (e.name !== "AbortError") { setIds(empty()); setMessage(e.message); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);
  const roster = ids.flatMap((cardId) => { const p = players.find((p) => p.id === cardId); return p ? [p] : []; });
  const summary = lineupSummary(roster);
  const dirty = !!current && (name !== current.name || ids.join() !== current.playerIds.join());
  const used = new Set(ids.filter((_, i) => i !== slot).flatMap((cardId) => { const p = players.find((p) => p.id === cardId); return p ? [playerIdentity(p, players)] : []; }));
  const available = players.filter((p) => !used.has(playerIdentity(p, players)));
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await action(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  };
  const save = (copy = false) => run(async () => {
    lineupPlayers(ids, players);
    if (!name.trim()) throw new Error("Dê um nome ao time.");
    const updating = !copy && current?.owned;
    const next = await request<Lineup>(updating ? `/api/lineups/${current.id}` : "/api/lineups", { method: updating ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: copy ? `${name.slice(0, 52)} (cópia)` : name, playerIds: ids }) });
    setCurrent(next); setName(next.name); setSaved((list) => [next, ...list.filter((l) => l.id !== next.id)]); setMessage("Escalação salva na sua conta.");
    navigate(`/escalacao/${next.id}`);
  });
  const remove = (lineup: Lineup) => run(async () => {
    await request(`/api/lineups/${lineup.id}`, { method: "DELETE" });
    setSaved((list) => list.filter((l) => l.id !== lineup.id));
    if (id === lineup.id) navigate("/montar-time");
    setMessage("Escalação excluída.");
  });
  const changeSlot = (value: string) => {
    setIds((old) => old.map((v, i) => i === slot ? value : v));
    if (value) { const next = ids.findIndex((v, i) => i !== slot && !v); if (next !== -1) setSlot(next); }
  };
  return <div className="space-y-8">
    <header className="feature-heading"><span className="feature-eyebrow">Seu elenco ideal</span><h1>Montar time</h1><p>Seis escolhas. Qualquer time, qualquer versão. A escalação é sua.</p></header>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <section className="feature-panel lineup-field space-y-5">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-black text-white break-words">{name}</h2><p className="feature-label">{summary.count}/6 jogadores · Formação 3–3</p></div><div className="text-right shrink-0"><strong className="text-4xl font-black text-white">{summary.ovr || "—"}</strong><p className="feature-label">OVR médio</p></div></div>
        {loading ? <p role="status" className="feature-empty min-h-80">Carregando escalação…</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-6">{ids.map((cardId, i) => { const p = players.find((p) => p.id === cardId); return <div key={i} className={`lineup-slot min-w-0 ${slot === i ? "lineup-slot-active" : ""}`}>
          <button className="feature-label w-full text-left mb-2 cursor-pointer" type="button" onClick={() => setSlot(i)} aria-pressed={slot === i}>Posição {i + 1} {slot === i ? "· selecionada" : ""}</button>
          {p ? <CardPreview player={p} onOpen={() => setSlot(i)} /> : <button type="button" className="feature-empty aspect-[295/430] w-full cursor-pointer" onClick={() => setSlot(i)}>{cardId ? "Carta indisponível · substituir" : "+ Adicionar jogador"}</button>}
          {p && <><p className="text-center text-xs text-zinc-300 mt-2">{p.name} · <strong>{getPlayerOvr(p)} OVR</strong></p><div className="flex flex-wrap justify-center gap-2 mt-2"><button className="feature-button !px-2 !py-1" onClick={() => setSlot(i)} type="button">Trocar</button><button className="feature-button !px-2 !py-1" aria-label={`Remover ${p.name}`} onClick={() => setIds((old) => old.map((v, j) => j === i ? "" : v))} type="button">Remover</button></div></>}
        </div>; })}</div>}
        <p className="text-xs text-zinc-500">Médias da escalação personalizada, independentes do ranking oficial.</p>
      </section>
      <aside className="feature-panel space-y-5 lg:sticky lg:top-24">
        <label className="feature-label">Nome da escalação<input className="feature-input mt-2" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <PlayerPicker key={slot} label={`Escolher posição ${slot + 1}`} value={ids[slot]} onChange={changeSlot} available={available} />
        <p className="text-xs text-zinc-400">Jogadores já escalados ficam fora da lista, incluindo outras versões.</p>
        <div className="flex flex-wrap gap-2">
          {me ? <><button className="feature-button feature-primary" type="button" disabled={busy || loading || roster.length !== 6} onClick={() => save()}>{busy ? "Salvando…" : current?.owned ? "Salvar alterações" : "Salvar na minha conta"}</button>{current?.owned && <button className="feature-button" type="button" disabled={busy || loading || roster.length !== 6} onClick={() => save(true)}>Duplicar</button>}</> : <a className="feature-button feature-primary" href="/login?next=%2Fmontar-time" onClick={() => { try { sessionStorage.setItem("lineup-draft", JSON.stringify({ name, ids })); } catch { /* O navegador pode bloquear armazenamento. */ } }}>Entrar para salvar</a>}
          <button type="button" className="feature-button" disabled={busy || roster.length !== 6} onClick={() => run(async () => { lineupPlayers(ids, players); await downloadPng(`/api/lineup-image?${new URLSearchParams({ cards: ids.join(","), name })}`, "deadlock-escalacao.png"); setMessage("PNG pronto para baixar."); })}>Exportar PNG</button>
        </div>
        {current && !dirty && <ShareActions title={current.name} path={`/escalacao/${current.id}`} />}
        {dirty && <p className="text-xs text-amber-200">Alterações não salvas. Salve para atualizar o link público.</p>}
        <p role="status" className="text-sm text-zinc-300">{message}</p>
        <p className="text-xs text-zinc-500">Escalações salvas podem ser vistas por quem receber o link.</p>
      </aside>
    </div>
    <section className="feature-panel grid md:grid-cols-2 gap-6"><div><h2 className="feature-subtitle">Distribuição da equipe</h2><div className="space-y-4 mt-5">{STAT_KEYS.map((k) => <div key={k}><div className="flex justify-between text-xs text-zinc-300 mb-1"><span>{k}</span><strong>{summary.stats[k]}</strong></div><div className="h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-200" style={{ width: `${summary.stats[k]}%` }} /></div></div>)}</div></div><StatsRadar series={[{ label: "Média dos jogadores selecionados", stats: summary.stats, color: "#67e8f9" }]} /></section>
    <section className="space-y-4"><div className="flex flex-wrap justify-between items-center gap-3"><h2 className="feature-subtitle">Minhas escalações</h2><a className="feature-button" href="/montar-time" onClick={() => { if (!id) { setIds(empty()); setName("Meu time"); setCurrent(null); } }}>+ Nova escalação</a></div>
      {!me && <p className="text-zinc-400 text-sm">Entre na sua conta para salvar vários times e acessá-los em outros dispositivos.</p>}
      {listError && <p role="alert" className="text-red-300">{listError} <button className="feature-button" onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button></p>}
      {me && !saved.length && !listError && <p className="text-zinc-400 text-sm">Você ainda não salvou uma escalação.</p>}
      <div className="grid md:grid-cols-2 gap-3">{saved.map((lineup) => <article key={lineup.id} className="feature-panel flex flex-wrap items-center gap-3"><div className="flex-1 min-w-0"><h3 className="font-bold text-white break-words">{lineup.name}</h3><p className="text-xs text-zinc-500">{new Date(lineup.updatedAt).toLocaleDateString("pt-BR")}</p></div><a className="feature-button" href={`/escalacao/${lineup.id}`}>Editar</a><HoldButton className="feature-button text-red-300" disabled={busy} onConfirm={() => remove(lineup)} label={`Excluir ${lineup.name}`}>Segure para excluir</HoldButton></article>)}</div>
    </section>
  </div>;
}
