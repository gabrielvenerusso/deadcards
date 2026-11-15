import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export const LANGS = ["pt", "en", "es"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_LABEL: Record<Lang, string> = { pt: "Português", en: "English", es: "Español" };
const HTML_LANG: Record<Lang, string> = { pt: "pt-BR", en: "en", es: "es" };

const COOKIE = "lang";
const PT_COUNTRIES = ["BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL"];
const ES_COUNTRIES = ["ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ"];

const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);
const readCookie = () => document.cookie.match(/(?:^|; )lang=([^;]+)/)?.[1];
const writeCookie = (lang: Lang) => { document.cookie = `${COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`; };
const fromCountry = (c?: string): Lang | null => (!c ? null : PT_COUNTRIES.includes(c) ? "pt" : ES_COUNTRIES.includes(c) ? "es" : null);
const fromBrowser = (): Lang => {
  const l = navigator.language.slice(0, 2).toLowerCase();
  return isLang(l) ? l : "en";
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: "pt", setLang: () => {} });

// Ordem: escolha salva no cookie > país do IP (Cloudflare) > idioma do navegador > inglês.
export function LangProvider({ children }: { children: ReactNode }) {
  const saved = readCookie();
  const picked = useRef(false);
  const [lang, setLangState] = useState<Lang>(isLang(saved) ? saved : fromBrowser);

  useEffect(() => {
    if (isLang(saved)) return;
    fetch("/api/locale")
      .then((r) => (r.ok ? (r.json() as Promise<{ country?: string }>) : {}))
      .then(({ country }: { country?: string }) => {
        if (picked.current) return;
        const l = fromCountry(country) ?? fromBrowser();
        writeCookie(l);
        setLangState(l);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.documentElement.lang = HTML_LANG[lang]; }, [lang]);

  const setLang = (l: Lang) => { picked.current = true; writeCookie(l); setLangState(l); };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Textos ficam junto do componente: `const S = strings({ pt: {...}, en: {...}, es: {...} })`; no componente, `const t = useT(S)`. */
export const strings = <T,>(d: { pt: T } & Record<Exclude<Lang, "pt">, NoInfer<T>>): Record<Lang, T> => d;
export const useT = <T,>(d: Record<Lang, T>): T => d[useLang().lang];

/** Locale BCP 47 para Intl / toLocaleString. */
export const useLocale = () => HTML_LANG[useLang().lang];

// Os valores de REGIONS e position são chaves salvas no banco; só o rótulo exibido muda por idioma.
const LABELS = strings<Record<string, string>>({
  pt: {},
  en: { Europa: "Europe", "América do Norte": "North America", Brasil: "Brazil", "América do Sul": "South America", Ásia: "Asia", "Sem Time": "No Team", Suporte: "Support" },
  es: { "América do Norte": "América del Norte", Brasil: "Brasil", "América do Sul": "América del Sur", Ásia: "Asia", "Sem Time": "Sin equipo", Suporte: "Soporte" },
});

/** Rótulo traduzido de uma região (ou posição) salva; valor desconhecido volta como veio. */
export function useLabel(): (key: string) => string {
  const t = useT(LABELS);
  return (key) => t[key] ?? key;
}
