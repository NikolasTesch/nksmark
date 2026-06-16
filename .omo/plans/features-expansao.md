# NKS Art — Plano de Expansão: 5 Features Estratégicas

## TL;DR

> **Quick Summary**: Implementar 5 funcionalidades estratégicas na plataforma NKS Art — watermark automático via Sharp, carrinho multicompra com cupons, full-text search PostgreSQL, coleções temáticas, e painel financeiro com gráficos interativos — para aumentar receita, melhorar descoberta de artes e proteger conteúdo.
>
> **Deliverables**:
> - Preview de imagens com marca d'água da NKS Art no upload
> - Carrinho de compras persistente (DB) com checkout multi-item + cupons de desconto
> - Busca textual com relevância lexicográfica e stemming em português
> - Sistema de coleções temáticas (Many-to-Many) com bloco "Outras artes desta coleção"
> - Dashboard financeiro com gráficos de receita diária/mensal, distribuição de pagamentos e heatmap de horários
>
> **Estimated Effort**: Large (~45-55 tasks)
> **Parallel Execution**: YES — 4 waves + final verification
> **Critical Path**: T2 (Schema) → T4 (Order Refactoring) → T12 (Cart Checkout) → F1-F4

---

## Context

### Original Request
Implementação de 7 features de expansão no NKS Art. Após entrevista, 2 foram removidas (Auth Social Google e Newsletter), resultando em 5 features prioritárias.

### Interview Summary
**Key Discussions**:
- **Watermark**: Texto "NKS Art" + logo inline via Sharp, server-side no momento do upload. Deploy Vercel (serverless) — configurar bundle tracing. Aplicar em capa + galeria (PNG/JPG). Upload continua sem watermark se Sharp falhar.
- **Carrinho**: Persistente via DB (Cart + CartItem). Checkout multi-item modificando a Preference do Mercado Pago para múltiplos itens.
- **Cupons**: Percentuais E fixos. Admin cria no DB, cliente aplica no carrinho. Validação server-side.
- **FTS**: PostgreSQL nativo com índices GIN e tsvector/tsquery para português. Endpoint paralelo sem quebrar busca atual.
- **Coleções**: Many-to-Many explícito (CollectionArtwork com order). Admin CRUD + bloco público na página de detalhe.
- **Painel Financeiro**: Gráficos Recharts (linha receita, pizza pagamentos, heatmap horários). Estender página /admin/vendas existente.
- **Testes**: Tests-after com Vitest para TODAS as features + QA Scenarios agent-executados.

**Research Findings**:
- Sharp + Recharts não estão instalados. 23 arquivos de teste existem.
- Order model tem `artworkId` obrigatório (1 Order = 1 Artwork) — precisa refatorar para suportar múltiplos itens.
- Upload route atual faz buffer → R2 diretamente — watermark precisa interceptar.
- Busca atual é client-side `art.title.toLowerCase().includes(query)`.
- Admin vendas tem métricas mensais mas sem gráficos temporais.
- Prisma usa `db push` (sem migrations versionadas).

### Metis Review
**Identified Gaps** (addressed):
- **Deploy environment**: Vercel serverless confirmado — Sharp precisa de configuração `outputFileTracingIncludes` no next.config.ts.
- **Gallery images**: Confirmado — watermark em capa + galeria PNG/JPG, NÃO em arquivos privados (CDR/AI/PDF/OTF).
- **Order refactoring**: 18+ arquivos tocam Order — estratégia backward-compatível: manter `artworkId` nullable, adicionar OrderItem, criar OrderItem para cada Order existente via script.
- **Cart approach**: DB-based confirmado (não localStorage).

---

## Work Objectives

### Core Objective
Expandir a plataforma NKS Art com 5 funcionalidades estratégicas para aumentar receita (carrinho + cupons), melhorar descoberta de artes (FTS + coleções), proteger conteúdo (watermark) e dar visibilidade financeira ao admin (gráficos).

### Concrete Deliverables
- [ ] Preview + gallery images com watermark NKS Art (Sharp)
- [ ] Cart + CartItem + Coupon models no banco
- [ ] API de carrinho (add/remove/list/checkout) e cupons (apply/validate)
- [ ] Order refatorada com OrderItem para suportar múltiplas artes
- [ ] Multi-item checkout via Mercado Pago Preference
- [ ] Índice GIN + tsvector no Artwork para FTS em português
- [ ] API de busca textual com ranking de relevância
- [ ] Collection + CollectionArtwork models (Many-to-Many explícito)
- [ ] Admin CRUD de coleções + bloco "Outras artes desta coleção"
- [ ] API financeira com agregação temporal de receita
- [ ] Gráficos Recharts na página /admin/vendas (linha, pizza, heatmap)
- [ ] Testes Vitest para todas as features

### Must Have
- Watermark NÃO bloqueia upload se Sharp falhar (graceful degradation)
- Order refactoring é backward-compatível (pedidos existentes intactos)
- FTS mantém fallback para busca client-side atual
- Carrinho persiste no DB entre sessões do mesmo usuário
- Coleções têm ordenação explícita (campo `order` no join table)
- Cupons têm validação de expiração (data de validade) e limite de usos
- Gráficos financeiros mostram dados reais do banco (sem dados mockados)

### Must NOT Have (Guardrails)
- Sem carrinho localStorage (usar DB conforme decisão)
- Sem "wishlist" ou "salvar para depois" (fora do escopo)
- Sem estoque/availability checking (produto digital)
- Sem guest cart ou merge-on-login (carrinho só para usuários logados)
- Sem pg_trgm ou "você quis dizer" no FTS (raw tsquery apenas)
- Sem reordenar artworks dentro de coleção via drag-and-drop (order numérico simples)
- Sem exportar CSV dos gráficos
- Sem autenticação social Google (removida do escopo)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Vitest, 23 test files)
- **Automated tests**: Tests-after (para TODAS as features)
- **Framework**: Vitest + React Testing Library
- **Coverage target**: Pelo menos 1 teste por endpoint novo + 1 teste por lógica de negócio

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template).
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun/node REPL) — Import, call functions, compare output
- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — Start Immediately):
├── T1: Install dependencies + config next.config.ts for Sharp Vercel
├── T2: Prisma schema — Cart, CartItem, Coupon, OrderItem, Collection, CollectionArtwork
└── T3: Type definitions + Zod validation schemas

Wave 2 (Core Backend — After T2, MAX PARALLEL):
├── T4: Order refactoring (backward-compatible) — modify schema + update 18+ files
├── T5: Sharp watermark pipeline — watermark utility + upload route integration
├── T6: Cart API — CRUD service endpoints
├── T7: Coupon API — admin CRUD + client apply/validate
├── T8: Collections API — admin CRUD + public query
├── T9: PostgreSQL FTS — GIN index, tsvector trigger, search endpoint
└── T10: Financial data API — aggregation endpoint for charts

Wave 3 (Frontend & Integration — After Wave 2):
├── T11: Cart UI — shopping cart page, add-to-cart buttons
├── T12: Multi-item checkout — cart-to-order flow, MP multi-item preference
├── T13: Collections UI — admin management + public "other arts" block
├── T14: FTS search integration in loja page
├── T15: Admin coupon management UI
└── T16: Financial charts — Recharts in /admin/vendas

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high with playwright)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T2 → T4 → T12 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Waves 2 & 3)
```

### Dependency Matrix
- **T1**: None — T3
- **T2**: None — T4, T6, T7, T8, T9, T10
- **T3**: None — T4, T6, T7, T8, T9, T10
- **T4**: T2, T3 — T12
- **T5**: T1 — None (independent feature)
- **T6**: T2, T3 — T11, T12
- **T7**: T2, T3 — T11, T15
- **T8**: T2, T3 — T13
- **T9**: T2 — T14
- **T10**: T2, T3, T4 — T16
- **T11**: T6 — T12
- **T12**: T4, T6, T11 — F3
- **T13**: T8 — F3
- **T14**: T9 — F3
- **T15**: T7 — F3
- **T16**: T10 — F3
- **F1-F4**: All — user ok

---

## TODOs

- [x] 1. Instalar sharp + recharts + configurar next.config.ts para Sharp no Vercel

  **What to do**:
  - Executar `npm install sharp recharts` (e `@types/recharts` se necessário)
  - No `next.config.ts`, adicionar `experimental.outputFileTracingIncludes` para incluir binários nativos do Sharp no bundle serverless
  - Verificar se `experimental` existe no config; se não, adicionar bloco
  - Criar `src/lib/watermark/` diretório como placeholder para o módulo de watermark (implementação real na T5)
  - Rodar `npm run build` para verificar se Sharp compila corretamente no ambiente

  **Config de referência (next.config.ts)**:
  ```typescript
  experimental: {
    outputFileTracingIncludes: {
      '**/*': ['./node_modules/sharp/**/*'],
    },
  },
  ```

  **Must NOT do**:
  - Não implementar watermark ainda (só instalar + configurar)
  - Não remover `sharp` da build mesmo se der warning de tamanho

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1 (with T2, T3)
  - **Blocks**: T5 (watermark precisa do sharp instalado)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `npm ls sharp` → mostra sharp instalado
  - [ ] `npm ls recharts` → mostra recharts instalado
  - [ ] next.config.ts contém `outputFileTracingIncludes` com sharp
  - [ ] `npm run build` → sucesso

  **QA Scenarios**:
  ```
  Scenario: Dependencies installed correctly
    Tool: Bash
    Steps:
      1. npm ls sharp 2>&1 | Select-String "sharp@" → deve encontrar
      2. npm ls recharts 2>&1 | Select-String "recharts@" → deve encontrar
    Expected Result: Ambos os pacotes listados sem erros
    Evidence: .omo/evidence/task-1-deps-installed.txt

  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. npm run build
    Expected Result: Exit code 0, "✓ Built" no output
    Evidence: .omo/evidence/task-1-build-success.txt
  ```

  **Commit**: YES
  - Message: `chore(deps): install sharp and recharts for watermark and charts`
  - Files: `package.json, package-lock.json, next.config.ts`
  - Pre-commit: `npm run build`

- [x] 2. Adicionar novos modelos ao Prisma schema (Cart, CartItem, Coupon, OrderItem, Collection, CollectionArtwork)

  **What to do**:
  - Abrir `prisma/schema.prisma` e adicionar os seguintes modelos:

  **Model Cart**:
  ```prisma
  model Cart {
    id        String     @id @default(cuid())
    userId    String     @unique
    user      User       @relation(fields: [userId], references: [id])
    items     CartItem[]
    createdAt DateTime   @default(now())
    updatedAt DateTime   @updatedAt
  }
  ```

  **Model CartItem**:
  ```prisma
  model CartItem {
    id        String   @id @default(cuid())
    cartId    String
    cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
    artworkId String
    artwork   Artwork  @relation(fields: [artworkId], references: [id])
    createdAt DateTime @default(now())
  }
  ```

  **Model Coupon**:
  ```prisma
  model Coupon {
    id          String   @id @default(cuid())
    code        String   @unique
    description String?
    discountType  DiscountType // PERCENTAGE | FIXED
    discountValue Int         // percentual (ex: 15 = 15%) ou centavos (ex: 1000 = R$10)
    minPurchaseCents Int?     // valor mínimo do carrinho (opcional)
    maxUses     Int?          // limite de usos (null = ilimitado)
    usedCount   Int          @default(0)
    expiresAt   DateTime?
    isActive    Boolean      @default(true)
    createdAt   DateTime     @default(now())
    updatedAt   DateTime     @updatedAt
    orders      Order[]
  }

  enum DiscountType {
    PERCENTAGE
    FIXED
  }
  ```

  **Model OrderItem** (para multi-item):
  ```prisma
  model OrderItem {
    id         String  @id @default(cuid())
    orderId    String
    order      Order   @relation(fields: [orderId], references: [id])
    artworkId  String
    artwork    Artwork @relation(fields: [artworkId], references: [id])
    amountCents Int    // snapshot do preço no momento da compra
  }
  ```

  **Modificar Order existente**:
  ```prisma
  model Order {
    id             String      @id @default(cuid())
    user           User        @relation(fields: [userId], references: [id])
    userId         String
    // artworkId torna-se OPCIONAL (backward compat)
    artworkId      String?
    artwork        Artwork?    @relation(fields: [artworkId], references: [id])
    // Novo relacionamento para multi-item
    items          OrderItem[]
    // Coupon aplicado (opcional)
    couponId       String?
    coupon         Coupon?     @relation(fields: [couponId], references: [id])
    // Mantém amountCents para compat (soma dos items)
    amountCents    Int
    // Campos existentes preservados
    status         OrderStatus @default(PENDING)
    mpPreferenceId String?
    mpPaymentId    String?     @unique
    paymentMethod  String?
    createdAt      DateTime    @default(now())
    paidAt         DateTime?
    updatedAt      DateTime    @updatedAt

    @@index([userId])
    @@index([status])
  }
  ```

  **Model Collection**:
  ```prisma
  model Collection {
    id          String               @id @default(cuid())
    title       String
    slug        String               @unique
    description String?
    artworks    CollectionArtwork[]
    createdAt   DateTime             @default(now())
    updatedAt   DateTime             @updatedAt
  }
  ```

  **Model CollectionArtwork** (explicit many-to-many with order):
  ```prisma
  model CollectionArtwork {
    collectionId String
    collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
    artworkId    String
    artwork      Artwork    @relation(fields: [artworkId], references: [id])
    order        Int        @default(0)

    @@id([collectionId, artworkId])
    @@index([artworkId])
  }
  ```

  - Executar `npx prisma db push` para sincronizar o schema
  - Criar script de migração: para cada Order existente com `artworkId` não-nulo, criar um OrderItem correspondente

  **Must NOT do**:
  - Não remover campos existentes do Order (backward compat)
  - Não usar implicit many-to-many para Collection (precisamos do campo `order`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1 (with T1, T3)
  - **Blocks**: T4, T6, T7, T8, T9, T10
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `npx prisma db push` → sucesso, schema sincronizado
  - [ ] Script de migração cria OrderItem para cada Order existente
  - [ ] `npx prisma generate` → sucesso
  - [ ] `npm run build` → sucesso

  **QA Scenarios**:
  ```
  Scenario: Schema syncs successfully
    Tool: Bash
    Steps:
      1. npx prisma db push 2>&1 | Select-String "Your database is now in sync"
    Expected Result: Schema sincronizado sem erros
    Evidence: .omo/evidence/task-2-schema-sync.txt

  Scenario: Prisma client generates without errors
    Tool: Bash
    Steps:
      1. npx prisma generate 2>&1
    Expected Result: Prisma client regenerado, exit 0
    Evidence: .omo/evidence/task-2-prisma-generate.txt

  Scenario: Migration script creates OrderItems for existing orders
    Tool: Bash
    Steps:
      1. Check if any Order exists without items → script cria OrderItems
    Expected Result: Todas as Orders existentes têm OrderItems correspondentes
    Evidence: .omo/evidence/task-2-migration.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add Cart, CartItem, Coupon, OrderItem, Collection models`
  - Files: `prisma/schema.prisma`
  - Pre-commit: `npx prisma db push && npx prisma generate && npm run build`

- [x] 3. Criar type definitions + Zod validation schemas para novas entidades

  **What to do**:
  - Criar `src/validations/cart.ts` com esquemas Zod para:
    - `addToCartSchema`: `{ artworkId: z.string().cuid() }`
    - `removeFromCartSchema`: `{ itemId: z.string().cuid() }`
    - `applyCouponSchema`: `{ code: z.string().min(3).max(30) }`
  - Criar `src/validations/collection.ts` com:
    - `createCollectionSchema`: `{ title: z.string().min(1).max(100), slug: z.string(), description: z.string().optional() }`
    - `addArtworkToCollectionSchema`: `{ artworkId: z.string().cuid(), order: z.number().int().optional() }`
  - Criar `src/validations/coupon.ts` com:
    - `createCouponSchema`: `{ code: z.string().min(3).max(30), discountType: z.enum(['PERCENTAGE','FIXED']), discountValue: z.number().int().positive(), ... }`
  - Modificar `src/validations/order.ts`:
    - `createOrderSchema` atualizado para aceitar `artworkId` (singular) OU `artworkIds` (array) para multi-item
    - Adicionar campo opcional `couponCode`
  - Criar `src/types/cart.ts` com tipos auxiliares:
    - `CartWithItems`: Cart + items populados com Artwork
    - `CartResponse`: API response shape
  - Criar `src/types/collection.ts` com:
    - `CollectionWithArtworks`: Collection + artworks populados

  **Must NOT do**:
  - Não remover schemas Zod existentes (backward compat)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 1 (with T1, T2)
  - **Blocks**: T4, T6, T7, T8, T10
  - **Blocked By**: None (mas idealmente depois de T2 para conhecer os campos exatos)

  **Acceptance Criteria**:
  - [ ] Todos os arquivos de validação criados em `src/validations/`
  - [ ] `npm run build` → sucesso (type-check passa)
  - [ ] Schemas aceitam dados válidos e rejeitam inválidos

  **QA Scenarios**:
  ```
  Scenario: Validation schemas compile and work
    Tool: Bash
    Steps:
      1. Criar script inline: import { addToCartSchema } from '@/validations/cart'
      2. addToCartSchema.parse({ artworkId: 'valid-cuid-123' }) → passa
      3. addToCartSchema.parse({}) → joga erro ZodError
    Expected Result: Schemas funcionam conforme esperado
    Evidence: .omo/evidence/task-3-validation.txt
  ```

  **Commit**: YES (com T2)
  - Message: `feat(types): add Zod schemas and TypeScript types for new entities`

- [x] 4. Refatorar Order para suportar multi-item (backward-compatible)

  **What to do**:
  - Atualizar `src/lib/validations/order.ts`:
    - Modificar `createOrderSchema` para aceitar `{ artworkId: string }` (singular, compat) OU `{ artworkIds: string[] }` (multi) OU `{ couponCode?: string }` (opcional)
  - Modificar `src/app/api/orders/route.ts` (POST):
    - Se receber `artworkIds` (array), criar Order + múltiplos OrderItems
    - Se receber `artworkId` (singular, legacy), criar Order + 1 OrderItem (backward compat)
    - Validar coupon se `couponCode` presente (aplicar desconto no `amountCents`)
    - Atualizar `createPreference` para enviar múltiplos itens no array `items`
  - Modificar `src/app/api/orders/route.ts` (GET):
    - Incluir `items` com `artwork` no retorno (além do `artwork` direto para compat)
    - Atualizar shape do response data
  - Modificar `src/lib/payments/mercadopago.ts`:
    - Atualizar `CreatePreferenceInput` para aceitar `items: { title: string; unitPrice: number; quantity: number; id: string }[]`
    - Se `CreatePreferenceInput` tiver items array, usar items ao invés de item único
    - Manter compatibilidade retroativa com chamadas existentes
  - Modificar `src/app/api/payments/webhook/route.ts`:
    - Ao confirmar pagamento, marcar Order como PAID e todos seus OrderItems
    - Ao processar `external_reference` (order.id), verificar items vinculados
  - Modificar `src/app/api/admin/sales/route.ts`:
    - Agregar vendas por OrderItem ao invés de Order direto (para suportar multi-item)
    - `totalSales` = contagem de OrderItems, não de Orders
    - `totalRevenueCents` = soma de amountCents dos OrderItems
  - Modificar `src/app/api/downloads/route.ts` e `src/app/api/downloads/zip/route.ts`:
    - Verificar permissão de download considerando OrderItems
  - Modificar `src/app/loja/page.tsx` (linha 149-163):
    - Atualizar fetch de orders para verificar purchasedArtworkIds via OrderItems
  - Modificar `src/app/loja/[slug]/page.tsx`:
    - Verificar compra via OrderItems
  - Atualizar `src/app/(public)/minhas-compras/page.tsx`:
    - Mostrar todos os OrderItems de cada Order

  **Must NOT do**:
  - Não remover `artworkId` do Order (manter nullable para backward compat)
  - Não quebrar a interface da webhook do Mercado Pago (`external_reference = order.id`)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (with T5, T6, T7, T8, T9, T10 — todos dependem de T2/T3)
  - **Blocks**: T12 (multi-item checkout)
  - **Blocked By**: T2, T3

  **Acceptance Criteria**:
  - [ ] POST /api/orders com `{ artworkIds: ["a1","a2"] }` → 201 com Order contendo 2 OrderItems
  - [ ] POST /api/orders com `{ artworkId: "a1" }` (legacy) → 201 com 1 OrderItem (backward compat)
  - [ ] MP preference recebe array com 2 itens (para multi-item)
  - [ ] GET /api/orders retorna items aninhados
  - [ ] Admin sales API soma corretamente multi-item orders
  - [ ] Download API verifica permissão via OrderItems
  - [ ] Todos os testes existentes continuam passando

  **QA Scenarios**:
  ```
  Scenario: Multi-item order creation
    Tool: Bash (curl)
    Preconditions: Auth session exists, artwork records a1 and a2 exist
    Steps:
      1. curl -X POST /api/orders -H 'Content-Type: application/json' -d '{"artworkIds": ["a1","a2"]}' -b cookies
      2. Assert response.success === true
      3. GET /api/orders -b cookies → assert response.data[0].items.length === 2
    Expected Result: Order criada com 2 OrderItems
    Evidence: .omo/evidence/task-4-multi-item-order.txt

  Scenario: Legacy single-item compat
    Tool: Bash (curl)
    Steps:
      1. curl -X POST /api/orders -d '{"artworkId": "a1"}' -b cookies
      2. Assert response.success === true
    Expected Result: Order criada com 1 OrderItem (backward compat)
    Evidence: .omo/evidence/task-4-legacy-order.txt
  ```

  **Commit**: YES
  - Message: `feat(orders): refactor Order to support multi-item via OrderItem`

- [x] 5. Criar pipeline de watermark com Sharp no upload de imagens

  **What to do**:
  - Criar `src/lib/watermark/index.ts` com:
    - Função `applyWatermark(buffer: Buffer, mimeType: string): Promise<Buffer>`
    - Carregar imagem com Sharp
    - Criar overlay SVG/Texto: "NKS Art" com rotação de -30°, opacidade ~25%, repetido em padrão grid
    - Usar `sharp.composite()` para sobrepor o watermark
    - Preservar metadados com `.withMetadata()`
    - Retornar buffer com watermark aplicado
  - Criar `src/lib/watermark/watermark.svg.ts` com template SVG:
    - Texto "NKS Art" em fonte sans-serif, rotação -30 graus
    - Opacidade ~0.25 (25%)
    - Repetido em grid pattern (espaçamento ~200px)
    - Compatível com sobreposição via Sharp
  - Modificar `src/app/api/admin/upload/route.ts`:
    - Importar `applyWatermark`
    - Após criar o buffer (linha 44), verificar se é imagem (PNG/JPG) e se o folder é 'previews' ou 'files'
    - Aplicar watermark via `applyWatermark(buffer, file.type)`
    - **Graceful degradation**: envolver em try/catch — se Sharp falhar, logar erro e continuar com buffer original
  - **Regra de aplicação**:
    - `folder === 'previews'` → SEMPRE aplicar watermark (capa)
    - `folder === 'files'` → aplicar APENAS se for PNG/JPG (galeria)
    - Arquivos CDR/AI/PDF/OTF → NUNCA aplicar watermark
  - Atualizar testes em `src/app/api/admin/upload/route.test.ts` para incluir watermark

  **Must NOT do**:
  - Não travar o upload se Sharp falhar (graceful degradation é obrigatório)
  - Não aplicar watermark em arquivos privados (CDR/AI/PDF/OTF)
  - Não modificar EXIF da imagem original (usar `.withMetadata()`)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (independente)
  - **Blocks**: None
  - **Blocked By**: T1 (sharp precisa estar instalado)

  **Acceptance Criteria**:
  - [ ] Upload de PNG em `folder=previews` → preview tem watermark visível
  - [ ] Upload de JPG em `folder=files` → gallery image tem watermark
  - [ ] Upload de CDR em `folder=files` → SEM watermark
  - [ ] Se Sharp falhar → upload continua sem watermark + log de erro
  - [ ] Metadados EXIF preservados na imagem final

  **QA Scenarios**:
  ```
  Scenario: Preview image gets watermark
    Tool: Bash (curl + file comparison)
    Preconditions: Admin auth, test image file
    Steps:
      1. Criar form-data com PNG, folder='previews', fazer POST /api/admin/upload
      2. Fazer download da imagem resultante
      3. Verificar que o buffer da imagem resultante difere do original (pixels diferentes)
    Expected Result: Imagem watermarkada é diferente da original (bytes diferentes)
    Evidence: .omo/evidence/task-5-watermark-applied.txt

  Scenario: CDR file bypasses watermark
    Tool: Bash (curl)
    Steps:
      1. Upload .cdr em folder='files'
      2. Verificar que o URL retornado é a chave privada (não imagem pública)
    Expected Result: CDR não é processado pelo Sharp
    Evidence: .omo/evidence/task-5-cdr-skip.txt

  Scenario: Graceful degradation on Sharp failure
    Tool: Bash
    Preconditions: Simular falha do Sharp (mock)
    Steps:
      1. Temporariamente tornar Sharp indisponível (ou mock)
      2. Upload PNG → deve retornar 200 com url, não 500
    Expected Result: Upload completa sem watermark mesmo com falha do Sharp
    Evidence: .omo/evidence/task-5-sharp-fallback.txt
  ```

  **Commit**: YES
  - Message: `feat(upload): add Sharp watermark pipeline for previews and gallery`

- [x] 6. Implementar API de carrinho (CRUD)

  **What to do**:
  - Criar `src/app/api/cart/route.ts` com:
    - **GET**: Listar carrinho do usuário logado com items populados + artwork + preços
      - Se não existir Cart, retornar `{ items: [], totalCents: 0 }`
    - **POST**: Adicionar item ao carrinho
      - Validar com `addToCartSchema`
      - Se Cart não existir, criar. Se existir, reutilizar.
      - Se item já existe no carrinho, retornar erro (não duplicar)
      - Verificar se artwork existe e está PUBLISHED
    - **DELETE**: Remover item do carrinho por `itemId`
      - Validar que o item pertence ao usuário
  - Criar `src/app/api/cart/[itemId]/route.ts` para DELETE específico
  - Retornar sempre o carrinho atualizado após cada operação
  - Incluir `totalCents` (soma dos priceCents dos itens) no response
  - Proteger todas as rotas com autenticação (CLIENT role apenas)
  - Escrever testes Vitet em `src/app/api/cart/route.test.ts`

  **Must NOT do**:
  - Não permitir adicionar arte gratuita ao carrinho (não precisa de compra)
  - Não permitir adicionar arte DRAFT/ARCHIVED
  - Não implementar guest cart ou merge-on-login

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (with T4, T5, T7, T8, T9, T10)
  - **Blocks**: T11 (Cart UI), T12 (Checkout)
  - **Blocked By**: T2, T3

  **Acceptance Criteria**:
  - [ ] GET /api/cart → 200 com `{ items: [], totalCents: 0 }` (carrinho vazio)
  - [ ] POST /api/cart `{ artworkId: "a1" }` → 201 com carrinho + item
  - [ ] POST /api/cart com artwork já existente → 409 (já no carrinho)
  - [ ] DELETE /api/cart/{itemId} → 200, item removido
  - [ ] POST sem auth → 401
  - [ ] POST com role FASE → 403 (só CLIENT pode comprar)
  - [ ] Testes passam: `npm test src/app/api/cart/route.test.ts`

  **QA Scenarios**:
  ```
  Scenario: Add and list cart items
    Tool: Bash (curl)
    Preconditions: Auth session (CLIENT role), artwork "a1" publicado
    Steps:
      1. curl -X POST /api/cart -d '{"artworkId": "a1"}' -b cookies
      2. Assert status 201, response.data.items.length === 1
      3. curl -X GET /api/cart -b cookies
      4. Assert response.data.items[0].artwork.id === "a1"
    Expected Result: Item adicionado e listado corretamente
    Evidence: .omo/evidence/task-6-cart-add.txt

  Scenario: Remove item from cart
    Tool: Bash (curl)
    Steps:
      1. POST /api/cart add item → get itemId
      2. DELETE /api/cart/{itemId} -b cookies
      3. GET /api/cart → items array vazio
    Expected Result: Item removido com sucesso
    Evidence: .omo/evidence/task-6-cart-remove.txt

  Scenario: Unauthenticated user rejected
    Tool: Bash (curl)
    Steps:
      1. POST /api/cart -d '{"artworkId": "a1"}' (sem cookie)
      2. Assert status 401
    Expected Result: 401 Unauthorized
    Evidence: .omo/evidence/task-6-cart-unauth.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add cart CRUD endpoints`

- [x] 7. Implementar API de cupons (admin CRUD + client validation)

  **What to do**:
  - Criar `src/app/api/admin/coupons/route.ts` (protegido ADMIN):
    - **GET**: Listar todos os cupons
    - **POST**: Criar cupom (validar com `createCouponSchema`)
      - Verificar unicidade do `code`
  - Criar `src/app/api/admin/coupons/[id]/route.ts`:
    - **PATCH**: Atualizar cupom (isActive, expiresAt, etc.)
    - **DELETE**: Remover cupom
  - Criar `src/app/api/cart/apply-coupon/route.ts`:
    - **POST**: Aplicar cupom ao carrinho atual
      - Validar com `applyCouponSchema`
      - Verificar: cupom existe, está ativo, não expirou, não excedeu maxUses
      - Calcular desconto e retornar `{ originalTotal, discount, finalTotal }`
    - **DELETE**: Remover cupom aplicado do carrinho (limpar couponCode)
  - Lógica de cálculo de desconto:
    - `PERCENTAGE`: `discount = totalCents * discountValue / 100`
    - `FIXED`: `discount = discountValue` (em centavos)
    - `minPurchaseCents`: se total < minPurchaseCents, erro
    - Desconto não pode exceder o total da compra
  - Lógica de validação server-side no checkout (T12):
    - Ao criar Order, verificar coupon novamente (não confiar no client)
    - Incrementar `usedCount` do Coupon na criação da Order
  - Escrever testes Vitest: `src/app/api/admin/coupons/route.test.ts`

  **Must NOT do**:
  - Não permitir aplicar cupom expirado
  - Não permitir aplicar cupom com maxUses excedido
  - Não confiar no valor do desconto vindo do client (recalcular server-side)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2
  - **Blocks**: T11 (cart UI mostra desconto), T12 (checkout aplica cupom), T15 (admin UI)
  - **Blocked By**: T2, T3

  **Acceptance Criteria**:
  - [ ] POST /api/admin/coupons → 201, cupom criado
  - [ ] POST /api/cart/apply-coupon com código válido → 200 com `{ discount, finalTotal }`
  - [ ] POST /api/cart/apply-coupon com código expirado → 400
  - [ ] POST /api/cart/apply-coupon com maxUses excedido → 400
  - [ ] Coupon PERCENTAGE com 15% em carrinho R$30 → desconto R$4.50
  - [ ] Testes passam

  **QA Scenarios**:
  ```
  Scenario: Create and apply percentage coupon
    Tool: Bash (curl)
    Preconditions: Admin auth
    Steps:
      1. POST /api/admin/coupons -d '{"code":"WELCOME15","discountType":"PERCENTAGE","discountValue":15}'
      2. POST /api/cart/add {artworkId: "a1"} (preço R$20) → totalCents = 2000
      3. POST /api/cart/apply-coupon -d '{"code":"WELCOME15"}' -b cookies
      4. Assert response.data.discount === 300 (15% de 2000 = 300 centavos = R$3)
      5. Assert response.data.finalTotal === 1700
    Expected Result: Cupom aplicado corretamente
    Evidence: .omo/evidence/task-7-coupon-apply.txt

  Scenario: Expired coupon rejected
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/coupons -d '{"code":"EXPIRED","discountType":"FIXED","discountValue":500,"expiresAt":"2020-01-01T00:00:00Z"}'
      2. POST /api/cart/apply-coupon -d '{"code":"EXPIRED"}' -b cookies
      3. Assert status 400, error message contém "expirado"
    Expected Result: Cupom expirado rejeitado
    Evidence: .omo/evidence/task-7-coupon-expired.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add coupon CRUD and validation endpoints`

- [x] 8. Implementar API de Coleções (admin CRUD)

  **What to do**:
  - Criar `src/app/api/collections/route.ts`:
    - **GET**: Listar coleções (com contagem de artworks)
    - **POST**: Criar coleção (validar com `createCollectionSchema`)
      - Gerar slug a partir do title
      - Apenas ADMIN pode criar
  - Criar `src/app/api/collections/[slug]/route.ts`:
    - **GET**: Detalhe da coleção com artworks populados (includes previewUrl, title, slug)
    - **PATCH**: Atualizar metadados da coleção (ADMIN)
    - **DELETE**: Remover coleção (ADMIN, não cascade em artworks)
  - Criar `src/app/api/collections/[slug]/items/route.ts`:
    - **POST**: Adicionar artwork à coleção (`{ artworkId, order? }`)
      - Validar com `addArtworkToCollectionSchema`
      - Verificar se artwork existe e não está duplicado na coleção
    - **DELETE**: Remover artwork da coleção (`{ artworkId }`)
  - Criar `src/app/api/collections/[slug]/items/reorder/route.ts`:
    - **PATCH**: Reordenar artworks da coleção (`{ items: [{ artworkId, order }] }`)
  - Criar `src/app/api/public/collections/route.ts` (público, sem auth):
    - **GET**: Listar coleções com artworks PUBLICADOS apenas (para vitrine)
  - Proteger rotas admin com `protectAdminRoute`
  - Escrever testes Vitest em `src/app/api/collections/route.test.ts`

  **Must NOT do**:
  - Não deletar artworks ao remover uma coleção
  - Não expor coleções com artworks DRAFT na API pública

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2
  - **Blocks**: T13 (Collections UI)
  - **Blocked By**: T2, T3

  **Acceptance Criteria**:
  - [ ] POST /api/collections → 201, coleção criada
  - [ ] POST /api/collections/[slug]/items → 201, artwork adicionada
  - [ ] GET /api/collections/[slug] → 200 com artworks populados
  - [ ] API pública só retorna artworks PUBLISHED
  - [ ] DELETE /api/collections/[slug] → 200, artworks NÃO são deletados
  - [ ] Testes passam

  **QA Scenarios**:
  ```
  Scenario: Create collection and add artwork
    Tool: Bash (curl)
    Preconditions: Admin auth, artwork "a1" exists
    Steps:
      1. curl -X POST /api/collections -d '{"title":"Paisagens","slug":"paisagens","description":"Coleção de paisagens"}'
      2. Assert status 201, response.data.slug === "paisagens"
      3. curl -X POST /api/collections/paisagens/items -d '{"artworkId":"a1"}'
      4. Assert status 201
      5. GET /api/collections/paisagens
      6. Assert response.data.artworks.length === 1
    Expected Result: Coleção criada e artwork adicionada
    Evidence: .omo/evidence/task-8-collection-create.txt

  Scenario: Public API hides non-published artworks
    Tool: Bash (curl)
    Steps:
      1. Criar collection com artwork DRAFT
      2. GET /api/public/collections (público)
      3. Assert collection aparece mas artwork draft não está na lista
    Expected Result: DRAFT artworks não expostos ao público
    Evidence: .omo/evidence/task-8-collection-public.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add collections CRUD endpoints`

- [x] 9. Implementar Full-Text Search com PostgreSQL (GIN + tsvector)

  **What to do**:
  - Criar script SQL em `prisma/fts-setup.sql`:
    ```sql
    -- Adicionar coluna tsvector para busca textual em português
    ALTER TABLE "Artwork" ADD COLUMN IF NOT EXISTS search_vector tsvector;

    -- Criar função de trigger para manter search_vector atualizado
    CREATE OR REPLACE FUNCTION artwork_search_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('portuguese', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('portuguese', COALESCE(NEW.description, '')), 'B');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger: atualiza search_vector em INSERT ou UPDATE
    DROP TRIGGER IF EXISTS artwork_search_trigger ON "Artwork";
    CREATE TRIGGER artwork_search_trigger
      BEFORE INSERT OR UPDATE OF title, description ON "Artwork"
      FOR EACH ROW EXECUTE FUNCTION artwork_search_update();

    -- Índice GIN para busca rápida
    CREATE INDEX IF NOT EXISTS artwork_search_idx ON "Artwork" USING GIN(search_vector);

    -- Popular search_vector para registros existentes
    UPDATE "Artwork" SET search_vector =
      setweight(to_tsvector('portuguese', COALESCE(title, '')), 'A') ||
      setweight(to_tsvector('portuguese', COALESCE(description, '')), 'B');
    ```
  - Executar script SQL via `npx prisma db execute` ou manualmente
  - Verificar se `search_vector` aparece no schema Prisma (pode precisar de `@@ignore` se não for managed)
  - Adicionar campo `search_vector Unsupported("tsvector")?` no schema Prisma ou tratar como raw query
  - Criar `src/app/api/artworks/search/route.ts` (ou modificar artworks route):
    - **GET** `?q=termo`:
      - Usar `$queryRaw` com:
        ```sql
        SELECT id, title, slug, description, "previewUrl", "priceCents", "isFree", "categoryId", "createdAt",
               ts_rank("search_vector", plainto_tsquery('portuguese', $1)) AS rank
        FROM "Artwork"
        WHERE "search_vector" @@ plainto_tsquery('portuguese', $1)
          AND status = 'PUBLISHED'
        ORDER BY rank DESC
        LIMIT 50
        ```
      - Retornar array de artworks com campo `rank`
      - Fazer JOIN com category e tags para manter compatibilidade com `ArtworkWithRelations`
  - Atualizar `src/app/api/artworks/route.ts` para aceitar `?fts=true&q=termo`:
    - Se `fts=true`, usar o novo endpoint de busca textual
    - Se não, manter o comportamento atual (contains/ILIKE)
  - Escrever testes Vitest para o endpoint de busca

  **Must NOT do**:
  - Não remover o endpoint de busca antigo (manter fallback)
  - Não buscar sem índices (GIN é obrigatório para performance)
  - Não usar `to_tsquery('simple')` — usar `'portuguese'`

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2
  - **Blocks**: T14 (FTS integration in loja)
  - **Blocked By**: T2

  **Acceptance Criteria**:
  - [ ] Script SQL executa sem erros
  - [ ] `curl "/api/artworks/search?q=natureza"` → retorna artworks com rank, ordenados por relevância
  - [ ] "natureza" encontra "natureza-morta" (stemming português)
  - [ ] Artworks DRAFT/ARCHIVED não aparecem nos resultados
  - [ ] Query sem resultados → 200 com `[]` (não 404)
  - [ ] Endpoint antigo `?search=termo` ainda funciona (fallback)

  **QA Scenarios**:
  ```
  Scenario: FTS search returns ranked results
    Tool: Bash (curl)
    Preconditions: Artworks com títulos "natureza-morta", "paisagem-tropical" existem e estão PUBLISHED
    Steps:
      1. curl "/api/artworks/search?q=natureza"
      2. Assert status 200
      3. Assert response.data[0].title contains "natureza"
      4. Assert response.data[0].rank > 0
    Expected Result: Resultados rankeados por relevância
    Evidence: .omo/evidence/task-9-fts-search.txt

  Scenario: Empty results return empty array
    Tool: Bash (curl)
    Steps:
      1. curl "/api/artworks/search?q=zzzzznothing"
      2. Assert status 200
      3. Assert response.data is array with length 0
    Expected Result: Array vazio no lugar de 404
    Evidence: .omo/evidence/task-9-fts-empty.txt

  Scenario: Legacy search still works
    Tool: Bash (curl)
    Steps:
      1. curl "/api/artworks?search=natureza"
      2. Assert status 200, success true
    Expected Result: Busca antiga continua funcionando
    Evidence: .omo/evidence/task-9-fts-legacy.txt
  ```

  **Commit**: YES
  - Message: `feat(search): add PostgreSQL full-text search with GIN indexes`

- [x] 10. Implementar API financeira com agregação temporal

  **What to do**:
  - Criar `src/app/api/admin/financeiro/route.ts` (protegido ADMIN):
    - **GET** `?period=30d` (default: últimos 30 dias):
      - `timeline`: Array de `{ date: string (YYYY-MM-DD), revenueCents: number, orderCount: number }`
      - Agregar por dia usando `paidAt` com `$queryRaw` ou Prisma groupBy
      - Dias sem vendas NÃO aparecem no array (otimização de payload)
    - **GET** `?period=monthly&year=2026`:
      - `monthlyRevenue`: Array de `{ month: number, revenueCents: number, orderCount: number }`
      - Agregar por mês
    - **GET** `?period=payment-distribution`:
      - `paymentDistribution`: Array de `{ method: string (pix | credit_card), count: number, totalCents: number, percentage: number }`
      - Fonte: `Order.paymentMethod` para pedidos PAID
    - **GET** `?period=peak-hours`:
      - `peakHours`: Array de `{ hour: number (0-23), dayOfWeek: number (0-6), count: number, revenueCents: number }`
      - Agregar por hora + dia da semana baseado em `paidAt`
    - Todos os endpoints retornam dados reais, não mockados
    - Usar `OrderItem.amountCents` para revenue (já que orders podem ter múltiplos itens)
  - Atualizar `src/app/api/admin/sales/route.ts` para usar OrderItems ao invés de Order.amountCents (consistência)

  **Must NOT do**:
  - Não retornar dados mockados (sempre do banco)
  - Não expor dados financeiros sem auth ADMIN

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2
  - **Blocks**: T16 (Charts UI)
  - **Blocked By**: T2, T3, T4 (precisa de OrderItems)

  **Acceptance Criteria**:
  - [ ] GET /api/admin/financeiro?period=30d → array de daily revenue (só dias com vendas)
  - [ ] GET /api/admin/financeiro?period=payment-distribution → pix + credit_card com percentuais
  - [ ] GET /api/admin/financeiro?period=peak-hours → agregação por hora + dia da semana
  - [ ] Período sem vendas → arrays vazios, não erro
  - [ ] GET sem auth ADMIN → 401/403

  **QA Scenarios**:
  ```
  Scenario: Revenue timeline for last 30 days
    Tool: Bash (curl)
    Preconditions: Admin auth, some PAID orders exist
    Steps:
      1. curl "/api/admin/financeiro?period=30d" -b admin_cookies
      2. Assert status 200
      3. Assert response.data.timeline is array
      4. Each entry has: date, revenueCents, orderCount
    Expected Result: Timeline de receita retornada
    Evidence: .omo/evidence/task-10-finance-timeline.txt

  Scenario: Empty period
    Tool: Bash (curl)
    Steps:
      1. curl "/api/admin/financeiro?period=30d&year=2019" -b admin_cookies
      2. Assert status 200
      3. Assert response.data.timeline.length === 0
    Expected Result: Arrays vazios para período sem vendas
    Evidence: .omo/evidence/task-10-finance-empty.txt

  Scenario: Unauthorized access
    Tool: Bash (curl)
    Steps:
      1. curl "/api/admin/financeiro" (sem auth)
      2. Assert status 401
    Expected Result: 401 Unauthorized
    Evidence: .omo/evidence/task-10-finance-unauth.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add financial aggregation endpoint for charts`

- [x] 11. Implementar UI do carrinho de compras

  **What to do**:
  - Criar `src/app/(public)/carrinho/page.tsx`:
    - Página de carrinho acessível em `/carrinho`
    - Lista de itens: preview, título, preço, botão remover
    - Resumo: subtotal, desconto (se cupom aplicado), total
    - Input para aplicar cupom + feedback de erro/sucesso
    - Botão "Finalizar compra" que inicia checkout (T12)
    - Estado vazio: mensagem + link para /loja
  - Modificar `src/components/artwork/ArtworkCard.tsx`:
    - Adicionar botão "Adicionar ao carrinho" no hover/card
    - Se arte já está no carrinho, mostrar "No carrinho ✓"
    - Se arte é gratuita ou usuário é FASE, não mostrar botão de carrinho
  - Modificar `src/app/loja/[slug]/page.tsx`:
    - Substituir botão "Comprar por R$ XX" por "Adicionar ao carrinho"
    - Manter lógica de "Já comprou" e "Download" para itens adquiridos
    - Adicionar feedback visual de "Adicionado ao carrinho"
  - Criar `src/hooks/useCart.ts`:
    - Hook `useCart()` que gerencia estado do carrinho (dados da API)
    - Funções: `addToCart`, `removeFromCart`, `applyCoupon`, `removeCoupon`, `clearCart`, `refreshCart`
    - Cache local para evitar refetch desnecessário
  - Adicionar indicador de quantidade no Header (ícone carrinho com badge)
  - Atualizar `src/components/layout/Header.tsx` com link para `/carrinho` e badge

  **Must NOT do**:
  - Não adicionar arte gratuita ao carrinho (redirect direto para download)
  - Não permitir adicionar arte DRAFT/ARCHIVED (só PUBLISHED)
  - Não implementar wishlist/salvar para depois

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3 (with T12, T13, T14, T15, T16)
  - **Blocks**: T12 (checkout precisa do carrinho UI)
  - **Blocked By**: T6 (cart API)

  **Acceptance Criteria**:
  - [ ] `/carrinho` mostra lista de itens do carrinho
  - [ ] Clicar "Adicionar ao carrinho" no card → item aparece no carrinho
  - [ ] Carrinho vazio mostra estado vazio com link para loja
  - [ ] Badge no header mostra quantidade de itens
  - [ ] Campo de cupom aceita código e mostra desconto
  - [ ] Remover item do carrinho → item some + total atualiza

  **QA Scenarios**:
  ```
  Scenario: Add item to cart from artwork page
    Tool: Playwright
    Preconditions: Client logado, artwork existe
    Steps:
      1. Navegar para /loja/[slug-do-artwork]
      2. Clicar "Adicionar ao carrinho"
      3. Ver toast/feedback "Adicionado ao carrinho"
      4. Navegar para /carrinho
      5. Ver item na lista
    Expected Result: Item aparece no carrinho
    Evidence: .omo/evidence/task-11-cart-add-ui.png

  Scenario: Empty cart state
    Tool: Playwright
    Steps:
      1. Navegar para /carrinho com carrinho vazio
      2. Ver mensagem "Seu carrinho está vazio"
      3. Ver link "Explorar catálogo" que leva a /loja
    Expected Result: Estado vazio com CTA
    Evidence: .omo/evidence/task-11-cart-empty.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add shopping cart page and add-to-cart buttons`

- [x] 12. Implementar checkout multi-item

  **What to do**:
  - Modificar `src/app/api/orders/route.ts` (POST):
    - Aceitar payload `{ artworkIds: string[], couponCode?: string }`
    - Validar todos os artworks (existem? PUBLISHED? não-free? já comprados?)
    - Criar Order com múltiplos OrderItems
    - Aplicar cupom se fornecido: validar + recalcular server-side + incrementar usedCount
    - Calcular `amountCents` da Order = soma dos items - desconto
    - Criar Preference do Mercado Pago com MÚLTIPLOS itens
    - Limpar carrinho do usuário após criação da Order
  - Modificar `src/lib/payments/mercadopago.ts`:
    - Atualizar `createPreference` para aceitar array de itens
    - Cada item: `{ title: artwork.title, quantity: 1, unit_price: artwork.priceCents/100, currency_id: 'BRL' }`
  - Atualizar `src/app/(public)/carrinho/page.tsx`:
    - Botão "Finalizar compra" chama POST /api/orders com artworkIds + couponCode
    - Redirecionar para initPoint do Mercado Pago
    - Estado de loading durante criação do checkout
  - Atualizar páginas de retorno: `/compra/sucesso`, `/compra/pendente`, `/compra/falha`
  - Escrever testes Vitest para multi-item checkout

  **Must NOT do**:
  - Não confiar no valor do desconto vindo do client (recalcular server-side)
  - Não permitir checkout se algum artwork já foi comprado
  - Não permitir checkout se cupom expirou ou excedeu usos no ínterim

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3
  - **Blocks**: None (último passo do fluxo)
  - **Blocked By**: T4 (order refactoring), T6 (cart API), T7 (coupons), T11 (cart UI)

  **Acceptance Criteria**:
  - [ ] POST /api/orders com `{ artworkIds: ["a1","a2"], couponCode: "WELCOME15" }` → 201 com initPoint
  - [ ] MP preference criada com 2 itens
  - [ ] Carrinho é limpo após checkout bem-sucedido
  - [ ] Se artwork já foi comprado → 409
  - [ ] Se cupom expirou entre apply e checkout → 400 com erro
  - [ ] Testes passam

  **QA Scenarios**:
  ```
  Scenario: Multi-item checkout creates MP preference with 2 items
    Tool: Bash (curl)
    Preconditions: Client auth, artworks a1 e a2 no carrinho
    Steps:
      1. POST /api/orders -d '{"artworkIds":["a1","a2"]}' -b cookies
      2. Assert status 201
      3. Assert response.data.initPoint starts with "https://"
      4. GET /api/cart -b cookies → items array vazio
    Expected Result: Checkout criado, MP preference gerada, carrinho limpo
    Evidence: .omo/evidence/task-12-checkout-multi.txt

  Scenario: Already purchased artwork rejected
    Tool: Bash (curl)
    Steps:
      1. Criar Order PAID para a1
      2. POST /api/orders -d '{"artworkIds":["a1"]}' -b cookies
      3. Assert status 409
    Expected Result: Recompra bloqueada
    Evidence: .omo/evidence/task-12-checkout-rebuy.txt
  ```

  **Commit**: YES
  - Message: `feat(checkout): implement multi-item checkout with MP preference`

- [x] 13. Implementar UI de Coleções (admin + público)

  **What to do**:
  - **Admin**: Criar `src/app/admin/colecoes/page.tsx`:
    - Listagem de coleções (tabela com título, slug, contagem de artes, ações)
    - Botão "Nova coleção" → formulário modal/página
    - Editar: nome, slug, descrição
    - Excluir: confirmar antes de remover
  - **Admin**: Criar `src/app/admin/colecoes/[slug]/page.tsx`:
    - Gerenciar artworks da coleção
    - Lista de artworks com ordenação (campo order numérico)
    - Adicionar artwork (buscar por nome e adicionar)
    - Remover artwork da coleção
  - **Público**: Modificar `src/app/loja/[slug]/page.tsx`:
    - Adicionar seção "Outras artes desta coleção" após o bloco de "Você também pode gostar"
    - Buscar coleções que contêm a artwork atual via `GET /api/public/collections?artworkId=xxx`
    - Para cada coleção, mostrar até 5 artworks da mesma
    - Usar `ArtworkCard` para exibir as artes relacionadas
  - **Público**: Criar `src/app/colecoes/[slug]/page.tsx`:
    - Página dedicada da coleção com grid de artworks
    - Header com título e descrição da coleção
    - Breadcrumb navegável
  - Adicionar link "Coleções" no admin sidebar (`src/components/admin/AdminSidebar.tsx`)
  - Escrever testes Vitest

  **Must NOT do**:
  - Não expor coleções vazias na página pública
  - Não permitir admin remover coleção que ainda tem artworks (soft delete ou warning)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3
  - **Blocks**: None
  - **Blocked By**: T8 (collections API)

  **Acceptance Criteria**:
  - [ ] /admin/colecoes lista todas as coleções
  - [ ] Admin pode criar, editar e excluir coleções
  - [ ] Admin pode adicionar/remover artworks de uma coleção
  - [ ] /loja/[slug] mostra "Outras artes desta coleção" se a arte pertence a alguma
  - [ ] /colecoes/[slug] mostra grid de artworks da coleção
  - [ ] Coleções vazias não aparecem na página pública

  **QA Scenarios**:
  ```
  Scenario: Admin manages collection
    Tool: Playwright
    Preconditions: Admin logado
    Steps:
      1. Navegar para /admin/colecoes
      2. Clicar "Nova coleção", preencher título "Verão 2025"
      3. Ver coleção na listagem
      4. Clicar na coleção → página de detalhe
      5. Adicionar artwork existente
      6. Ver artwork na lista
    Expected Result: CRUD de coleções funcional
    Evidence: .omo/evidence/task-13-collection-admin.png

  Scenario: Public collection block on artwork page
    Tool: Playwright
    Steps:
      1. Navegar para /loja/[slug-de-arte-em-coleção]
      2. Scroll para seção "Outras artes desta coleção"
      3. Ver grid de artworks relacionadas
    Expected Result: Bloco de coleção aparece na página de detalhe
    Evidence: .omo/evidence/task-13-collection-public.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add collection management and public collection block`

- [x] 14. Integrar Full-Text Search na página da loja

  **What to do**:
  - Modificar `src/hooks/useArtworkFilters.ts`:
    - Adicionar flag `useFTS` (boolean) que indica se deve usar o novo endpoint de FTS
    - Se `search` tem valor e `useFTS` é true, usar `/api/artworks/search?q=...`
    - Manter fallback: se FTS falhar, voltar para o filtro client-side atual
  - Modificar `src/hooks/useArtworks.ts`:
    - Se FTS está ativo, fazer fetch do endpoint de search ao invés de buscar todas
    - Processar resultados para manter compatibilidade com `ArtworkWithRelations`
    - Adicionar indicador de "Busca textual ativa" (badge ou tooltip)
  - Modificar `src/app/loja/page.tsx`:
    - Quando `filters.search` tem valor, integrar FTS
    - Mostrar resultados com indicação de relevância
    - Paginação server-side para resultados FTS (ao invés de client-side)
    - Se FTS retorna vazio, manter estado "Nenhuma arte encontrada"
  - Manter o filtro client-side para category/tag/isFree (não afetados pelo FTS)
  - Atualizar a barra de busca: adicionar hint "Busca inteligente com sinônimos"
  - Escrever teste para integração FTS

  **Must NOT do**:
  - Não remover a busca client-side (manter como fallback)
  - Não quebrar filtros de categoria/tag quando FTS está ativo

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3
  - **Blocks**: None
  - **Blocked By**: T9 (FTS API)

  **Acceptance Criteria**:
  - [ ] Digitar "natureza" na busca → resultados rankeados por relevância
  - [ ] Busca funciona com stemming: "floresta" encontra "florestas"
  - [ ] Filtros de categoria + FTS funcionam juntos (filtro aplicado APÓS busca)
  - [ ] Se FTS falha, busca client-side entra como fallback
  - [ ] Paginação funciona com resultados FTS

  **QA Scenarios**:
  ```
  Scenario: FTS search on loja page
    Tool: Playwright
    Steps:
      1. Navegar para /loja
      2. Digitar "natureza" na barra de busca
      3. Aguardar resultados (debounce 400ms)
      4. Ver artworks com "natureza" no título aparecendo primeiro
    Expected Result: Resultados rankeados por relevância
    Evidence: .omo/evidence/task-14-fts-loja.png

  Scenario: FTS + category filter
    Tool: Playwright
    Steps:
      1. Digitar "floresta" na busca
      2. Selecionar categoria "Paisagens"
      3. Resultados filtrados por ambos
    Expected Result: Filtros combinados funcionam
    Evidence: .omo/evidence/task-14-fts-filter.png
  ```

  **Commit**: YES
  - Message: `feat(search): integrate FTS search in loja page`

- [x] 15. Implementar UI admin de cupons

  **What to do**:
  - Criar `src/app/admin/cupons/page.tsx`:
    - Listagem de cupons em tabela: código, tipo, valor, usos (atual/limite), validade, status
    - Cores/ícones para status: ativo (verde), expirado (amarelo), inativo (cinza)
    - Botão "Novo cupom"
  - Criar modal/formulário para criar/editar cupom:
    - Campos: código, descrição, tipo (percentual/fixo), valor, valor mínimo, limite de usos, data de expiração, ativo
    - Validação Zod no frontend + server-side
  - Ações: ativar/desativar, editar, excluir
  - Adicionar link "Cupons" no admin sidebar (`src/components/admin/AdminSidebar.tsx`)
  - Escrever testes Vitest para o admin coupons page

  **Must NOT do**:
  - Não permitir criar cupom com código duplicado
  - Não permitir valor de desconto negativo ou zero

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3
  - **Blocks**: None
  - **Blocked By**: T7 (coupons API)

  **Acceptance Criteria**:
  - [ ] /admin/cupons lista todos os cupons
  - [ ] Admin pode criar cupom percentual com código único
  - [ ] Admin pode criar cupom fixo
  - [ ] Admin pode ativar/desativar cupom
  - [ ] Admin pode excluir cupom
  - [ ] Formulário valida campos obrigatórios

  **QA Scenarios**:
  ```
  Scenario: Create percentage coupon
    Tool: Playwright
    Preconditions: Admin logado
    Steps:
      1. Navegar para /admin/cupons
      2. Clicar "Novo cupom"
      3. Preencher código: "VERAO25", tipo: Percentual, valor: 25, limite: 100
      4. Salvar → ver cupom na listagem
      5. Ver badge "Ativo" verde
    Expected Result: Cupom criado e visível
    Evidence: .omo/evidence/task-15-coupon-create.png

  Scenario: Duplicate code rejected
    Tool: Playwright
    Steps:
      1. Tentar criar cupom com código já existente
      2. Ver mensagem de erro "Código já existe"
    Expected Result: Duplicidade rejeitada
    Evidence: .omo/evidence/task-15-coupon-duplicate.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add admin coupon management page`

- [x] 16. Implementar painel financeiro com gráficos Recharts

  **What to do**:
  - Modificar `src/app/admin/vendas/page.tsx`:
    - Adicionar filtro de período (select predefinido: "Últimos 7 dias", "Últimos 30 dias", "Este mês", "Personalizado")
    - Manter filtro mensal existente como opção "Mensal"
  - Criar componente `src/components/admin/charts/RevenueLineChart.tsx`:
    - Linha de receita ao longo do tempo
    - Usar Recharts `<ResponsiveContainer>`, `<LineChart>`, `<Line>`, `<XAxis>`, `<Tooltip>`
    - Eixo X: datas, Eixo Y: valores em R$
    - Tooltip formatado com `formatBRL()`
    - Dataset: `/api/admin/financeiro?period=30d` → `timeline[]`
  - Criar `src/components/admin/charts/PaymentDistributionChart.tsx`:
    - Pizza/donut de métodos de pagamento (Pix vs Cartão)
    - Usar Recharts `<PieChart>`, `<Pie>`, `<Cell>`, `<Legend>`
    - Cores: Pix (verde), Cartão (azul)
    - Dataset: `/api/admin/financeiro?period=payment-distribution`
  - Criar `src/components/admin/charts/PeakHoursHeatmap.tsx`:
    - Heatmap de dias da semana x horas do dia
    - Grid de 7x24 com cores indicando densidade
    - Dataset: `/api/admin/financeiro?period=peak-hours`
    - Pode usar Recharts custom ou grid CSS com cores
  - Integrar gráficos na página `/admin/vendas`:
    - Layout: linha superior (filtros), linha 1 (receita), linha 2 (pizza + heatmap lado a lado)
    - Todos os gráficos responsivos
    - Estado de loading: skeleton/spinner
    - Estado de vazio: "Nenhum dado para o período selecionado"
  - Atualizar sidebar do admin para incluir link para vendas (/admin/vendas) se não existir
  - Escrever testes Vitest para os componentes de gráfico (renderização)

  **Must NOT do**:
  - Não usar dados mockados (sempre do endpoint real)
  - Não quebrar a página /admin/vendas existente (adicionar ao invés de substituir)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 3
  - **Blocks**: None
  - **Blocked By**: T10 (financial API)

  **Acceptance Criteria**:
  - [ ] Gráfico de linha mostra receita diária dos últimos 30 dias
  - [ ] Gráfico de pizza mostra distribuição Pix vs Cartão
  - [ ] Heatmap mostra picos de compra por hora/dia
  - [ ] Filtro de período atualiza todos os gráficos
  - [ ] Período sem dados mostra "Nenhum dado" (não quebra)
  - [ ] Todos os gráficos são responsivos na viewport

  **QA Scenarios**:
  ```
  Scenario: Revenue chart renders with data
    Tool: Playwright
    Preconditions: Admin logado, vendas existentes
    Steps:
      1. Navegar para /admin/vendas
      2. Ver gráfico de linha "Receita" renderizado
      3. Ver tooltip ao passar mouse sobre ponto
      4. Ver valores formatados em R$
    Expected Result: Gráfico de linha funcional
    Evidence: .omo/evidence/task-16-chart-revenue.png

  Scenario: Payment distribution pie chart
    Tool: Playwright
    Steps:
      1. Navegar para /admin/vendas
      2. Ver gráfico de pizza com Pix e Cartão
      3. Ver legendas e percentuais
    Expected Result: Donut de pagamentos visível
    Evidence: .omo/evidence/task-16-chart-payment.png

  Scenario: Date filter updates charts
    Tool: Playwright
    Steps:
      1. Selecionar "Últimos 7 dias" no filtro
      2. Ver gráficos atualizarem com loading state
    Expected Result: Gráficos reativos ao filtro
    Evidence: .omo/evidence/task-16-chart-filter.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add Recharts financial dashboard to admin/vendas`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run the build, lint, and test commands. Review all changed files for: type suppression, empty catches, debug logging in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together). Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **T1**: `chore(deps): install sharp and recharts for watermark and charts`
- **T2**: `feat(db): add Cart, CartItem, Coupon, OrderItem, Collection models`
- **T3**: `feat(types): add Zod schemas and TypeScript types for new entities`
- **T4**: `feat(orders): refactor Order to support multi-item via OrderItem`
- **T5**: `feat(upload): add Sharp watermark pipeline for previews and gallery`
- **T6**: `feat(api): add cart CRUD endpoints`
- **T7**: `feat(api): add coupon CRUD and validation endpoints`
- **T8**: `feat(api): add collections CRUD endpoints`
- **T9**: `feat(search): add PostgreSQL full-text search with GIN indexes`
- **T10**: `feat(api): add financial aggregation endpoint for charts`
- **T11**: `feat(ui): add shopping cart page and add-to-cart buttons`
- **T12**: `feat(checkout): implement multi-item checkout with MP preference`
- **T13**: `feat(ui): add collection management and public collection block`
- **T14**: `feat(search): integrate FTS search in loja page`
- **T15**: `feat(ui): add admin coupon management page`
- **T16**: `feat(ui): add Recharts financial dashboard to admin/vendas`

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Expected: Build succeeds
npm run lint   # Expected: No errors
npm test       # Expected: All tests pass (existing + new)
npx prisma db push  # Expected: Schema syncs without errors
```

### Final Checklist
- [ ] All 5 features implemented and meeting their acceptance criteria
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (existing + new)
- [ ] Build succeeds on `npm run build`
- [ ] Evidence files in `.omo/evidence/` for all QA scenarios
