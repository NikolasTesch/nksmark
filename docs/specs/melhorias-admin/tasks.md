# Tasks — melhorias-admin

## Camada de pagamento
- [x] T-1 `createRefund(paymentId, opts)` em `src/lib/payments/mercadopago.ts` (headers idempotency + in-process, timeout 10s)
- [x] T-2 Unit test de `createRefund` com fetch mockado (approved / in_process / 4296)
- [x] T-3 Migration Prisma: `mpRefundId`, `refundPending`, `refundedById`, `refundedAt` em `Order` + `db push` dev
- [x] T-4 `src/app/api/admin/orders/[id]/refund/route.ts` (`protectAdminRoute`, transição `updateMany` idempotente, mapeamento de erros MP)
- [x] T-5 `route.test.ts` do endpoint (PAID→refunded, in_process→pending, sem mpPaymentId→409, replay)
- [x] T-6 Webhook: tratar `payment.updated` com `status="refunded"` → consolidar Order + limpar `refundPending` + teste
- [x] T-7 Teste de revogação: download/zip bloqueados após REFUNDED (`access.ts` / `api/downloads`)

## UI admin
- [x] T-8 `/admin/vendas`: botão "Estornar" + Dialog de confirmação + badges "Estornado"/"Estorno pendente" (integra toast da spec ui-feedback-polish)
- [x] T-9 Feedback de erro do endpoint no dialog (mensagem legível do MP)

## Tabelas responsivas
- [x] T-10 `src/components/admin/DataTable.tsx` (overflow-x-auto, `hideOnMobile`, vazio com `EmptyState`)
- [x] T-11 Migrar `/admin/colecoes`; smoke mobile 390px
- [x] T-12 Migrar `/admin/usuarios`, `/admin/cupons`, `/admin/downloads`
- [x] T-13 Listagem de `/admin/vendas` no DataTable
- [x] T-14 Snapshot/SmokeTest do DataTable + checagem `npm run test`

## Docs
- [x] T-15 `CLAUDE.md`: remover nota obsoleta da aba Filtros; registrar refund + DataTable no mapa
- [x] T-16 Revisar coluna de estorno em `/minhas-compras` (label "Estornado" agora com estado real)
