# Spec — descoberta-artes

## Objetivo técnico
Melhorar "relacionadas" com score de sobreposição de tags + categoria (SQL no helper de
artworks), e introduzir reviews 1–5 estrelas **verificadas por compra** (model `Review`,
APIs CRUD mínimas, agregação na listagem), reaproveitando `Order/OrderItem` como prova de compra.

## Requisitos

### Funcionais — Relacionadas
1. **RF-1** `GET /api/artworks/related?slug=X` (ou parâmetro no helper): score =
   `2 × tags em comum + 1 mesma categoria`, exclui a própria arte e não-PUBLISHED,
   `ORDER BY score DESC, downloads DESC LIMIT 8`. Implementação com join/CTE crua é ok
   (o repo já usa `$queryRaw` para FTS); expor como parte do helper `lib/artworks/query.ts`.
2. **RF-2** `/loja/[slug]` consome RF-1; seção renumerada para até 8 cards, título
   "Combinam com esta arte"; fallback para categoria quando a arte não tem tags.

### Funcionais — Reviews
3. **RF-3** Model `Review` (ver modelagem). Estrela inteira 1–5; comentário opcional ≤ 500 chars
   (Zod em `lib/validations`, skill `schema-contract-sync`).
4. **RF-4** Elegibilidade: apenas usuário autenticado com **Order PAID contendo o artwork**
   (reusa lookup de `canDownloadArtwork`/`access.ts`). FASE/ADMIN não compram → podem avaliar
   qualquer PUBLISHED (são usuários internos que baixam tudo). VISITOR/sem compra → 403 com
   mensagem "compre para avaliar".
5. **RF-5** APIs: `GET /api/artworks/[slug]/reviews?page` (público, pagina 20, sem PII —
   nome apenas da primeira letra), `POST /api/reviews` (cria ou atualiza o próprio —
   upsert no unique), `DELETE /api/reviews/[id]` (dono ou ADMIN). Sem edição parcial.
6. **RF-6** UI detalhe: bloco de nota média + histograma (barras CSS), form inline de 1–5
   estrelas para quem é elegível (a página já busca `hasPurchased`), lista paginada com
   botão "carregar mais". Estrelas com `aria-label` e input por teclado (radiogroup nativo).
7. **RF-7** Agregação no card/loja: `avgRating` (1 casa) + `count` vindos no `include/_count`
   da query de listagem (subquery/groupBy único — não N+1). Exibir badge só com ≥1 review.
8. **RF-8** Moderação: ADMIN pode deletar (RF-5); `/admin/downloads`-like listagem própria
   **não** — coluna de reviews adiciona na tela existente de artes (deletar + ver texto).

### Não-funcionais
- RFN-1: anti-spam: 1 review por (usuário, arte) (constraint) + rate-limit por usuário
  (o repo já tem `rate-limit` testado) 10 req/min no POST.
- RFN-2: Sem e-mail pedindo review (extensão futura; não acoplar ao webhook agora).
- RFN-3: Página de detalhe continua < 1 rede-extra-block: reviews chegam lazy (segunda chamada).

## Modelagem de Dados & Contratos de API
```prisma
model Review {
  id        String   @id @default(cuid())
  artworkId String
  artwork   Artwork  @relation(fields: [artworkId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating    Int // 1..5 (validado Zod; check parcial no app)
  comment   String?  @db.VarChar(500)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([artworkId, userId])
  @@index([artworkId])
}
```
Contratos:
- `POST /api/reviews` body `{ artworkId, rating, comment? }` → `{ review, stats: { avg, count } }`
- `GET /api/artworks/[slug]/reviews?page=1` → `{ items: [{initial,name?,rating,comment,createdAt}], avg, count, histogram[5], total, page }`
- `DELETE /api/reviews/[id]` → 204

## Critérios de Aceite & Casos de Teste
- **CA-1** Cliente sem compra → POST 403; com Order PAID → 201; segundo POST → atualiza (200), `count` não muda.
- **CA-2** Dois usuários, ratings 5 e 3 → badge "4,0 (2)" no card da loja.
- **CA-3** Review de arte deletada → cascade remove; de ADMIN em review alheia → 204.
- **CA-4** Relacionadas: arte com 2 tags em comum pontua acima de mesma-categoria-só; tag-less cai no fallback de categoria (unit test do score).
- **CA-5** `npm run test`: route tests das 3 rotas + unit do score + componente do histograma renderiza zeros sem dividir por zero.

## Non-goals (técnicos)
- Tabela de agregado desnormalizada (media guardada) — groupBy on-the-fly basta nesse porte.
- Full-text search nos comentários de review.
- Migração para `migrate dev` (repo usa `db push`; novo model só `db push` + fts-setup pattern).
