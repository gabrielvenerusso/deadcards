import { AnimatePresence, motion } from "motion/react";
import { createAuthClient } from "better-auth/client";
import { useEffect, useRef, useState } from "react";
import { useData } from "../lib/data";

const auth = createAuthClient();

export function loginReturn() {
  const next = new URLSearchParams(location.search).get("next");
  return next && /^\/(montar-time|escalacao\/[\w-]+)$/.test(next) ? next : "/";
}
export const signInWithTwitch = () => auth.signIn.social({ provider: "twitch", callbackURL: loginReturn() });
export const signInWithGoogle = () => auth.signIn.social({ provider: "google", callbackURL: loginReturn() });

export function TwitchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}

export function Account() {
  const { me } = useData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", close); };
  }, [open]);

  if (!me) {
    return (
      <motion.a
        href="/login"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950 bg-zinc-100 hover:bg-white shadow-[0_0_18px_rgba(244,244,245,0.35)] cursor-pointer"
        aria-label="Entrar"
      >
        <span>Entrar</span>
      </motion.a>
    );
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.95 }}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 p-1 sm:pr-3 rounded-full border border-zinc-200/25 bg-zinc-900/70 hover:border-zinc-200/60 shadow-[0_0_14px_rgba(244,244,245,0.15)] cursor-pointer"
      >
        {me.image ? <img src={me.image} alt="" className="w-8 h-8 rounded-full" /> : <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white">{me.name.charAt(0).toUpperCase()}</span>}
        <span className="hidden sm:inline text-sm font-bold text-zinc-100 max-w-32 truncate">{me.name}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-52 origin-top-right noir-glass-strong rounded-2xl p-2 z-50"
          >
            <div className="flex items-center gap-2 px-2 py-2 border-b border-zinc-200/10 mb-1">
              <span className="text-sm font-bold text-zinc-100 truncate">{me.name}</span>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => auth.signOut().then(() => location.assign("/"))}
              className="w-full text-left px-2 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/70 cursor-pointer"
            >
              Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
