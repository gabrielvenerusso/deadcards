import { Icon } from "./Icon";

export function TrendBadge({ delta, size = "card" }: { delta: number; size?: "card" | "editor" }) {
  if (!delta) return null;
  const up = delta > 0;
  const colors = up
    ? "bg-emerald-950/90 text-emerald-300 border-emerald-400/55 shadow-[0_0_12px_rgba(52,211,153,0.35)]"
    : "bg-red-950/90 text-red-300 border-red-400/55 shadow-[0_0_12px_rgba(248,113,113,0.35)]";
  const sizing = size === "editor" ? "px-2 py-1 text-xs font-extrabold rounded-lg" : "px-1.5 py-0.5 text-[11px] font-extrabold rounded-md";
  return (
    <span className={`inline-flex items-center gap-0.5 border ${colors} ${sizing} leading-none tabular-nums select-none`}>
      <Icon name={up ? "arrow-up" : "arrow-down"} className="size-3" />{up ? `+${delta}` : delta}
    </span>
  );
}
