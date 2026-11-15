import { getPlayerOvr, STAT_KEYS } from "./cards";
import type { Player, Stats } from "./types";

export function playerIdentity(player: Player, players: Player[]): string {
  const seen = new Set<string>();
  let current = player;
  while (current.variantOf && current.variantOf !== current.id) {
    if (seen.has(current.id)) throw new Error("Vínculo circular entre versões de carta.");
    seen.add(current.id);
    const parent = players.find((p) => p.id === current.variantOf);
    if (!parent) return current.variantOf;
    current = parent;
  }
  return current.id;
}

export function lineupPlayers(ids: string[], players: Player[]): Player[] {
  if (ids.length !== 6) throw new Error("Escolha seis jogadores para salvar o time.");
  const roster = ids.map((id) => {
    const player = players.find((p) => p.id === id);
    if (!player) throw new Error("Uma carta não está mais disponível. Escolha outro jogador.");
    return player;
  });
  if (new Set(roster.map((p) => playerIdentity(p, players))).size !== 6) {
    throw new Error("Um jogador não pode ocupar duas posições, mesmo com versões diferentes.");
  }
  return roster;
}

export function lineupSummary(players: Player[]) {
  const count = players.length;
  return {
    count,
    ovr: count ? Math.round(players.reduce((sum, p) => sum + getPlayerOvr(p), 0) / count) : 0,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, count ? Math.round(players.reduce((sum, p) => sum + p.stats[k], 0) / count) : 0])) as Stats,
  };
}

export function canEditLineup(userId: string | undefined, ownerId: string): boolean {
  return !!userId && userId === ownerId;
}
