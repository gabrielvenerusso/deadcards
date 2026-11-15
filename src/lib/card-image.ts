import { getPlayerOvr, getPlayerTrend } from "./cards";
import { getCardTier, ornamentSVG, particleSpecs, rarityStyleVars, ringSVG } from "./rarity";
import type { HeroArt, Player, Team, TierBand } from "./types";

export const escapeXml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const color = (value: string, fallback: string) => /^#[a-f\d]{6}$/i.test(value) ? value : fallback;

export function cardSvg(player: Player, team: Team, tiers: TierBand[], art: HeroArt | null, image: string | null, logo: string | null, prefix = "card") {
  const tier = getCardTier(player, tiers);
  const vars = rarityStyleVars(tier);
  const pts = vars["--rk-clip"].slice(8, -1).split(",").map((s) => s.trim().split(" ").map((v, i) => parseFloat(v) * (i ? 4.3 : 2.95)).join(",")).join(" ");
  const pad = parseFloat(vars["--rk-pad"]);
  const safePrefix = prefix.replace(/[^\w-]/g, "");
  const id = (s: string) => `${safePrefix}-${s}`;
  const zoom = Math.max(.5, Math.min(3, (art?.zoom ?? 100) / 100));
  const ax = Math.min(100, Math.max(0, art?.x ?? 50)) / 100;
  const ay = Math.min(100, Math.max(0, art?.y ?? 50)) / 100;
  const stats = ["MIR", "MOV", "MAC", "POL", "SUP", "CON"] as const;
  const delta = getPlayerTrend(player);
  const ornaments = tier.custom ? ornamentSVG(tier).replace(/id="([^"]+)"/g, `id="${safePrefix}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${safePrefix}-$1)`) : `<svg width="295" height="430" viewBox="0 0 100 100" preserveAspectRatio="none">${ringSVG(tier)}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="295" height="430" viewBox="0 0 295 430" font-family="Barlow" font-weight="700">
    <defs><clipPath id="${id("clip")}"><polygon points="${pts}"/></clipPath>
    <linearGradient id="${id("metal")}" x2="1" y2="1"><stop stop-color="${tier.hi}"/><stop offset=".28" stop-color="${tier.c}"/><stop offset=".52" stop-color="${tier.lo}"/><stop offset=".76" stop-color="${tier.c}"/><stop offset="1" stop-color="${tier.hi}"/></linearGradient>
    <linearGradient id="${id("shade")}" x2="0" y2="1"><stop offset=".25" stop-color="#09090b" stop-opacity="0"/><stop offset=".65" stop-color="${color(player.c2, "#082f49")}" stop-opacity=".45"/><stop offset="1" stop-color="#09090b" stop-opacity=".98"/></linearGradient>
    <filter id="${id("shadow")}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".9"/></filter></defs>
    <polygon points="${pts}" fill="url(#${id("metal")})"/>
    <g transform="translate(${pad} ${pad}) scale(${(295 - pad * 2) / 295} ${(430 - pad * 2) / 430})" clip-path="url(#${id("clip")})">
      <rect width="295" height="430" fill="#18181b"/>
      ${image ? `<image xlink:href="${image}" x="${(1 - zoom) * 295 * ax}" y="${(1 - zoom) * 430 * ay}" width="${295 * zoom}" height="${430 * zoom}" preserveAspectRatio="x${ax < .34 ? "Min" : ax > .66 ? "Max" : "Mid"}Y${ay < .34 ? "Min" : ay > .66 ? "Max" : "Mid"} slice"/>` : ""}
      <rect width="295" height="430" fill="url(#${id("shade")})"/>
      ${ornaments}
      ${particleSpecs(tier).slice(0, 14).map((p, i) => `<circle cx="${p.x * 2.95}" cy="${p.type === "rise" ? (i * 31 + 80) % 280 : p.y * 4.3}" r="${Math.max(1, p.s / 6)}" fill="${p.color}" opacity=".65"/>`).join("")}
      <g fill="#fff" filter="url(#${id("shadow")})"><text x="20" y="${tier.topPad ? 70 : 65}" font-size="49">${getPlayerOvr(player)}</text>
      ${delta ? `<text x="86" y="58" font-size="12" fill="${delta > 0 ? "#6ee7b7" : "#fca5a5"}">${delta > 0 ? "+" : ""}${delta}</text>` : ""}
      <rect x="20" y="74" width="${Math.min(110, player.position.length * 7 + 14)}" height="19" rx="3" fill="#09090b" fill-opacity=".8"/><text x="27" y="87" font-size="10" letter-spacing="1">${escapeXml(player.position.toUpperCase())}</text>
      ${logo ? `<image xlink:href="${logo}" x="20" y="100" width="40" height="40" preserveAspectRatio="xMidYMid meet"/>` : `<text x="21" y="112" font-size="12">${escapeXml(team.tag)}</text>`}
      <text x="147.5" y="282" text-anchor="middle" font-size="${Math.min(22, 360 / Math.max(1, player.name.length))}" letter-spacing="1">${escapeXml(player.name.toUpperCase())}</text>
      <line x1="30" y1="291" x2="265" y2="291" stroke="#e4e4e7" stroke-opacity=".45"/>
      ${stats.map((k, i) => { const x = i % 2 ? 168 : 38, y = 317 + Math.floor(i / 2) * 23; return `<text x="${x}" y="${y}" font-size="14" fill="#e4e4e7">${k}</text><text x="${x + 73}" y="${y}" text-anchor="end" font-size="19">${player.stats[k]}</text>`; }).join("")}
      <text x="147.5" y="389" text-anchor="middle" font-size="${Math.min(12, player.footerSize ?? 12)}" letter-spacing="1.7" fill="${color(player.footerColor ?? "", "#f4f4f5")}">${escapeXml((player.footer ?? "Deadlock Cards").slice(0, 30).toUpperCase())}</text></g>
    </g></svg>`;
}
