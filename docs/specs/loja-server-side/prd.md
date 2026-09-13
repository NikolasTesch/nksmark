# PRD — loja-server-side

## Problema
A `/loja` hoje baixa **todo o acervo** (`GET /api/artworks` sem paginação, `useArtworks.ts`)
e filtra/ordena/pagina em memória (`loja/page.tsx:106–158`). A busca FTS server-side existe
(`/api/artworks/search`) mas tem `LIMIT 50` fixo, sem paginação, e é apenas um "acelerador"
client-side. Consequências:

- O payload cresce linearmente com o catálogo (a própria spec do repo declara esse teto).
- URLs não são compartilháveis indexáveis: filtros vivem em estado React; `searchParams` só
  alimenta parcialmente `useArtworkFilters`.
- Mais de ~50 resultados relevantes em uma busca são inalcançáveis.

## Persona afetada
Cliente navegando a loja (busca/filtro/paginação) e o SEO da vitrine (URLs por combinação de filtros).

## Métricas de sucesso
- HTML inicial da loja constante (≤ ~40 itens) independentemente do tamanho do acervo.
- Qualquer combinação categoria/tag/busca/ordem/página tem URL canônica que restaura o mesmo estado em outro dispositivo.
- Busca FTS com paginação real e contagem de resultados exibida ("X artes encontradas").
- Payload JSON da primeira carga reduzido >70% vs. hoje (medir com 1000 artes no seed de teste).

## Fora de escopo (produto)
- Favoritos server-side/persistidos (feature própria do roadmap, não escolhida agora).
- Recomendações/"você também pode gostar" (spec `descoberta-artes`).
- Refatorar o design do grid/filtros além dos chips ativos.
