import { STAT_KEYS } from "./cards";
import type { PlayerProfile, Stats } from "./types";

export function validStats(value: unknown): value is Stats {
  return !!value && typeof value === "object" && STAT_KEYS.every((k) => {
    const v = (value as Record<string, unknown>)[k];
    return Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 99;
  });
}

export function validateProfile(value: unknown): PlayerProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Perfil inválido.");
  const p = value as Record<string, unknown>;
  if (p.bio !== undefined && (typeof p.bio !== "string" || p.bio.length > 500)) throw new Error("A biografia deve ter até 500 caracteres.");
  if (p.steamId !== undefined && (typeof p.steamId !== "string" || (p.steamId !== "" && !/^\d{17}$/.test(p.steamId)))) throw new Error("SteamID deve conter 17 dígitos.");
  const socials: NonNullable<PlayerProfile["socials"]> = {};
  if (p.socials !== undefined) {
    if (!p.socials || typeof p.socials !== "object" || Array.isArray(p.socials)) throw new Error("Redes sociais inválidas.");
    for (const key of ["twitch", "steam", "discord", "website"] as const) {
      const link = (p.socials as Record<string, unknown>)[key];
      if (link === undefined || link === "") continue;
      if (typeof link !== "string" || link.length > 300) throw new Error("Link de rede social inválido.");
      let url: URL;
      try { url = new URL(link); } catch { throw new Error("Use uma URL completa nas redes sociais."); }
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("As redes sociais devem usar links HTTPS sem credenciais.");
      socials[key] = url.href;
    }
  }
  return { bio: (p.bio as string | undefined)?.trim(), steamId: p.steamId as string | undefined, socials };
}
