import { useRef, useState, type ReactNode } from "react";

import { strings, useT } from "../lib/i18n";

const HOLD_MS = 1500;

const S = strings({
  pt: { hold: "Segure para confirmar" },
  en: { hold: "Hold to confirm" },
  es: { hold: "Mantén presionado para confirmar" },
});

export function HoldButton({ onConfirm, disabled, className = "", label, children }: { onConfirm: () => void; disabled?: boolean; className?: string; label: string; children: ReactNode }) {
  const t = useT(S);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number>(undefined);
  const start = () => {
    if (disabled || timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => { timer.current = undefined; setHolding(false); onConfirm(); }, HOLD_MS);
  };
  const cancel = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${label} (${t.hold.toLowerCase()})`}
      title={t.hold}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={cancel}
      onBlur={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative touch-none overflow-hidden select-none ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-red-400/70"
        style={{
          clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: holding ? `clip-path ${HOLD_MS}ms linear` : "clip-path 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
