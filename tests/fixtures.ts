import type { Player } from "../src/lib/types";

export const players: Player[] = ["Atlas", "Vega", "Orion", "Luna", "Nova", "Echo"].map((name, i) => ({
  id: `test-p${i}`, name, teamId: "test-team", position: i % 2 ? "Support" : "Carry", hero: "Abrams",
  stats: { MIR: 70 + i * 4, MAC: 74 + i * 3, SUP: 76 + i * 2, MOV: 80 + i * 2, POL: 75 + i * 3, CON: 79 + i * 2 },
  c1: "#0e7490", c2: "#082f49", history: [{ date: "2026-10-01", ovr: 72 + i, stats: { MIR: 70, MAC: 72, SUP: 74, MOV: 76, POL: 70, CON: 70 } }, { date: "2026-11-15", ovr: 76 + i * 3 }],
  profile: { bio: "Jogador de demonstração para validação local.", socials: { twitch: "https://www.twitch.tv/directory/category/deadlock-1" } }, updatedAt: "2026-11-15T12:00:00.000Z",
}));
players.push({ ...players[0], id: "test-special", variantOf: "test-p0", special: true, specialText: "Edição especial", frame: { style: "deco" }, ovr: 95, inactive: true });
