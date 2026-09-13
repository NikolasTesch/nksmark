# Tasks — descoberta-artes

## Relacionadas
- [ ] T-1 Função `relatedArtworks(artworkId)` no helper de queries (score tags+categoria, CTE/`$queryRaw`, LIMIT 8)
- [ ] T-2 Unit tests do score (tag overlap > mesma categoria; exclui não-PUBLISHED; fallback sem tags)
- [ ] T-3 `GET /api/artworks/related?slug=` + route test
- [ ] T-4 `/loja/[slug]`: trocar fetch `categoryId` por RF-1, seção "Combinam com esta arte" (até 8)

## Reviews — base
- [ ] T-5 Model `Review` no `prisma/schema.prisma` + relation em `User`/`Artwork` + `db push` dev
- [ ] T-6 Zod `reviewSchema` em `lib/validations` (rating 1–5, comment ≤500) — schema-contract-sync
- [ ] T-7 `POST /api/reviews` (upsert dono, elegibilidade compra via acesso de `access.ts`, rate-limit) + testes
- [ ] T-8 `GET /api/artworks/[slug]/reviews?page` (público, paginado, sem PII) + testes
- [ ] T-9 `DELETE /api/reviews/[id]` (dono|admin) + teste
- [ ] T-10 Agregado `avg/count` na listagem de `/api/artworks` (groupBy único, sem N+1) + teste

## Reviews — UI
- [ ] T-11 Componente `Stars` (radiogroup acessível) + histograma CSS em `components/artwork/`
- [ ] T-12 Bloco de reviews em `/loja/[slug]`: stats + form (só elegíveis) + lista "carregar mais"
- [ ] T-13 Badge nota no `ArtworkCard` (≥1 review)
- [ ] T-14 Deletar review na tela `/admin/artes` (dialog + toast)

## QA
- [ ] T-15 `npm run test` completo; smoke mobile da seção de reviews (teclado, aria)
- [ ] T-16 Atualizar `CLAUDE.md`/rota no mapa de features ao final
