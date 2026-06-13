# Pendências — Marketplace (feat-marketplace-pagamento)

> Gerado automaticamente em 2026-06-05 com base na análise da
> `specs/feat-marketplace-pagamento.md` contra o código atual.

---

## ✅ O que já está implementado

| Item | Arquivo(s) |
|---|---|
| Schema Prisma (enum `Role.CLIENT`, `OrderStatus`, model `Order`, `Artwork.priceCents`) | `prisma/schema.prisma` |
| Auth: branch `CLIENT` no `authorize` | `src/lib/auth/config.ts` |
| Middleware: proteção de `/minhas-compras` para CLIENT/FASE/ADMIN | `middleware.ts` |
| `POST /api/auth/register` — auto-cadastro CLIENT | `src/app/api/auth/register/route.ts` |
| `POST /api/orders` — cria pedido + preference MP | `src/app/api/orders/route.ts` |
| `GET /api/orders` — lista pedidos do cliente logado | `src/app/api/orders/route.ts` |
| `GET /api/orders/[id]` — status do pedido (usado no polling de `/compra/sucesso`) | `src/app/api/orders/[id]/route.ts` |
| `POST /api/payments/webhook` — valida assinatura, idempotência, confere valor, aprova/falha | `src/app/api/payments/webhook/route.ts` |
| `GET /api/admin/sales` — receita, top artes, nichos, top clientes, pedidos recentes | `src/app/api/admin/sales/route.ts` |
| `POST /api/downloads` — nova regra com `canDownloadArtwork` (CLIENT só baixa se pagou) | `src/app/api/downloads/route.ts` |
| `POST /api/downloads/zip` — idem | `src/app/api/downloads/zip/route.ts` |
| `POST/PATCH /api/artworks` — aceita e valida `priceCents` | `src/app/api/artworks/route.ts` e `[id]/route.ts` |
| Página `/cadastro` — formulário de auto-cadastro | `src/app/cadastro/page.tsx` |
| Página `/minhas-compras` — lista de compras + re-download | `src/app/(public)/minhas-compras/page.tsx` |
| Página `/compra/sucesso` — polling via `GET /api/orders/[id]` (até 15 tentativas, ~45s) | `src/app/(public)/compra/sucesso/page.tsx` |
| Páginas `/compra/pendente`, `/compra/falha` | `src/app/(public)/compra/*/page.tsx` |
| Página `/loja/[slug]` — botão Comprar por role, polling de `hasPurchased` | `src/app/loja/[slug]/page.tsx` |
| Página `/admin/vendas` — análise completa com filtro por mês/ano | `src/app/admin/vendas/page.tsx` |
| `AdminSidebar` — item "Vendas" adicionado | `src/components/admin/AdminSidebar.tsx` |
| `Header` — item "Minhas Compras" para CLIENT | `src/components/layout/Header.tsx` |
| E-mail template `payment-confirmed.tsx` | `src/lib/email/templates/payment-confirmed.tsx` |
| `src/lib/payments/mercadopago.ts` — `createPreference`, `getPayment`, `verifyWebhookSignature` | `src/lib/payments/mercadopago.ts` |
| `src/lib/payments/access.ts` — `canDownloadArtwork` | `src/lib/payments/access.ts` |
| Validações Zod: `order.ts`, `auth.ts` (registerSchema) | `src/lib/validations/` |
| `.env.example` — variáveis `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | `.env.example` |
| Testes backend: `orders`, `downloads`, `webhook`, `register` | `*.test.ts` nas respectivas pastas |

---

## ❌ O que FALTA implementar

### 1. Deploy do schema no banco (BLOQUEANTE)

O schema já foi atualizado localmente (`prisma/schema.prisma`), mas **não foi sincronizado
com o banco Neon** em produção/staging.

**Ação:**
```bash
# Faça backup do banco antes!
npx prisma db push
npx prisma generate
```

> ⚠️ Confira se `DATABASE_URL` no `.env.local` aponta para o banco correto antes de rodar.
> Ver conversa anterior sobre o erro P1012.

---

### 2. Variáveis de ambiente de produção não configuradas

As variáveis abaixo existem no `.env.example` mas **precisam ser preenchidas no ambiente
de produção/staging** (Vercel, Neon, etc.) antes de qualquer teste real:

```env
MP_ACCESS_TOKEN=       # token privado sandbox/produção do Mercado Pago
MP_WEBHOOK_SECRET=     # secret gerado no painel do Mercado Pago
NEXT_PUBLIC_APP_URL=   # URL pública do app (já pode existir, confirme)
```

**Ação:** configurar no painel da Vercel (ou no `.env.local` para testes locais com
ngrok/Cloudflare Tunnel).

---

### 3. Webhook não cadastrado no Mercado Pago

A URL `/api/payments/webhook` ainda **não foi registrada no painel do Mercado Pago**.
Sem isso, nenhuma compra é confirmada automaticamente.

**Ação:**
1. Acesse o [Painel do Mercado Pago — Webhooks](https://www.mercadopago.com.br/developers/panel/app)
2. Cadastre a URL: `https://SEU_DOMINIO/api/payments/webhook`
3. Selecione o evento: **Pagamentos** (`payment`)
4. Copie o `MP_WEBHOOK_SECRET` gerado e coloque no `.env` de produção

---

### 4. Testes: `admin/sales` ausente

A spec §14 exige teste para `GET /api/admin/sales`. O arquivo
`src/app/api/admin/sales/route.ts` existe, mas **não há `route.test.ts` nessa pasta**.

**Ação:** criar `src/app/api/admin/sales/route.test.ts` cobrindo:
- Agregações de receita, top artes, categorias e clientes para um conjunto de pedidos PAGOS
- Filtro por mês/ano correto
- Requer ADMIN (403 para outros roles)

---

### 7. Testes de componente Frontend

A spec §14 menciona testes de componente (padrão `DownloadModal.test.tsx`):

- **Botão "Comprar" por role** na página `/loja/[slug]`:
  - VISITOR → "Entrar para comprar"
  - CLIENT sem compra → "Comprar por R$ X"
  - CLIENT com compra paga → "Baixar arte comprada"
  - FASE/ADMIN → "Liberar downloads"
- **Estados do formulário `/cadastro`**: loading / success / error

Checar se esses testes existem. Se não, criar conforme o padrão do repo.

---

### 8. Docs: atualizar `spec.md` e `PRD.md` (pós-conclusão)

Conforme regra §15 da spec e `CLAUDE.md`, ao finalizar a implementação:

- **`spec.md`:** adicionar role CLIENT, rotas novas (`/cadastro`, `/minhas-compras`,
  `/compra/*`, `/admin/vendas`), endpoints novos, campo `priceCents`, nova regra de
  download; marcar itens de pagamento do roadmap como concluídos.
- **`PRD.md`:** idem — Fase 2 (pagamento) deve ser marcada como concluída.

---

## 📋 Checklist de validação (Critérios de Aceitação)

Antes de considerar a feature concluída, verificar cada critério da spec §12:

- [ ] **CA-1:** Cliente consegue se cadastrar em `/cadastro`, logar e ver a loja com botão "Comprar por R$ 15,00"
- [ ] **CA-2:** Ao comprar, é redirecionado ao Mercado Pago; pagando em sandbox, o webhook marca o `Order` como PAGO e o cliente recebe e-mail
- [ ] **CA-3:** Antes do pagamento confirmado, download da arte fica bloqueado para o cliente
- [ ] **CA-4:** Após PAGO, cliente baixa os arquivos (URL assinada R2) e re-download está disponível em `/minhas-compras`
- [ ] **CA-5:** VISITOR nunca compra nem baixa; FASE/ADMIN continuam baixando de graça
- [ ] **CA-6:** Webhook: assinatura inválida rejeitada; reentrega não duplica pedido/e-mail; valor divergente não aprova
- [ ] **CA-7:** Preço sempre lido do servidor; manipular valor no cliente não altera a cobrança
- [ ] **CA-8:** `/admin/vendas` exibe receita total, nº de vendas, top artes, top categorias e top clientes
- [ ] **CA-9:** Admin define/edita preço por arte; default de novas artes é R$ 15,00
- [ ] **CA-10:** Todas as features novas têm testes passando (`npm test`)

---

## 🔢 Ordem de execução sugerida

```
1. Configurar variáveis de ambiente (MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET)
2. npx prisma db push  (sincronizar schema com Neon — fazer backup antes)
3. Checar/criar GET /api/orders/[id] (se ausente)
4. Testar localmente com sandbox do Mercado Pago + ngrok para webhook
5. Registrar URL do webhook no painel do Mercado Pago
6. Escrever testes ausentes (admin/sales, componentes frontend)
7. npm test  (garantir 100% passing)
8. Atualizar spec.md e PRD.md
```
