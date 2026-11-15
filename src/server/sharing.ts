import { Resvg } from "@cf-wasm/resvg/workerd";
import { PhotonImage } from "@cf-wasm/photon/workerd";
import type { Env } from "../worker";
import { readPlayers } from "./catalog";
import { DEFAULT_TIER_CONFIG, STAT_KEYS, getPlayerOvr, teamOf } from "../lib/cards";
import { cardSvg, escapeXml } from "../lib/card-image";
import { lineupPlayers, lineupSummary, playerIdentity } from "../lib/lineups";
import { getCardTier } from "../lib/rarity";
import type { HeroArt, Player, Team, TierBand } from "../lib/types";

async function context(env: Env) {
  const [players, [teams, heroes, settings, cache]] = await Promise.all([readPlayers(env), env.DB.batch([
    env.DB.prepare("SELECT id, name, tag, region, logo_key FROM teams"),
    env.DB.prepare("SELECT * FROM heroes"),
    env.DB.prepare("SELECT value_json FROM settings WHERE key = ?").bind("tierConfig"),
    env.DB.prepare("SELECT body FROM api_cache WHERE cache_key = ?").bind("/v1/assets/heroes"),
  ])]);
  const own = (heroes.results as { name: string; image_key: string; zoom: number; x: number; y: number }[]).map((h) => ({ ...h, url: `/img/${h.image_key}` }));
  let apiHeroes = cache.results.length ? JSON.parse((cache.results[0] as { body: string }).body) as { name: string; images?: { icon_hero_card_webp?: string } }[] : [];
  if (!apiHeroes.length) {
    const response = await fetch(`${env.DEADLOCK_API_BASE}/v1/assets/heroes`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (response?.ok) apiHeroes = await response.json() as typeof apiHeroes;
  }
  return {
    players,
    teams: (teams.results as Record<string, string>[]).map((t) => ({ ...t, logo: t.logo_key ? `/img/${t.logo_key}` : undefined })) as Team[],
    tiers: settings.results.length ? JSON.parse((settings.results[0] as { value_json: string }).value_json) as TierBand[] : DEFAULT_TIER_CONFIG,
    art: (p: Player): HeroArt | null => {
      if (p.art?.url) return { name: p.hero, zoom: 100, x: 50, y: 50, ...p.art };
      const saved = own.find((h) => h.name === p.hero);
      if (saved) return saved;
      const url = apiHeroes.find((h) => h.name.toLowerCase() === p.hero.toLowerCase())?.images?.icon_hero_card_webp;
      return url ? { name: p.hero, url, zoom: 100, x: 50, y: 20 } : null;
    },
  };
}

async function imageData(env: Env, url: string | undefined): Promise<string | null> {
  if (!url) return null;
  let bytes: ArrayBuffer, type: string;
  if (url.startsWith("/img/")) {
    const obj = await env.ASSETS_BUCKET.get(url.slice(5));
    if (!obj || obj.size > 8 * 1024 * 1024) throw new Error("Imagem da carta indisponível.");
    bytes = await obj.arrayBuffer(); type = obj.httpMetadata?.contentType ?? "image/png";
  } else {
    const remote = new URL(url);
    if (remote.protocol !== "https:" || !(remote.hostname === "assets.deadlock-api.com" || remote.hostname.endsWith(".deadlock-api.com"))) throw new Error("Origem de imagem não suportada.");
    const response = await fetch(remote, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Não foi possível carregar a arte do herói.");
    type = response.headers.get("content-type")?.split(";")[0] || "";
    bytes = await response.arrayBuffer();
  }
  if (!/^image\/(png|jpeg|webp|gif)$/.test(type) || bytes.byteLength > 8 * 1024 * 1024) throw new Error("Formato de imagem não suportado.");
  // O resvg usado pelo Worker não decodifica WebP; convertemos sem mudar a arte.
  if (type === "image/webp") {
    const decoded = PhotonImage.new_from_byteslice(new Uint8Array(bytes));
    try { bytes = new Uint8Array(decoded.get_bytes()).buffer; } finally { decoded.free(); }
    type = "image/png";
  }
  let binary = "";
  const array = new Uint8Array(bytes);
  for (let i = 0; i < array.length; i += 8192) binary += String.fromCharCode(...array.subarray(i, i + 8192));
  return `data:${type};base64,${btoa(binary)}`;
}

export async function renderImage(request: Request, env: Env, cardId?: string): Promise<Response> {
  const url = new URL(request.url);
  const data = await context(env);
  const og = url.searchParams.get("og") === "1";
  const ids = cardId ? [cardId] : (url.searchParams.get("cards") || "").split(",");
  let roster: Player[];
  if (cardId) {
    const player = data.players.find((p) => p.id === cardId);
    if (!player) return Response.json({ error: "Carta não encontrada." }, { status: 404 });
    roster = [player];
  } else {
    try { roster = lineupPlayers(ids, data.players); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
  }
  const name = (url.searchParams.get("name") || "Meu time").slice(0, 60);
  const key = cardId ? `shares/${cardId}${og ? "-og" : ""}.png` : null;
  const fingerprint = JSON.stringify({ version: 3, roster, teams: roster.map((p) => teamOf(data.teams, p)), art: roster.map(data.art), tiers: data.tiers, og });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  if (key) {
    const cached = await env.ASSETS_BUCKET.get(key);
    if (cached?.customMetadata?.hash === hash) return new Response(cached.body, { headers: { "content-type": "image/png", "cache-control": "public, max-age=300", "etag": `"${hash}"` } });
  }
  const images = new Map<string, Promise<string | null>>();
  const image = (path?: string) => {
    if (!path) return Promise.resolve(null);
    if (!images.has(path)) images.set(path, imageData(env, path));
    return images.get(path)!;
  };
  const cards = await Promise.all(roster.map(async (p, i) => {
    const team = teamOf(data.teams, p), art = data.art(p);
    const [hero, logo] = await Promise.all([image(art?.url), image(team.logo)]);
    return cardSvg(p, team, data.tiers, art, hero, logo, `card${i}`);
  }));
  let svg = cards[0], width = 885;
  if (!cardId) {
    const summary = lineupSummary(roster);
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="1100" font-family="Barlow" font-weight="700"><rect width="1020" height="1100" fill="#090d12"/><text x="40" y="60" font-size="30" fill="#fff">${escapeXml(name)}</text><text x="980" y="60" text-anchor="end" font-size="26" fill="#67e8f9">${summary.ovr} OVR</text>${cards.map((card, i) => `<g transform="translate(${40 + i % 3 * 320},${100 + Math.floor(i / 3) * 450})">${card}</g>`).join("")}<text x="510" y="1040" text-anchor="middle" fill="#d4d4d8" font-size="19">${STAT_KEYS.map((k) => `${k} ${summary.stats[k]}`).join("    ·    ")}</text><text x="510" y="1080" text-anchor="middle" fill="#71717a" font-size="15">DEADLOCK CARDS · ESCALAÇÃO PERSONALIZADA</text></svg>`;
    width = 1530;
  } else if (og) {
    const p = roster[0], team = teamOf(data.teams, p), tier = getCardTier(p, data.tiers);
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" font-family="Barlow" font-weight="700"><rect width="1200" height="630" fill="#09090b"/><g transform="translate(65 70) scale(1.13)">${cards[0]}</g><text x="475" y="155" font-size="20" fill="${tier.c}" letter-spacing="4">DEADLOCK CARDS</text><text x="475" y="245" font-size="${Math.min(54, 900 / roster[0].name.length)}" fill="#fff">${escapeXml(p.name)}</text><text x="475" y="330" font-size="64" fill="${tier.c}">${getPlayerOvr(p)} OVR</text><text x="475" y="385" font-size="25" fill="#e4e4e7">${escapeXml(team.name)} · ${escapeXml(p.position)}</text><text x="475" y="430" font-size="25" fill="#a1a1aa">${escapeXml(p.hero)} · ${escapeXml(tier.name)}</text><text x="475" y="515" font-size="19" fill="#d4d4d8">${STAT_KEYS.map((k) => `${k} ${p.stats[k]}`).join(" · ")}</text></svg>`;
    width = 1200;
  }
  const fontResponse = await env.ASSETS.fetch(new Request(new URL("/fonts/Barlow-Bold.ttf", request.url)));
  if (!fontResponse.ok) throw new Error("Fonte de exportação indisponível.");
  const renderer = await Resvg.async(svg, { fitTo: { mode: "width", value: width }, font: { fontBuffers: [new Uint8Array(await fontResponse.arrayBuffer())], defaultFontFamily: "Barlow" } });
  let png: Uint8Array;
  try { const rendered = renderer.render(); try { png = rendered.asPng(); } finally { rendered.free(); } } finally { renderer.free(); }
  if (key) await env.ASSETS_BUCKET.put(key, png, { httpMetadata: { contentType: "image/png" }, customMetadata: { hash } });
  return new Response(new Uint8Array(png).buffer, { headers: { "content-type": "image/png", "cache-control": cardId ? "public, max-age=300" : "no-store", "content-disposition": "inline; filename=deadlock-cards.png" } });
}

export async function sharePage(request: Request, env: Env, kind: string, id: string): Promise<Response> {
  const origin = new URL(request.url).origin;
  const players = await readPlayers(env);
  let title: string, description: string, image: string | undefined, path = `/${kind}/${encodeURIComponent(id)}`;
  if (kind === "escalacao") {
    const row = await env.DB.prepare("SELECT name, player_ids_json FROM lineups WHERE id = ?").bind(id).first<{ name: string; player_ids_json: string }>();
    if (!row) return new Response("Escalação não encontrada", { status: 404 });
    const ids = JSON.parse(row.player_ids_json) as string[];
    title = `${row.name} · Deadlock Cards`;
    description = `Escalação personalizada com ${ids.map((v) => players.find((p) => p.id === v)?.name || "Carta indisponível").join(", ")}.`;
    image = `/api/lineup-image?${new URLSearchParams({ cards: ids.join(","), name: row.name })}`;
  } else {
    let p = players.find((p) => p.id === id);
    if (!p) return new Response("Jogador não encontrado", { status: 404 });
    if (kind === "jogador") { const identity = playerIdentity(p, players); p = players.find((v) => v.id === identity) ?? p; path = `/jogador/${encodeURIComponent(p.id)}`; }
    const team = await env.DB.prepare("SELECT name FROM teams WHERE id = ?").bind(p.teamId).first<{ name: string }>();
    const tierConfig = await env.DB.prepare("SELECT value_json FROM settings WHERE key = ?").bind("tierConfig").first<{ value_json: string }>();
    const tier = getCardTier(p, tierConfig ? JSON.parse(tierConfig.value_json) : DEFAULT_TIER_CONFIG);
    title = `${p.name} · OVR ${getPlayerOvr(p)} · Deadlock Cards`;
    description = `${team?.name || "Sem Time"} · ${p.position} · ${p.hero} · ${tier.name}${p.special ? " · Especial" : ""}. ${STAT_KEYS.map((k) => `${k} ${p!.stats[k]}`).join(" · ")}`;
    image = `/api/card-image/${encodeURIComponent(p.id)}?og=1`;
  }
  const response = await env.ASSETS.fetch(new Request(new URL("/", origin), request));
  const meta = `<link rel="canonical" href="${escapeXml(origin + path)}"/><meta name="description" content="${escapeXml(description)}"/><meta property="og:type" content="website"/><meta property="og:site_name" content="Deadlock Cards"/><meta property="og:title" content="${escapeXml(title)}"/><meta property="og:description" content="${escapeXml(description)}"/><meta property="og:url" content="${escapeXml(origin + path)}"/><meta property="og:image" content="${escapeXml(origin + image)}"/><meta property="og:image:type" content="image/png"/><meta property="og:image:alt" content="${escapeXml(description)}"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${escapeXml(title)}"/><meta name="twitter:description" content="${escapeXml(description)}"/><meta name="twitter:image" content="${escapeXml(origin + image)}"/>`;
  const rewritten = new HTMLRewriter().on("title", { element(el) { el.setInnerContent(title); } }).on("head", { element(el) { el.append(meta, { html: true }); } }).transform(response);
  const headers = new Headers(rewritten.headers);
  headers.set("cache-control", "no-cache");
  return new Response(rewritten.body, { status: rewritten.status, headers });
}
