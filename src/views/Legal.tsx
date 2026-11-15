import { strings, useLocale, useT } from "../lib/i18n";

type Items = [string, string][];
type Page = { title: string; items: Items };

const S = strings<{ updated: (date: string) => string; privacy: Page; terms: Page }>({
  pt: {
    updated: (d) => `Atualizado em ${d}`,
    privacy: {
      title: "Privacidade",
      items: [
        ["O que coletamos", "Só ao entrar com Twitch ou Google: nome, e-mail, foto de perfil e o ID da conta, fornecidos pelo próprio serviço. Guardamos também as cartas que você resgatou."],
        ["Para que usamos", "Para manter você logado e mostrar sua coleção. Não vendemos, não compartilhamos e não usamos para anúncios."],
        ["Cookies", "Usamos apenas cookies essenciais: o de sessão, para o login, e o cookie \"lang\", que guarda o idioma escolhido. Não há cookies de rastreamento nem analytics."],
        ["Idioma e país", "Na primeira visita, usamos o país, derivado do seu IP pela Cloudflare, só para sugerir o idioma do site. Esse dado não é armazenado."],
        ["Onde fica", "Os dados ficam na Cloudflare, que hospeda o site. Estatísticas de jogo vêm da API pública deadlock-api."],
        ["Seus direitos (LGPD)", "Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento abrindo uma issue no GitHub do projeto."],
      ],
    },
    terms: {
      title: "Termos de uso",
      items: [
        ["O projeto", "Deadlock Cards é um projeto de fã, gratuito e feito por diversão. Não é afiliado à Valve nem ao Deadlock."],
        ["Cartas", "As cartas são colecionáveis digitais sem valor monetário. Não podem ser vendidas nem trocadas por dinheiro."],
        ["Uso justo", "Não tente burlar códigos de resgate, automatizar acessos ou atrapalhar o site. Contas que fizerem isso podem ser removidas."],
        ["Sem garantias", "O site é oferecido como está e pode mudar, ficar fora do ar ou ser encerrado a qualquer momento."],
        ["Mudanças", "Estes termos podem ser atualizados. Usar o site depois de uma mudança significa aceitar a nova versão."],
      ],
    },
  },
  en: {
    updated: (d) => `Updated on ${d}`,
    privacy: {
      title: "Privacy",
      items: [
        ["What we collect", "Only when you sign in with Twitch or Google: your name, email, profile picture and account ID, provided by the service itself. We also store the cards you have redeemed."],
        ["What we use it for", "To keep you signed in and show your collection. We don't sell it, share it or use it for ads."],
        ["Cookies", "We only use essential cookies: the session cookie, for sign-in, and the \"lang\" cookie, which stores the language you picked. There are no tracking cookies and no analytics."],
        ["Language and country", "On your first visit, we use your country, derived from your IP by Cloudflare, only to suggest the site's language. This data is not stored."],
        ["Where it lives", "The data is kept on Cloudflare, which hosts the site. Game stats come from the public deadlock-api."],
        ["Your rights (LGPD)", "You can ask for access to, correction of or deletion of your data at any time by opening an issue on the project's GitHub. LGPD is Brazil's data protection law."],
      ],
    },
    terms: {
      title: "Terms of use",
      items: [
        ["The project", "Deadlock Cards is a free fan project made for fun. It is not affiliated with Valve or Deadlock."],
        ["Cards", "Cards are digital collectibles with no monetary value. They can't be sold or exchanged for money."],
        ["Fair use", "Don't try to bypass redeem codes, automate access or disrupt the site. Accounts that do so may be removed."],
        ["No warranties", "The site is provided as is and may change, go offline or be shut down at any time."],
        ["Changes", "These terms may be updated. Using the site after a change means you accept the new version."],
      ],
    },
  },
  es: {
    updated: (d) => `Actualizado el ${d}`,
    privacy: {
      title: "Privacidad",
      items: [
        ["Qué recopilamos", "Solo cuando inicias sesión con Twitch o Google: nombre, correo, foto de perfil e ID de la cuenta, que nos da el propio servicio. También guardamos las cartas que canjeaste."],
        ["Para qué lo usamos", "Para mantenerte con la sesión iniciada y mostrar tu colección. No lo vendemos, no lo compartimos y no lo usamos para anuncios."],
        ["Cookies", "Solo usamos cookies esenciales: la de sesión, para el inicio de sesión, y la cookie \"lang\", que guarda el idioma que elegiste. No hay cookies de rastreo ni analíticas."],
        ["Idioma y país", "En tu primera visita usamos el país, que Cloudflare deriva de tu IP, solo para sugerirte el idioma del sitio. Ese dato no se almacena."],
        ["Dónde se guarda", "Los datos están en Cloudflare, que aloja el sitio. Las estadísticas de juego vienen de la API pública deadlock-api."],
        ["Tus derechos (LGPD)", "Puedes pedir acceso, corrección o eliminación de tus datos en cualquier momento abriendo un issue en el GitHub del proyecto. La LGPD es la ley de protección de datos de Brasil."],
      ],
    },
    terms: {
      title: "Términos de uso",
      items: [
        ["El proyecto", "Deadlock Cards es un proyecto de fans, gratuito y hecho por diversión. No está afiliado a Valve ni a Deadlock."],
        ["Cartas", "Las cartas son coleccionables digitales sin valor monetario. No se pueden vender ni cambiar por dinero."],
        ["Uso justo", "No intentes saltarte los códigos de canje, automatizar accesos ni perjudicar el sitio. Las cuentas que lo hagan pueden ser eliminadas."],
        ["Sin garantías", "El sitio se ofrece tal cual y puede cambiar, quedar fuera de línea o cerrarse en cualquier momento."],
        ["Cambios", "Estos términos pueden actualizarse. Usar el sitio después de un cambio significa aceptar la nueva versión."],
      ],
    },
  },
});

export function Legal({ page }: { page: "privacy" | "terms" }) {
  const t = useT(S);
  const locale = useLocale();
  const { title, items } = t[page];
  return (
    <article className="max-w-2xl mx-auto noir-glass rounded-2xl border border-zinc-200/15 p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold uppercase tracking-wider text-zinc-100">{title}</h1>
      <p className="mt-1 text-xs text-zinc-500">{t.updated(new Date(2026, 10, 15).toLocaleDateString(locale))}</p>
      {items.map(([h, p]) => (
        <section key={h} className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">{h}</h2>
          <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{p}</p>
        </section>
      ))}
    </article>
  );
}
