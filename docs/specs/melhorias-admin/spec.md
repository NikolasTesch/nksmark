# Spec — melhorias-admin

## Objetivo técnico
Adicionar refund total via API REST do Mercado Pago + endpoint admin com UI de confirmação, e
padronizar as listagens do admin com um wrapper de tabela responsivo, sem mudar o design desktop.

## Requisitos

### Funcionais
1. **RF-1 Camada MP.** `src/lib/payments/mercadopago.ts`: nova função
   `createRefund(paymentId, { amount?, idempotencyKey })` →
   `POST /v1/payments/{id}/refunds` com `X-Idempotency-Key` (UUID) e, sempre,
   `X-Render-In-Process-Refunds: true` (Pix pode responder `201 in_process` em vez de 400).
   Retorna `{ refundId, status }`.
2. **RF-2 Endpoint admin.** `POST /api/admin/orders/[id]/refund` (`protectAdminRoute`):
   exige `Order.status=PAID` e `mpPaymentId` presente; chama `createRefund` total;
   `approved` → `Order.status=REFUNDED` via `updateMany status:PAID` (idempotência);
   `in_process` → mantém `PAID`, grava flag `refundPending` e aguarda webhook.
   Erros do MP (2063/2024/4296) → 4xx com mensagem legível.
3. **RF-3 Webhook.** Estender `payments/webhook` (hoje só trata aprovação): em
   `action=payment.updated`, fazer `GET /v1/payments/:id` e, se `status="refunded"`,
   aplicar `Order → REFUNDED` + limpar flag. Sem topic dedicado de refund — é o mecanismo oficial.
4. **RF-4 UI admin.** Em `/admin/vendas` (detalhe de pedido): botão "Estornar" com Dialog de
   confirmação (mostra valor, cliente, arte), feedback via toast (da spec `ui-feedback-polish`),
   badge "Estornado"/"Estorno pendente".
5. **RF-5 Revogação automática.** `canDownloadArtwork` (`lib/payments/access.ts`) só concede com
   `Order PAID` — verificar por teste que `REFUNDED` bloqueia `/api/downloads` e `/zip` (sem mudança de código, apenas evidência).
6. **RF-6 Tabela responsiva.** Criar `src/components/admin/DataTable.tsx` (thead+tbody com
   wrapper `overflow-x-auto`, breakpoint md: colunas secundárias ocultáveis via prop
   `hideOnMobile`, estados vazios/erros herdados de `EmptyState`). Migrar `/admin/colecoes`,
   `/admin/usuarios`, `/admin/cupons`, `/admin/downloads` e a listagem de `/admin/vendas` para ele.
   `/admin/artes` (grid) fora.
7. **RF-7 Docs.** Remover a nota obsoleta do `CLAUDE.md` sobre "aba Filtros pendente" em
   `/admin/conteudo` (já implementada com dnd-kit, verificado em `conteudo/page.tsx:397`).

### Não-funcionais
- RFN-1: Estorno é operação de dinheiro: audit log — gravar `adminId` solicitante e `mpRefundId`
  no Order (colunas novas, ver modelagem).
- RFN-2: Toda chamada ao MP com timeout 10s e sem retry automático (idempotency key protege retry manual).
- RFN-3: Sem SDK novo — manter REST fetch como o resto da camada (não adicionar `mercadopago` npm por uma chamada).

## Modelagem de Dados & Contratos de API
```prisma
model Order {
  // ...atual
  mpRefundId    String?   @unique
  refundPending Boolean   @default(false)
  refundedById  String?   // userId do admin
  refundedAt    DateTime?
}
```
- `POST /api/admin/orders/[id]/refund` → `{ ok, status: 'refunded'|'refund_pending', message }`
- Contrato MP: `POST /v1/payments/{id}/refunds` body `{}` (total) | `{ "amount": X }` (parcial,
  adiado); respostas 200/201 (`approved`/`in_process`), 400 (2063 estado inválido / 3024 parcial
  não suportado), 404 (2024 antigo / 4296 já estornado).
- Sincronizar Prisma ↔ Zod (`lib/validations`) ↔ UI (skill `schema-contract-sync`).

## Critérios de Aceite & Casos de Teste
- **CA-1** Pedido PAID com `mpPaymentId` → estornar no admin → MP `approved` → Order `REFUNDED`,
  `mpRefundId`/`refundedById`/`refundedAt` gravados, cliente perde download imediatamente.
- **CA-2** Pix `in_process` → UI mostra "Estorno pendente"; webhook `payment.updated`
  (`refunded`) consolida para `REFUNDED`.
- **CA-3** Dobro-clique/replay → `updateMany` condicionado + `X-Idempotency-Key` → um único refund.
- **CA-4** Order sem `mpPaymentId` ou `PENDING` → 409 com explicação; botão nem aparece na UI.
- **CA-5** Erro MP 4296 (já estornado) → marca `REFUNDED` localmente sem duplicar.
- **CA-6** `npm run test`: `route.test.ts` do refund (fetch mockado) + teste de access pós-refund +
  DataTable snapshot.
- **CA-7** `/admin/colecoes` e afins: sem scroll horizontal em 390px; colunas secundárias ocultas no mobile.

## Non-goals (técnicos)
- Estorno parcial por `amount` (API já suporta na camada; UI/explicações ficam para v2).
- Fila/retry automático para `in_process`.
- Permissão granular de estorno por cargo (só ADMIN por enquanto, como todo o /admin).
