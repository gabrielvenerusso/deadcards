import { useLayoutEffect, useRef, useState } from "react";
import type { Player } from "../lib/types";
import { Card } from "./Card";

export function CardPreview({ player, onOpen }: { player: Player; onOpen?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(295);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(295, entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="w-full max-w-[295px] mx-auto" style={{ height: width * 430 / 295 }}>
    <div style={{ width: 295, transform: `scale(${width / 295})`, transformOrigin: "top left" }}><Card player={player} onOpen={onOpen} /></div>
  </div>;
}
