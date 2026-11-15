/// <reference types="@cloudflare/workers-types" />
import { createAuth, currentUser } from "./auth";
import { playerFromRow, readPlayers } from "./server/catalog";
import { lineups } from "./server/lineups";
import { validateProfile, validStats } from "./lib/profiles";
import { getPlayerOvr } from "./lib/cards";
import { playerIdentity } from "./lib/lineups";
import { renderImage, sharePage } from "./server/sharing";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ASSETS_BUCKET: R2Bucket;
  DEADLOCK_API_BASE: string;
  BETTER_AUTH_SECRET: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMINS: string;
  GITHUB_TOKEN: string;
}

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const UPLOAD_FOLDERS = ["players", "teams", "heroes", "bg", "home"];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const PLAYER_EXTRA = ["footer", "footerSize", "footerColor", "special", "specialText", "frame", "variantOf", "inactive", "art"];
const ID_RE = /^[\w-]{1,64}$/;

const keyOf = (url: unknown) => (typeof url === "string" && url.startsWith("/img/") ? url.slice(5) : null);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
// `code` é opcional: rotas que o front traduz mandam um código estável além da mensagem em pt.
const bad = (msg: string, status = 400, code?: string) => Response.json({ error: msg, code }, { status });

const CACHE_TTL_SECONDS = 60 * 60 * 6;
const ALLOWED_PATHS = ["/v1/assets/heroes", "/v1/analytics/hero-stats", "/v1/patches"];
const UPSERT_CACHE =
  "INSERT INTO api_cache (cache_key, body, fetched_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET body = excluded.body, fetched_at = excluded.fetched_at";

const imgUrl = (key: string | null) => (key ? `/img/${key}` : undefined);
const parse = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

async function cachedFetch(env: Env, path: string): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare("SELECT body, fetched_at FROM api_cache WHERE cache_key = ?")
    .bind(path)
    .first<{ body: string; fetched_at: number }>();
  if (row && now - row.fetched_at < CACHE_TTL_SECONDS) {
    return new Response(row.body, { headers: { "content-type": "application/json", "x-cache": "hit" } });
  }
  const upstream = await fetch(env.DEADLOCK_API_BASE + path);
  if (!upstream.ok) return upstream;
  const body = await upstream.text();
  await env.DB.prepare(UPSERT_CACHE).bind(path, body, now).run();
  return new Response(body, { headers: { "content-type": "application/json", "x-cache": "miss" } });
}

async function syncFromDeadlockApi(env: Env): Promise<void> {
  for (const path of ALLOWED_PATHS) {
    const res = await fetch(env.DEADLOCK_API_BASE + path);
    if (!res.ok) continue;
    await env.DB.prepare(UPSERT_CACHE).bind(path, await res.text(), Math.floor(Date.now() / 1000)).run();
  }
}

async function appData(env: Env): Promise<Response> {
  const [teams, players, heroes, settings] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM teams ORDER BY rowid"),
    env.DB.prepare("SELECT * FROM players ORDER BY rowid"),
    env.DB.prepare("SELECT * FROM heroes"),
    env.DB.prepare("SELECT * FROM settings"),
  ]);
  const s = Object.fromEntries((settings.results as { key: string; value_json: string }[]).map((r) => [r.key, parse<unknown>(r.value_json, null)]));
  const bg = s.bg as Record<string, unknown> | null;
  return Response.json({
    teams: (teams.results as Record<string, string | null>[]).map((t) => {
      const tbg = parse<Record<string, unknown> | null>(t.bg_json, null);
      return { id: t.id, name: t.name, tag: t.tag, region: t.region, logo: imgUrl(t.logo_key), ...(tbg ? { bg: tbg } : {}) };
    }),
    players: (players.results as Record<string, unknown>[]).map(playerFromRow),
    heroes: Object.fromEntries((heroes.results as { name: string; image_key: string; zoom: number; x: number; y: number }[])
      .map((h) => [h.name, { name: h.name, url: imgUrl(h.image_key), zoom: h.zoom, x: h.x, y: h.y }])),
    settings: {
      tierConfig: s.tierConfig ?? undefined,
      bg: bg ? { ...bg, imageUrl: imgUrl((s.bgImageKey as string) ?? null) } : undefined,
      homeHero: imgUrl((s.homeHeroKey as string) ?? null),
    },
  });
}

async function serveImage(env: Env, key: string): Promise<Response> {
  const obj = await env.ASSETS_BUCKET.get(key);
  if (!obj) return new Response("not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  return new Response(obj.body, { headers });
}

async function upload(env: Env, request: Request, folder: string): Promise<Response> {
  const ext = IMAGE_TYPES[request.headers.get("content-type") ?? ""];
  if (!ext) return bad("tipo de imagem não suportado");
  if (!UPLOAD_FOLDERS.includes(folder)) return bad("pasta inválida");
  const body = await request.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_UPLOAD_BYTES) return bad("imagem vazia ou maior que 8 MB");
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  await env.ASSETS_BUCKET.put(key, body, { httpMetadata: { contentType: request.headers.get("content-type")! } });
  return Response.json({ url: `/img/${key}` });
}

// shortcut: replaced or deleted images stay in R2, add a sweep if the bucket grows
async function write(env: Env, request: Request, kind: string, id: string): Promise<Response> {
  const del = request.method === "DELETE";
  if (!del && request.method !== "PUT") return bad("método não suportado", 405);
  const b = del ? {} : ((await request.json().catch(() => null)) as Record<string, any> | null);
  if (!b || typeof b !== "object" || Array.isArray(b)) return bad("JSON inválido");
  const db = env.DB;
  if (del && (kind === "players" || kind === "teams")) {
    const col = kind === "players" ? "id" : "team_id";
    const owned = await db.prepare(`SELECT 1 FROM user_cards uc JOIN players p ON p.id = uc.player_id WHERE p.${col} = ? LIMIT 1`).bind(id).first();
    if (owned) return bad("há cartas resgatadas por usuários; marque como inativo em vez de apagar", 409);
  }
  if (kind === "players") {
    if (del) await db.prepare("DELETE FROM players WHERE id = ?").bind(id).run();
    else {
      if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 40 || typeof b.teamId !== "string" || !validStats(b.stats)) return bad("jogador incompleto ou atributos inválidos");
      if (b.ovr != null && (!Number.isInteger(b.ovr) || b.ovr < 1 || b.ovr > 99)) return bad("OVR inválido");
      const catalog = await readPlayers(env);
      const previous = catalog.find((p) => p.id === id);
      let profile;
      try { profile = validateProfile(b.profile ?? previous?.profile ?? {}); } catch (e) { return bad((e as Error).message); }
      if (b.variantOf && b.variantOf !== id) {
        const main = catalog.find((p) => p.id === b.variantOf);
        if (!main) return bad("carta principal não encontrada");
        try {
          if (playerIdentity(main, catalog) === id) return bad("vínculo circular entre versões");
          b.variantOf = playerIdentity(main, catalog);
        } catch (e) { return bad((e as Error).message); }
      }
      if (!Array.isArray(b.history) || b.history.length > 1000 || b.history.some((h: any) => !h || typeof h.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(h.date) || !Number.isInteger(h.ovr) || h.ovr < 1 || h.ovr > 99 || (h.stats !== undefined && !validStats(h.stats)))) return bad("histórico inválido");
      const history = b.history.map((h: any) => ({ ...h }));
      if (previous) {
        const last = [...previous.history].sort((a, z) => a.date.localeCompare(z.date)).at(-1);
        const retained = last && history.find((h: any) => h.date === last.date && h.ovr === getPlayerOvr(previous));
        if (retained && !retained.stats && last.ovr === getPlayerOvr(previous)) retained.stats = previous.stats;
      }
      const latest = history.sort((a: any, z: any) => a.date.localeCompare(z.date)).at(-1);
      if (latest) latest.stats = b.stats;
      const updatedAt = new Date().toISOString();
      profile.updatedAt = updatedAt;
      const extra = Object.fromEntries(PLAYER_EXTRA.filter((k) => b[k] !== undefined && b[k] !== null).map((k) => [k, b[k]]));
      await db.prepare(
        "INSERT INTO players (id, team_id, name, position, hero, stats_json, ovr, c1, c2, history_json, extra_json, profile_json, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) " +
        "ON CONFLICT(id) DO UPDATE SET team_id=excluded.team_id, name=excluded.name, position=excluded.position, hero=excluded.hero, stats_json=excluded.stats_json, ovr=excluded.ovr, c1=excluded.c1, c2=excluded.c2, history_json=excluded.history_json, extra_json=excluded.extra_json, profile_json=excluded.profile_json, updated_at=excluded.updated_at",
      ).bind(id, b.teamId, b.name, b.position ?? "Flex", b.hero ?? "Abrams", JSON.stringify(b.stats), Number.isFinite(b.ovr) ? Math.round(b.ovr) : null,
        b.c1 ?? "#0e7490", b.c2 ?? "#082f49", JSON.stringify(history), JSON.stringify(extra), JSON.stringify(profile), updatedAt).run();
    }
  } else if (kind === "teams") {
    if (del) await db.batch([db.prepare("DELETE FROM players WHERE team_id = ?").bind(id), db.prepare("DELETE FROM teams WHERE id = ?").bind(id)]);
    else {
      if (!b.name || !b.tag) return bad("time incompleto");
      await db.prepare(
        "INSERT INTO teams (id, name, tag, region, logo_key, bg_json) VALUES (?,?,?,?,?,?) " +
        "ON CONFLICT(id) DO UPDATE SET name=excluded.name, tag=excluded.tag, region=excluded.region, logo_key=excluded.logo_key, bg_json=excluded.bg_json",
      ).bind(id, b.name, b.tag, b.region ?? "Europa", keyOf(b.logo), b.bg ? JSON.stringify(b.bg) : null).run();
    }
  } else if (kind === "heroes") {
    if (del) await db.prepare("DELETE FROM heroes WHERE name = ?").bind(id).run();
    else {
      const key = keyOf(b.url);
      if (!key) return bad("imagem do herói obrigatória");
      await db.prepare("INSERT INTO heroes (name, image_key, zoom, x, y) VALUES (?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET image_key=excluded.image_key, zoom=excluded.zoom, x=excluded.x, y=excluded.y")
        .bind(id, key, num(b.zoom, 100), num(b.x, 50), num(b.y, 30)).run();
    }
  } else if (kind === "settings" && !del) {
    const rows: Record<string, unknown> = {};
    if (b.tierConfig !== undefined) rows.tierConfig = b.tierConfig;
    if (b.bg !== undefined) { rows.bg = b.bg ? { ...b.bg, imageUrl: "" } : null; rows.bgImageKey = keyOf(b.bg?.imageUrl); }
    if (b.homeHero !== undefined) rows.homeHeroKey = keyOf(b.homeHero);
    await db.batch(Object.entries(rows).map(([k, v]) => db.prepare("INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json").bind(k, JSON.stringify(v))));
  } else return bad("rota inválida", 404);
  return Response.json({ ok: true });
}

// shortcut: sem limite de tentativas; o mínimo de 8 caracteres torna o chute inviável, adicionar rate limit se aparecer abuso
const CODE_VALID = "uses < max_uses AND (starts_at IS NULL OR starts_at <= unixepoch()) AND (expires_at IS NULL OR expires_at > unixepoch())";
const INVALID_CODE = "código inválido, expirado ou esgotado";

async function redeem(env: Env, request: Request): Promise<Response> {
  const user = await currentUser(env, request);
  if (!user) return bad("entre para resgatar", 401, "login");
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return bad("código vazio", 400, "empty");
  const row = await env.DB.prepare(`SELECT player_id FROM redeem_codes WHERE code = ? AND ${CODE_VALID}`).bind(code).first<{ player_id: string }>();
  if (!row) return bad(INVALID_CODE, 404, "invalid");
  try {
    const [, consume] = await env.DB.batch([
      env.DB.prepare(`INSERT INTO user_cards (user_id, player_id) SELECT ?, player_id FROM redeem_codes WHERE code = ? AND ${CODE_VALID}`).bind(user.id, code),
      env.DB.prepare(`UPDATE redeem_codes SET uses = uses + 1 WHERE code = ? AND ${CODE_VALID}`).bind(code),
    ]);
    if (!consume.meta.changes) return bad(INVALID_CODE, 404, "invalid");
  } catch (e) {
    if (String(e).includes("UNIQUE")) return bad("essa carta já está na sua coleção", 409, "owned");
    throw e;
  }
  return Response.json({ playerId: row.player_id });
}

const timestamp = (v: unknown) => (v == null ? null : Number.isInteger(v) ? (v as number) : undefined);

async function codes(env: Env, request: Request, rest: string): Promise<Response> {
  if (request.method === "GET" && !rest) {
    const rows = await env.DB.prepare("SELECT code, player_id, max_uses, uses, starts_at, expires_at FROM redeem_codes ORDER BY code").all();
    return Response.json(rows.results);
  }
  if (request.method === "POST" && !rest) {
    const b = (await request.json().catch(() => ({}))) as Record<string, any>;
    const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
    const maxUses = Number.isInteger(b.maxUses) && b.maxUses >= 1 ? (b.maxUses as number) : 0;
    const startsAt = timestamp(b.startsAt);
    const expiresAt = timestamp(b.expiresAt);
    if (!/^[A-Z0-9-]{8,64}$/.test(code)) return bad("código deve ter de 8 a 64 letras, números ou hífen");
    if (!maxUses) return bad("máximo de usos inválido");
    if (typeof b.playerId !== "string" || !b.playerId) return bad("escolha o jogador");
    if (startsAt === undefined || expiresAt === undefined) return bad("data inválida");
    if (startsAt !== null && expiresAt !== null && expiresAt <= startsAt) return bad("a expiração deve ser depois do início");
    try {
      await env.DB.prepare("INSERT INTO redeem_codes (code, player_id, max_uses, starts_at, expires_at) VALUES (?,?,?,?,?)")
        .bind(code, b.playerId, maxUses, startsAt, expiresAt).run();
    } catch (e) {
      if (String(e).includes("UNIQUE")) return bad("esse código já existe", 409);
      if (String(e).includes("FOREIGN")) return bad("jogador não existe", 404);
      throw e;
    }
    return Response.json({ ok: true });
  }
  if (request.method === "DELETE" && rest) {
    await env.DB.prepare("DELETE FROM redeem_codes WHERE code = ?").bind(decodeURIComponent(rest)).run();
    return Response.json({ ok: true });
  }
  return bad("rota inválida", 404);
}

const FEEDBACK_KINDS = { bug: "Bug", idea: "Ideia" } as const;
const FEEDBACK_GAP_SECONDS = 60;

async function feedback(env: Env, request: Request): Promise<Response> {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (b?.website) return Response.json({ ok: true });
  const kind = b?.kind === "bug" || b?.kind === "idea" ? b.kind : null;
  const title = typeof b?.title === "string" ? b.title.trim() : "";
  const message = typeof b?.message === "string" ? b.message.trim() : "";
  const nick = typeof b?.nick === "string" ? b.nick.trim().slice(0, 40) : "";
  if (!kind) return bad("tipo inválido");
  if (title.length < 5 || title.length > 100) return bad("título deve ter de 5 a 100 caracteres");
  if (message.length < 10 || message.length > 3000) return bad("mensagem deve ter de 10 a 3000 caracteres");
  // shortcut: limite por IP reaproveitando api_cache, trocar por Rate Limiting binding se houver spam
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const key = `feedback:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const last = await env.DB.prepare("SELECT fetched_at FROM api_cache WHERE cache_key = ?").bind(key).first<number>("fetched_at");
  if (last && now - last < FEEDBACK_GAP_SECONDS) return bad("aguarde um minuto antes de enviar de novo", 429);
  const noPing = (t: string) => t.replace(/@/g, "@​");
  const body = `${noPing(message)}

---
Enviado pelo site por **${nick ? noPing(nick) : "anônimo"}**.`;
  const r = await fetch("https://api.github.com/repos/hagizao/deadcards/issues", {
    method: "POST",
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "deadcards-site" },
    body: JSON.stringify({ title: `[${FEEDBACK_KINDS[kind]}] ${noPing(title)}`, body }),
  });
  if (!r.ok) return bad("não foi possível enviar agora, tente mais tarde", 502);
  await env.DB.prepare(UPSERT_CACHE).bind(key, "", now).run();
  const issue = (await r.json()) as { html_url: string };
  return Response.json({ url: issue.html_url });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const image = url.pathname.match(/^\/api\/card-image\/([\w-]+)$/);
    if (image || url.pathname === "/api/lineup-image") {
      if (request.method !== "GET") return bad("método não suportado", 405);
      try { return await renderImage(request, env, image?.[1]); }
      catch (error) { console.error("Image export failed", error); return bad("Não foi possível gerar a imagem. Tente novamente.", 503); }
    }
    const shared = url.pathname.match(/^\/(carta|jogador|escalacao)\/([\w-]+)$/);
    if (shared && (request.method === "GET" || request.method === "HEAD")) return sharePage(request, env, shared[1], shared[2]);
    if (url.pathname.startsWith("/api/auth/")) return createAuth(env, request).handler(request);
    if (url.pathname === "/api/me") return Response.json(await currentUser(env, request));
    const lineup = url.pathname.match(/^\/api\/lineups(?:\/([\w-]+))?$/);
    if (lineup) {
      try { return await lineups(request, env, await currentUser(env, request), lineup[1]); }
      catch { return bad("Não foi possível acessar as escalações. Tente novamente.", 500); }
    }
    if (url.pathname === "/api/codes" || url.pathname.startsWith("/api/codes/")) {
      if (!(await currentUser(env, request))?.admin) return bad("sem permissão", 403);
      return codes(env, request, url.pathname.slice("/api/codes/".length));
    }
    if (url.pathname === "/api/feedback") return request.method === "POST" ? feedback(env, request) : bad("método não suportado", 405);
    if (url.pathname === "/api/redeem") return request.method === "POST" ? redeem(env, request) : bad("método não suportado", 405);
    if (url.pathname === "/api/collection") {
      const user = await currentUser(env, request);
      if (!user) return Response.json([]);
      const rows = await env.DB.prepare("SELECT player_id FROM user_cards WHERE user_id = ?").bind(user.id).all<{ player_id: string }>();
      return Response.json(rows.results.map((r) => r.player_id));
    }
    const admin = url.pathname.match(/^\/api\/(players|teams|heroes|settings|upload)\/([^/]+)$/);
    if (admin) {
      if (!(await currentUser(env, request))?.admin) return bad("sem permissão", 403);
      const id = decodeURIComponent(admin[2]);
      if (admin[1] === "upload") return request.method === "POST" ? upload(env, request, id) : bad("método não suportado", 405);
      if (admin[1] !== "heroes" && !ID_RE.test(id)) return bad("id inválido");
      return write(env, request, admin[1], id);
    }
    // Só o país (cf.country), para sugerir o idioma na primeira visita; nada é guardado.
    if (url.pathname === "/api/locale") return Response.json({ country: request.cf?.country ?? null }, { headers: { "cache-control": "private, no-store" } });
    if (url.pathname === "/api/health") return Response.json({ ok: true });
    if (url.pathname === "/api/data") return appData(env);
    if (url.pathname === "/api/deadlock") {
      const path = url.searchParams.get("path") ?? "";
      if (!ALLOWED_PATHS.includes(path)) return Response.json({ error: "path not allowed" }, { status: 400 });
      return cachedFetch(env, path);
    }
    if (url.pathname.startsWith("/img/")) {
      const key = decodeURIComponent(url.pathname.slice(5));
      if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) return new Response("bad key", { status: 400 });
      return serveImage(env, key);
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncFromDeadlockApi(env));
  },
} satisfies ExportedHandler<Env>;
