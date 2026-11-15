import { type MotionValue, motion } from "motion/react";
import type { Team } from "../lib/types";
import { TeamLogo } from "./TeamLogo";

export function TeamLogo3D({ team, className, radius, tilt }: {
  team: Team;
  className: string;
  radius: number;
  tilt?: { rotateX: MotionValue<number>; rotateY: MotionValue<number> };
}) {
  return (
    <motion.div
      style={tilt && { rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformPerspective: 500 }}
      variants={{ hover: { scale: 1.12 } }}
      className="relative z-10 shrink-0 logo-3d"
    >
      {/* com imagem a logo aparece sem a moldura escura; só a sigla de quem não tem logo mantém a moldura */}
      <div className={`${team.logo ? "overflow-hidden" : "team-logo-frame"} ${className}`} style={{ borderRadius: radius }} title={team.name}>
        <TeamLogo team={team} />
      </div>
    </motion.div>
  );
}
