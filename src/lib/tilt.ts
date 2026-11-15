import { useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

export function usePointerTilt(maxY = 32, maxX = 28) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 22 });
  const sy = useSpring(my, { stiffness: 220, damping: 22 });
  const rotateY = useTransform(sx, (v) => v * maxY);
  const rotateX = useTransform(sy, (v) => v * -maxX);
  return {
    rotateX,
    rotateY,
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (reduced || e.pointerType !== "mouse") return;
      const box = e.currentTarget.getBoundingClientRect();
      mx.set((e.clientX - box.left) / box.width - 0.5);
      my.set((e.clientY - box.top) / box.height - 0.5);
    },
    onPointerLeave: () => { mx.set(0); my.set(0); },
  };
}
