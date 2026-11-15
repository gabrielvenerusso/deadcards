import { canEditLineup, lineupPlayers } from "../lib/lineups";
import type { Env } from "../worker";
import { readPlayers } from "./catalog";

type Row = { id: string; user_id: string; name: string; player_ids_json: string; updated_at: string };
const publicLineup = (r: Row, userId?: string) => ({ id: r.id, name: r.name, playerIds: JSON.parse(r.player_ids_json), updatedAt: r.updated_at, owned: canEditLineup(userId, r.user_id) });
const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function lineups(request: Request, env: Env, user: { id: string } | null, id?: string): Promise<Response> {
  if (id && !/^[\w-]{1,64}$/.test(id)) return bad("ID inválido.");
  if (request.method === "GET") {
    if (id) {
      const row = await env.DB.prepare("SELECT * FROM lineups WHERE id = ?").bind(id).first<Row>();
      return row ? Response.json(publicLineup(row, user?.id), { headers: { "cache-control": "private, no-store" } }) : bad("Escalação não encontrada.", 404);
    }
    if (!user) return bad("Entre para consultar suas escalações.", 401);
    const rows = await env.DB.prepare("SELECT * FROM lineups WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all<Row>();
    return Response.json(rows.results.map((r) => publicLineup(r, user.id)), { headers: { "cache-control": "private, no-store" } });
  }
  // Escalações pessoais são a exceção ao catálogo administrativo: só o dono pode escrever.
  if (!user) return bad("Entre para salvar uma escalação.", 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return bad("Origem inválida.", 403);
  if (!["POST", "PUT", "DELETE"].includes(request.method)) return bad("Método não suportado.", 405);
  if (request.method === "POST" ? !!id : !id) return bad("Rota inválida.", 405);
  if (id) {
    const row = await env.DB.prepare("SELECT user_id FROM lineups WHERE id = ?").bind(id).first<{ user_id: string }>();
    if (!row || !canEditLineup(user.id, row.user_id)) return bad("Escalação não encontrada na sua conta.", 404);
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM lineups WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    return Response.json({ ok: true });
  }
  const raw = await request.text();
  if (raw.length > 4096) return bad("Escalação muito grande.", 413);
  let body: { name?: unknown; playerIds?: unknown };
  try { body = JSON.parse(raw); } catch { return bad("JSON inválido."); }
  if (!body || typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 60) return bad("Dê ao time um nome de até 60 caracteres.");
  if (!Array.isArray(body.playerIds) || body.playerIds.length !== 6 || body.playerIds.some((v) => typeof v !== "string" || !/^[\w-]{1,64}$/.test(v))) return bad("Escolha seis cartas válidas.");
  const playerIds = body.playerIds as string[];
  try { lineupPlayers(playerIds, await readPlayers(env)); } catch (e) { return bad((e as Error).message); }
  const now = new Date().toISOString();
  const lineupId = id ?? crypto.randomUUID();
  if (id) {
    await env.DB.prepare("UPDATE lineups SET name = ?, player_ids_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(body.name.trim(), JSON.stringify(playerIds), now, id, user.id).run();
  } else {
    await env.DB.prepare("INSERT INTO lineups (id, user_id, name, player_ids_json, updated_at) VALUES (?,?,?,?,?)")
      .bind(lineupId, user.id, body.name.trim(), JSON.stringify(playerIds), now).run();
  }
  return Response.json({ id: lineupId, name: body.name.trim(), playerIds, updatedAt: now, owned: true }, { status: id ? 200 : 201 });
}
