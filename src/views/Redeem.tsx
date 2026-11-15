import { useEffect, useState, type FormEvent } from "react";
import { call, useData } from "../lib/data";
import { Card } from "../components/Card";
import { SignInOptions } from "./Login";
import { strings, useT } from "../lib/i18n";

const S = strings({
  pt: {
    title: "Resgatar",
    owned: (n: number) => `${n} carta(s) na sua coleção`,
    signIn: "Entre para resgatar cartas com um código.",
    placeholder: "Código",
    label: "Código de resgate",
    redeeming: "Resgatando…",
    redeem: "Resgatar",
    done: (name: string) => `Carta resgatada: ${name}`,
    errors: {
      login: "entre para resgatar",
      empty: "código vazio",
      invalid: "código inválido, expirado ou esgotado",
      owned: "essa carta já está na sua coleção",
    } as Record<string, string>,
  },
  en: {
    title: "Redeem",
    owned: (n: number) => `${n} card(s) in your collection`,
    signIn: "Sign in to redeem cards with a code.",
    placeholder: "Code",
    label: "Redeem code",
    redeeming: "Redeeming…",
    redeem: "Redeem",
    done: (name: string) => `Card redeemed: ${name}`,
    errors: {
      login: "Sign in to redeem.",
      empty: "Empty code.",
      invalid: "Invalid, expired or used-up code.",
      owned: "That card is already in your collection.",
    },
  },
  es: {
    title: "Canjear",
    owned: (n: number) => `${n} carta(s) en tu colección`,
    signIn: "Inicia sesión para canjear cartas con un código.",
    placeholder: "Código",
    label: "Código de canje",
    redeeming: "Canjeando…",
    redeem: "Canjear",
    done: (name: string) => `Carta canjeada: ${name}`,
    errors: {
      login: "Inicia sesión para canjear.",
      empty: "Código vacío.",
      invalid: "Código inválido, vencido o agotado.",
      owned: "Esa carta ya está en tu colección.",
    },
  },
});

export function Redeem({ onOpenCard }: { onOpenCard: (id: string) => void }) {
  const t = useT(S);
  const { me, players } = useData();
  const [owned, setOwned] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!me) return;
    fetch("/api/collection").then((r) => (r.ok ? (r.json() as Promise<string[]>) : [])).then(setOwned).catch(() => setOwned([]));
  }, [me]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const body = await call("/api/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const id = body.playerId!;
      setOwned((o) => [...o, id]);
      setCode("");
      setMsg({ ok: true, text: t.done(players.find((p) => p.id === id)?.name ?? id) });
    } catch (err) {
      const e = err as Error & { code?: string };
      setMsg({ ok: false, text: (e.code && t.errors[e.code]) || e.message });
    } finally {
      setBusy(false);
    }
  };

  const cards = players.filter((p) => owned.includes(p.id));
  const field = "px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-200/15 text-sm text-zinc-100 uppercase tracking-[0.2em] placeholder:text-zinc-500 placeholder:normal-case placeholder:tracking-normal";

  return (
    <section className="space-y-5">
      <div className="noir-glass rounded-2xl p-5 sm:p-7 space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-[0.11em] text-zinc-100">{t.title}</h1>
          <p className="text-xs text-zinc-400 mt-1.5">{me ? t.owned(cards.length) : t.signIn}</p>
        </div>
        {!me ? (
          <div className="max-w-sm"><SignInOptions /></div>
        ) : (
          <form onSubmit={submit} className="flex flex-wrap gap-2 items-center">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.placeholder}
              aria-label={t.label}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              className={`${field} w-56`}
            />
            <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50">
              {busy ? t.redeeming : t.redeem}
            </button>
            {msg && <p role="status" className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
          </form>
        )}
      </div>

      {me && (
        <div className="flex flex-wrap justify-center sm:justify-start gap-6">
          {cards.map((p) => (
            <Card key={p.id} player={p} variant="medium" onOpen={() => onOpenCard(p.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
