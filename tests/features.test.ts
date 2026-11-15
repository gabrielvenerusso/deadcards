import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { calculateOVR, DEFAULT_TIER_CONFIG, getPlayerHistory, getPlayerOvr, getPlayerTrend, teamOvr } from "../src/lib/cards";
import { canEditLineup, lineupPlayers, lineupSummary, playerIdentity } from "../src/lib/lineups";
import { validateProfile } from "../src/lib/profiles";
import { cardSvg, escapeXml } from "../src/lib/card-image";
import { lineups } from "../src/server/lineups";
import { players } from "./fixtures";
import type { Env } from "../src/worker";

test("OVR personalizado reaproveita o cálculo das cartas sem alterar o ranking oficial", () => {
  const roster = players.slice(0, 6);
  assert.equal(getPlayerOvr(players[6]), 95);
  assert.equal(getPlayerOvr(players[0]), calculateOVR(players[0].stats));
  const before = teamOvr(players, "test-team");
  assert.equal(lineupSummary(roster).ovr, Math.round(roster.reduce((sum, p) => sum + getPlayerOvr(p), 0) / 6));
  assert.equal(lineupSummary(roster).stats.MIR, 80);
  assert.deepEqual(teamOvr(players, "test-team"), before);
  assert.equal(lineupSummary([]).ovr, 0);
});
test("seleção exige seis jogadores distintos, inclusive versões encadeadas", () => {
  const ids = players.slice(0, 6).map((p) => p.id);
  assert.equal(lineupPlayers(ids, players).length, 6);
  assert.throws(() => lineupPlayers(ids.slice(1), players), /seis/);
  assert.throws(() => lineupPlayers(["missing", ...ids.slice(1)], players), /disponível/);
  assert.throws(() => lineupPlayers([ids[0], players[6].id, ...ids.slice(2)], players), /duas posições/);
  assert.equal(playerIdentity({ ...players[6], id: "chain", variantOf: players[6].id }, players), players[0].id);
  assert.throws(() => playerIdentity({ ...players[0], variantOf: "loop" }, [{ ...players[0], variantOf: "loop" }, { ...players[0], id: "loop", variantOf: players[0].id }]), /circular/);
});
test("histórico preserva valores e snapshots sem fabricar atributos antigos", () => {
  const p = { ...players[0], ovr: 99 };
  const before = JSON.stringify(p.history);
  assert.equal(getPlayerHistory(p).at(-1)!.ovr, 99);
  assert.equal(getPlayerTrend(p), 27);
  assert.deepEqual(getPlayerHistory(p)[0].stats, p.history[0].stats);
  assert.equal(JSON.stringify(p.history), before);
});
test("perfil rejeita scripts, credenciais em URLs e SteamID inválido", () => {
  assert.deepEqual(validateProfile({}), { bio: undefined, steamId: undefined, socials: {} });
  assert.throws(() => validateProfile({ socials: { website: "javascript:alert(1)" } }), /HTTPS/);
  assert.throws(() => validateProfile({ socials: { twitch: "https://user:pass@example.com" } }), /credenciais/);
  assert.throws(() => validateProfile({ steamId: "123" }), /17/);
  assert.throws(() => validateProfile({ bio: "a".repeat(501) }), /500/);
  assert.equal(validateProfile({ steamId: "76561198000000000" }).steamId, "76561198000000000");
});
test("SVG reutiliza raridade e escapa conteúdo editável", () => {
  const svg = cardSvg({ ...players[6], name: '<script>alert("x")</script>' }, { id: "t", name: "Time", tag: "T", region: "Brasil" }, DEFAULT_TIER_CONFIG, null, null, null);
  assert.ok(svg.includes("&lt;SCRIPT&gt;"));
  assert.ok(svg.includes("95</text>"));
  assert.ok(!svg.includes("<script>"));
  assert.equal(escapeXml('"<>&'), "&quot;&lt;&gt;&amp;");
});

function database() {
  const db = new DatabaseSync(":memory:");
  for (const migration of ["0001_init.sql", "0002_cards_schema.sql", "0005_auth_tables.sql", "0006_profiles_lineups.sql"]) db.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), "utf8"));
  for (const id of ["owner", "other"]) db.prepare('INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,0,0)').run(id, id, `${id}@example.test`);
  for (const p of players) db.prepare("INSERT INTO players(id,team_id,name,position,hero,stats_json,ovr,c1,c2,history_json,extra_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(p.id,p.teamId,p.name,p.position,p.hero,JSON.stringify(p.stats),p.ovr ?? null,p.c1,p.c2,JSON.stringify(p.history),JSON.stringify({variantOf:p.variantOf}));
  const prepare = (sql: string) => {
    let values: unknown[] = [];
    const statement = {
      bind(...args: unknown[]) { values = args; return statement; },
      async first() { return db.prepare(sql).get(...values as []) ?? null; },
      async all() { return { results: db.prepare(sql).all(...values as []) }; },
      async run() { return { meta: db.prepare(sql).run(...values as []) }; },
    };
    return statement;
  };
  return { db, env: { DB: { prepare } } as unknown as Env };
}
test("API de escalações: convidado, CSRF, dono, outro usuário e exclusão", async () => {
  const { db, env } = database();
  try {
    const body = { name: "Meu time", playerIds: players.slice(0, 6).map((p) => p.id) };
    const req = (method: string, data: unknown = body, origin = "https://cards.test") => new Request("https://cards.test/api/lineups", { method, headers: { origin, "content-type": "application/json" }, ...(method !== "GET" ? { body: JSON.stringify(data) } : {}) });
    assert.equal((await lineups(req("POST"), env, null)).status, 401);
    assert.equal((await lineups(req("POST", body, "https://evil.test"), env, { id: "owner" })).status, 403);
    assert.equal((await lineups(req("POST", { ...body, playerIds: [players[0].id, players[6].id, ...body.playerIds.slice(2)] }), env, { id: "owner" })).status, 400);
    const created = await lineups(req("POST"), env, { id: "owner" });
    assert.equal(created.status, 201);
    const result = await created.json() as { id: string };
    assert.equal((await lineups(req("GET"), env, null, result.id)).status, 200);
    const publicView = await (await lineups(req("GET"), env, null, result.id)).json() as Record<string, unknown>;
    assert.equal(publicView.owned, false); assert.ok(!("user_id" in publicView));
    assert.equal((await lineups(req("PUT"), env, { id: "other" }, result.id)).status, 404);
    assert.equal((await lineups(req("DELETE"), env, { id: "other" }, result.id)).status, 404);
    assert.equal((await lineups(req("PUT", { ...body, name: "Editado" }), env, { id: "owner" }, result.id)).status, 200);
    assert.equal((await lineups(req("DELETE"), env, { id: "owner" }, result.id)).status, 200);
    assert.equal((await lineups(req("GET"), env, null, result.id)).status, 404);
    assert.equal(canEditLineup(undefined, "owner"), false);
    assert.equal(canEditLineup("other", "owner"), false);
  } finally { db.close(); }
});
