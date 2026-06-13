# Feat — Polimento de Marketplace na Loja (paridade Etsy/Redbubble/Elo7)

## Objetivo
Elevar a loja (`/loja`) e a página de detalhe (`/loja/[slug]`) ao padrão visual e de
conversão dos marketplaces de referência, sem mudar schema nem regras de download.

## Escopo (itens 1–10)
1. **Card com preço, hover overlay e rodapé dinâmico por perfil**:
   - Card exibe preço (ou "Grátis") e, no hover, overlay com "Ver arte" e formatos.
   - **Rodapé Dinâmico para CLIENT**: Se o usuário for cliente logado (`role === 'CLIENT'`), o botão do rodapé exibe "Comprar por R$ XX" (com ícone de carrinho) para artes premium não adquiridas, ou "Baixar arte" (com ícone de download) se a arte for grátis ou já tiver sido comprada. Se for visitante, exibe "Faça login para baixar" (com cadeado). Se for equipe (`FASE`/`ADMIN`), exibe "Baixar arte".
2. **Dropdown de ordenação**: Mais recentes / Mais baixadas / A–Z / Gratuitas primeiro.
3. **Artes relacionadas** no detalhe (mesma categoria, máx. 5).
4. **CTA sticky no mobile** na página de detalhe.
5. **Filtros na URL** (`?cat=&tag=&q=&free=1&fav=1&sort=`) — compartilháveis e persistentes.
6. **Breadcrumb** no detalhe (Loja › Categoria › Título).
7. **Trust badges** abaixo do CTA no detalhe.
8. **Empty state** com ícone + ações.
9. **Skeleton fiel** ao card real (aspecto 4:5).
10. **Botão "voltar ao topo"** na loja.

## O que NÃO faz
- Não altera regras de download/role (visitante não baixa; FASE/ADMIN sim; cliente comprado).
- Não adiciona Stripe/Mercado Pago novo, nem busca server-side, nem toast.
- Não cria/remove rotas.

## Mudanças de dados / API e Fluxo de Compra no Catálogo
- **Busca de Compras**: Na página `/loja`, se o usuário autenticado for um `CLIENT`, a página deve efetuar uma chamada para `GET /api/orders` para obter a lista de pedidos do cliente. Ela compilará um conjunto (`Set`) contendo os IDs das artes cujos pedidos possuem status `PAID`. Esse conjunto (`purchasedArtworkIds`) será propagado para o componente `ArtworkCard` para que o botão de rodapé seja alterado dinamicamente de "Comprar" para "Baixar".
- `GET /api/artworks`: passa a incluir `_count: { downloads }` (aditivo) para ordenação
  "mais baixadas". Sem novos parâmetros — ordenação é client-side.
- `ArtworkWithRelations` ganha `_count?: { downloads: number }`.
- `ArtworkFilterState` ganha `sort?: ArtworkSort`.

## Arquivos impactados
- `src/types/artwork.ts` (tipos)
- `src/app/api/artworks/route.ts` (include `_count`)
- `src/hooks/useArtworkFilters.ts` (URL-synced)
- `src/app/loja/page.tsx` (sort, empty state, back-to-top, Suspense, fetch de orders de cliente)
- `src/app/loja/[slug]/page.tsx` (breadcrumb, related, sticky CTA, trust badges)
- `src/components/artwork/ArtworkCard.tsx` (preço + hover overlay + rodapé dinâmico)
- `src/components/shared/LoadingGrid.tsx` (skeleton fiel)

## Critérios de aceitação
- Compartilhar a URL com filtros reabre a loja no mesmo estado.
- Ordenação reordena o grid e volta para a página 1.
- Card exibe preço e, no hover, "Ver arte" + formatos.
- O rodapé do card para clientes logados exibe "Comprar por R$ X" para artes não compradas e "Baixar arte" para artes gratuitas ou compradas.
- Detalhe mostra breadcrumb, artes relacionadas e (no mobile) barra de ação fixa.
- `npm run build` e `npm run lint` passam.

## Riscos e Notas de Escalabilidade
- `useSearchParams` exige Suspense boundary → loja envolvida em `<Suspense>`.
- Re-render por keystroke na busca já existia (filtragem client-side) — sem regressão.
- **Ressalva de Escalabilidade**: A filtragem e ordenação client-side são soluções voltadas à agilidade no MVP. Com o crescimento do acervo (milhares de artes), deve ser desenhada uma migração de listagem e paginação server-side (usando `take` e `skip` do Prisma) combinada com busca indexada no banco de dados.
