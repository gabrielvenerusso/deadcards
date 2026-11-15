import { motion } from "motion/react";
import { useEffect } from "react";
import { useData } from "../lib/data";
import { strings, useT } from "../lib/i18n";
import { TwitchIcon, signInWithGoogle, signInWithTwitch, loginReturn } from "../components/Account";

const S = strings({
  pt: { twitch: "Entrar com Twitch", google: "Entrar com Google" },
  en: { twitch: "Sign in with Twitch", google: "Sign in with Google" },
  es: { twitch: "Ingresar con Twitch", google: "Ingresar con Google" },
});

export function SignInOptions() {
  const t = useT(S);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signInWithTwitch}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-wider text-sm text-white bg-[#9146ff] hover:bg-[#a970ff] shadow-[0_0_24px_rgba(145,70,255,0.45)] transition cursor-pointer"
      >
        <TwitchIcon /> {t.twitch}
      </button>
      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-wider text-sm text-zinc-900 bg-white hover:bg-zinc-200 shadow-[0_0_24px_rgba(255,255,255,0.2)] transition cursor-pointer"
      >
        <span className="font-black text-base leading-none" aria-hidden="true">G</span> {t.google}
      </button>
    </div>
  );
}

export function Login() {
  const { me } = useData();
  useEffect(() => { if (me) location.replace(loginReturn()); }, [me]);
  if (me) return null;
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <motion.div
        className="noir-glass-strong rounded-3xl p-8 w-full max-w-sm text-center space-y-6"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
      >
        <h1 className="text-xl font-extrabold uppercase tracking-[0.18em] text-zinc-100">Deadlock Cards</h1>
        <SignInOptions />
      </motion.div>
    </div>
  );
}
