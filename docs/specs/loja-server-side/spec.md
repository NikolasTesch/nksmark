# Spec — loja-server-side

## Objetivo técnico
Tornar a `/loja` orientada por URL: filtros, busca, ordenação e paginação resolvidos no servidor
(Prisma + FTS com paginação) com `searchParams` como fonte única de verdade, e o cliente apenas
sobrepondo o filtro de favoritos (que continua localStorage, pois a lista de IDs favoritos é
pequena e local).

## Requisitos

### Funcionais
1. **RF-1 Contrato de query server-side.** `GET /api/artworks` passa a aceitar e aplicar no
   Prisma: `q` (FTS via `search_vector` com fallback `title contains`), `categoryId`, `tagId`,
   `isFree`, `sort` (`recent|downloads|az|free`), `page` (1-based), `pageSize` (default 40, max 60).
   Resposta: `{ items, total, page, pageSize, facets }`. A rota `/api/artworks/search` é
   descontinuada (engolida por `q`) — manter redirect de compat? Não: única consumidora é a loja.
2. **RF-2 FTS paginada.** Substituir o `LIMIT 50` fixo por `LIMIT/OFFSET` com `ts_rank` e
   `COUNT(*) OVER()` para `total`; manter `status='PUBLISHED'`. Página de resultado nunca vazia
   quando `page` > páginas existentes: normalizar para a última (302 no servidor da página).
3. **RF-3 Página server-driven.** `/loja` vira Server Component que lê `searchParams`, busca
   dados via helper compartilhado `src/lib/artworks/query.ts` (mesmo código do route handler —
   fonte única), e renderiza o grid; carregar mais páginas/mudar filtro = navegação de URL com
   `loading.tsx`/`LoadingGrid` no suspense. Cliente mantém: drawer de filtros mobile, chips
   ativos, overlay de favoritos, sessão, carrinho.
4. **RF-4 Favoritos como overlay.** Filtro "Só favoritas" aplicado no servidor por
   `ids=<csv>` (a página envia a lista localStorage ≤ N=200; acima disso, truncar com aviso),
   preservando paginação server-side. Sem mudança em `useFavorites` além do efeito que
   revalida a URL quando o conjunto muda com o filtro ativo.
5. **RF-5 URL como estado.** `useArtworkFilters` passa a derivar 100% do `searchParams`
   (hoje é estado espelho). Parâmetros: `q, cat, tag, sort, free, fav, page`. Trocar filtro
   reseta `page`. Chips removíveis para cada filtro ativo acima da grade (desktop e mobile).
6. **RF-6 Ordenação server-side.** `recent`=createdAt desc; `downloads`=COUNT(Download) desc;
   `az`=title collation "pt" asc; `free`=isFree desc, depois downloads. (Hoje é sort em memória
   com a mesma semântica — replicar exatamente para não mudar resultados conhecidos.)

### Não-funcionais
- RFN-1: `totalCount` e filtragem em ≤ ~150ms p95 com 5k artes (índices: `categoryId`,
  `status`, GIN `search_vector` — conferir `fts-setup.sql`; adicionar índice btree em
  `created_at`/`title` se faltar).
- RFN-2: Zero regressão de hidratação (Suspense obrigatório com `useSearchParams`, padrão já existente).
- RFN-3: `pageSize` da grade visual inalterado (40) para não mexer no design.

## Modelagem de Dados & Contratos de API
- Nenhuma tabela nova. Novo helper `lib/artworks/query.ts` com `buildArtworkWhere(params)` +
  `fetchArtworkPage(params)` compartilhados por Server Component e route handler.
- Contrato: `GET /api/artworks?q&categoryId&tagId&isFree&sort&page&pageSize&ids` →
  `{ items: ArtworkListItem[], total: number, page: number, pageSize: number }`.
  Validar com Zod em `src/lib/validations/` (skill `schema-contract-sync`).

## Critérios de Aceite & Casos de Teste
- **CA-1** `/loja?cat=3&sort=downloads&page=2` no outro navegador restaura exatamente a mesma lista.
- **CA-2** Busca "floral": retorna FTS paginada, total correto, `page=1` do total; `?q=&page=999` normaliza.
- **CA-3** Com 500 artes no DB, o documento HTML inicial traz só 40 cards e o payload da
  primeira chamada não excede 40 itens.
- **CA-4** Marcar/desmarcar favorito com o filtro `fav=1` ativo revalida a lista (item some após 4s ou imediatamente — decisão: revalidar na hora).
- **CA-5** Chips ativos: remover chip `tag` atualiza a URL sem recarregar a página inteira (soft nav).
- **CA-6** Testes de rota: paginação além do fim, `pageSize>60` clampado, `ids` não-numérico ignorado, FTS SQL injection-safe (parâmetro ligado).

## Non-goals (técnicos)
- Cache Redis/in-memory para contagens.
- Migrar o grid para `<Table>`/virtualização.
- Persistir favoritos no banco (outra spec).
- `next/cache` ISR na loja (dados mudam por usuário: sessão/favoritos).
