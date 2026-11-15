import { useState } from "react";
import { copyLink, downloadPng, shareLink } from "../lib/share";

export function ShareActions({ title, path, imageUrl }: { title: string; path: string; imageUrl?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<string | void>) => {
    setBusy(true); setMessage("");
    try { setMessage(await action() || ""); } catch (e) { setMessage(`Erro: ${(e as Error).message}`); } finally { setBusy(false); }
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <button type="button" className="feature-button" disabled={busy} onClick={() => run(() => shareLink(title, path))}>Compartilhar</button>
      <button type="button" className="feature-button" disabled={busy} onClick={() => run(async () => { await copyLink(path); return "Link copiado. Pronto para colar no Discord ou em outra plataforma."; })}>Copiar link</button>
      <a className="feature-button" href={`https://wa.me/?text=${encodeURIComponent(title + " " + new URL(path, location.origin).href)}`} target="_blank" rel="noreferrer">WhatsApp</a>
      {imageUrl && <button type="button" className="feature-button" disabled={busy} onClick={() => run(async () => { await downloadPng(imageUrl, `${title.replace(/[^\p{L}\p{N}-]+/gu, "-")}.png`); return "PNG pronto para baixar."; })}>{busy ? "Preparando…" : "Baixar PNG"}</button>}
    </div>
    <p className="text-xs text-zinc-300" role="status">{message}</p>
  </div>;
}
