import type { Player } from "../lib/types";
import type { Env } from "../worker";

export function playerFromRow(p: Record<string, unknown>): Player {
  return {
    ...JSON.parse(String(p.extra_json || "{}")),
    id: p.id, teamId: p.team_id, name: p.name, position: p.position, hero: p.hero,
    stats: JSON.parse(String(p.stats_json)), ...(p.ovr !== null ? { ovr: p.ovr } : {}),
    c1: p.c1, c2: p.c2, history: JSON.parse(String(p.history_json || "[]")),
    profile: JSON.parse(String(p.profile_json || "{}")), updatedAt: p.updated_at || undefined,
  } as Player;
}

export async function readPlayers(env: Env): Promise<Player[]> {
  const { results } = await env.DB.prepare("SELECT * FROM players ORDER BY rowid").all();
  return results.map(playerFromRow);
}
