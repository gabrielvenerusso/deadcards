import type { Team } from "../lib/types";

export function TeamLogo({ team }: { team: Team }) {
  if (team.logo) {
    return <img src={team.logo} alt={team.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  }
  const tag = team.tag || "—";
  const cls = tag.length >= 5 ? "team-logo-text team-logo-text--5" : tag.length === 4 ? "team-logo-text team-logo-text--4" : "team-logo-text";
  return <span className={cls}>{tag}</span>;
}
