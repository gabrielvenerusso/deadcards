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
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#9146ff] py-3 text-sm font-bold tracking-wider text-white uppercase shadow-[0_0_24px_rgba(145,70,255,0.45)] transition-colors hover:bg-[#a970ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100"
      >
        <TwitchIcon /> {t.twitch}
      </button>
      <button
        type="button"
        onClick={signInWithGoogle}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold tracking-wider text-zinc-900 uppercase shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100"
      >
        <span className="text-base leading-none font-black" aria-hidden="true">G</span> {t.google}
      </button>
    </div>
  );
}

export function Login() {
  const { me } = useData();
  useEffect(() => { if (me) location.replace(loginReturn()); }, [me]);
  if (me) return null;
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <motion.div
        className="noir-glass-strong w-full max-w-sm space-y-6 rounded-3xl p-8 text-center"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
      >
        <h1 className="font-display text-xl font-extrabold tracking-[0.18em] text-zinc-100 uppercase">Deadlock Cards</h1>
        <SignInOptions />
      </motion.div>
    </div>
  );
}
