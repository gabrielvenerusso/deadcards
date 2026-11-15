# Comparação, escalações, compartilhamento e perfis

## Rotas

- `/comparar?a=<id-da-carta>&b=<id-da-carta>`: versões selecionadas na URL, diferenças de OVR/atributos e radar.
- `/montar-time`: equipe com seis jogadores do catálogo; cálculo separado do ranking oficial.
- `/escalacao/<id>`: escalação pública; o dono pode editar, duplicar e excluir. Outros usuários podem salvar uma cópia na própria conta.
- `/carta/<id>`: Spotlight da versão exata, inclusive cartas especiais.
- `/jogador/<id>`: perfil da carta principal, versões, atributos, redes e evolução de OVR.
- Telas existentes: `/times`, `/tier-list`, `/colecao`, `/resgatar`, `/editor`, `/privacidade` e `/termos`.

## Banco e configuração

Aplicar **0006_profiles_lineups.sql** depois das migrations existentes. Ela adiciona `profile_json` e `updated_at` a `players`, além de criar `lineups` com proprietário e índice. Jogadores existentes recebem perfil vazio; datas ou atributos antigos não são inventados.

```sh
npm install
npm run db:migrate
npm test
npm run build
```

Os testes usam o executor nativo do Node e SQLite em memória, validados com Node 24. A migration foi aplicada no ambiente local durante a implementação. Em produção, aplicar `npm run db:migrate:remote` antes de publicar o Worker.

Bindings D1/R2 e autenticação existentes são reaproveitados. `wrangler.jsonc` inclui `/carta/*`, `/jogador/*` e `/escalacao/*` em `run_worker_first` para gerar Open Graph antes de servir o HTML. Não remover essas entradas.

Nenhuma credencial nova é necessária. Login real continua dependendo das credenciais Twitch/Google do ambiente. A verificação local usou sessões descartáveis no D1, sem contatar provedores OAuth.

## Permissões e dados

Catálogo e perfis continuam exigindo `currentUser(...).admin`. Como solicitado para equipes pessoais, as rotas de escalação são uma exceção: exigem sessão e conferem o proprietário em toda alteração, além de validar a origem. Nem administradores podem modificar escalações de outra pessoa por esses endpoints.

A API rejeita cartas inexistentes, escalações incompletas e duplicatas por identidade, seguindo `variantOf` entre versões. Uma carta removida do catálogo aparece como indisponível na escalação e precisa ser substituída antes de salvar. Escalações salvas são públicas por link; dados da conta do proprietário não aparecem na resposta pública.

Biografia, SteamID e redes sociais são opcionais. URLs aceitam apenas HTTPS sem credenciais. Novos registros de histórico guardam os seis atributos; registros antigos continuam válidos e só permitem comparação quando existem snapshots anteriores.

## Exportação

`src/lib/card-image.ts` reutiliza cálculos, cores, contornos, ornamentos e partículas do sistema de raridade. O resultado é uma representação estática da carta. Fontes e efeitos em movimento têm equivalentes estáticos.

- Cartas: PNG transparente de **885 × 1290**.
- Open Graph: PNG de **1200 × 630**, com nome, OVR, time, posição, herói e atributos.
- Escalações: PNG de **1530 × 1650**, com seis cartas e médias.

As dependências adicionadas têm funções específicas: `@cf-wasm/resvg` rasteriza SVG no Worker; `@cf-wasm/photon` converte artes WebP que o resvg não decodifica. Não vão para o bundle do navegador. A fonte Barlow e sua licença OFL estão em `public/fonts/`.

Imagens de carta são guardadas no R2 em `shares/`, com fingerprint dos dados para invalidação. Imagens de escalações são geradas sob demanda. Nenhuma imagem é gravada como base64 no D1. A geração usa WASM; o orçamento de CPU do plano Cloudflare precisa comportar renderizações sem cache.

## Arquivos

| Área | Arquivos principais |
| --- | --- |
| Novas telas | `src/views/Compare.tsx`, `LineupBuilder.tsx`, `PlayerProfile.tsx` |
| Componentes | `Card.tsx` reutilizado sem mudanças; `Spotlight.tsx`, `CardPreview.tsx`, `PlayerPicker.tsx`, `HistoryChart.tsx`, `StatsRadar.tsx`, `ShareActions.tsx` |
| Rotas e login | `src/App.tsx`, `src/lib/navigation.ts`, `src/components/Account.tsx`, `src/views/Login.tsx` |
| Regras e tipos | `src/lib/cards.ts`, `types.ts`, `lineups.ts`, `profiles.ts`, `share.ts`, `card-image.ts` |
| API | `src/worker.ts`, `src/server/catalog.ts`, `lineups.ts`, `sharing.ts` |
| Editor e estilos | `src/views/Editor.tsx`, `src/index.css`, `src/styles/features.css` |
| Persistência e build | `migrations/0006_profiles_lineups.sql`, `wrangler.jsonc`, `package.json`, `package-lock.json`, `public/fonts/` |
| Testes | `tests/features.test.ts`, `tests/fixtures.ts`, `scripts/register-test.mjs` |

## Validação realizada

- `npm test`: seis testes com múltiplas asserções de cálculo, seleção, histórico, sanitização, SVG e permissões usando SQLite.
- `npm run build`: TypeScript e bundles de cliente/Worker concluídos.
- Prévia do build em workerd: sessão autenticada, gravação administrativa de perfil, permissões entre dois usuários, criação/edição/cópia/exclusão de escalações, 11 rotas SPA e três rotas com Open Graph.
- PNGs de carta, Open Graph e escalação gerados; dimensões conferidas e imagens inspecionadas. A ausência inicial de artes WebP e um redirecionamento de `/index.html` foram corrigidos durante essa verificação.
- Comparação conferida no Chrome em desktop. A inspeção automatizada foi interrompida pelo usuário; em 15/11/2026, o usuário informou que concluiu a conferência visual e aprovou o resultado.

As mudanças foram preparadas em commits locais. A publicação e o deploy foram cancelados a pedido do usuário; a migration de produção não foi aplicada.
