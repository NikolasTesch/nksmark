# Spec — billing-fase3

> **Status:** 🟡 **PARCIAL / HÍBRIDO**  
> **Data:** 2026-09-17  
> **Frente A (Documento Fiscal):** 🔴 **Não Implementado** — Nenhuma linha de código ou modelo fiscal criado.  
> **Frente B (Assinatura do Acervo):** 🟢 **Implementado no Código (Pendências de Produção/Admin)** — `Subscription`, rotas de checkout, webhook e liberação de downloads cobertos por testes unitários.

## Objetivo técnico
Duas frentes independentes, uma spec de direção cada, **gateadas por decisão externa** antes do Apply:
(1) documento fiscal por pedido via provedor de emissão (decisão do contador + ADR de fornecedor);
(2) assinatura recorrente do acervo via Mercado Pago Preapproval (`/preapproval_plan` +
`/preapproval`, checkout hospedado `init_point`, Pix Automático disponível), concedendo acesso
estilo-FASE enquanto ativa, sem tocar no enum `Role`.

## Decisões pendentes (bloqueiam Apply — registrar como ADR em `docs/decisions/`)
- **ADR-1 (fiscal):** tipo de documento (NF-e / NFS-e / recibo), regime tributário e fornecedor
  de emissão (ex.: eNotas, Bling, Focus NFe — API + preço + certificação digital).
  **Nenhuma linha de código fiscal antes deste ADR aprovado.**
- **ADR-2 (produto):** nome/valor/periodicidade do plano do acervo; o que exatamente o assinante
  baixa (tudo? exceto lançamentos VIP?); política de cancelamento/estorno do ciclo vigente.

## Requisitos

### Não-funcionais (aplicam-se a ambos)
- RFN-1: Dinheiro → mesma disciplina do webhook atual: assinatura validada (`verifyWebhookSignature`),
  idempotência por `updateMany` condicionado, 502 em erro de processamento para retry do MP.
- RFN-2: Toda operação MP na camada `src/lib/payments/` com REST fetch puro (padrão do repo;
  SDK npm `mercadopago@3` existe e cobre refund/preapproval, mas adicionar por 2 endpoints não vale o bundle).
- RFN-3: env-guard: novas chaves (`MP_*` de plano, credenciais do provedor fiscal) documentadas
  em `.env.example`; nada hardcoded.

### Frente A — Documento fiscal (esqueleto; detalhes após ADR-1)
- RF-A1: Adapter `src/lib/fiscal/` com interface única `issueDocument(order): Promise<{ status, url? }>`
  implementada pelo provedor escolhido. Ordem só emite com `status=PAID`.
- RF-A2: Colunas em `Order`: `fiscalStatus` (`none|issued|error|cancelled`), `fiscalUrl String?`,
  `fiscalNumber String?`. Emissão dispara no webhook de aprovação (async, nunca bloqueia o 200)
  + botão "Emitir/reemitir" no `/admin/vendas`.
- RF-A3: Cancelamento/ajuste quando `Order → REFUNDED` (integra spec `melhorias-admin`).
- RF-A4: Link do documento no e-mail `PaymentConfirmedEmailTemplate` (novo template fiscal quando pronto).

### Frente B — Assinatura do acervo (especificável já; sem ADR-2 não)
- RF-B1: `POST /api/subscriptions/checkout` (usuário logado): cria `/preapproval` no MP com
  `preapproval_plan_id` (plano fixo em env `MP_ACERVO_PLAN_ID`), `external_reference = userId`,
  `back_url` `/assinatura/retorno` → redireciona ao `init_point`. Assinatura local em
  `status: 'pending'` antes do redirect.
- RF-B2: Webhook: tratar `type=subscription_preapproval` (autorizou/pausou/cancelou → espelha
  `Subscription.status`) e `type=payment` com `subscription_id` (renovação → atualiza
  `currentPeriodEnd`; pagamento aprovado estende ciclo, rejeitado mantém status MP manda).
- RF-B3: Acesso: `canDownloadArtwork` ganha cláusula "assinatura `authorized` e ciclo vigente →
  baixa tudo" (mesma semântica FASE). O lookup já é por userId na sessão — 1 query `findUnique` a mais,
  cacheável se doer.
- RF-B4: Superfície usuário: página `/assinatura` (estado: sem plano / ativa com vencimento /
  cancelada) com CTA assinar, "gerenciar no Mercado Pago" e cancelamento local que chama
  `PUT /preapproval/{id}` `status=canceled` (botão "Cancelar assinatura" com confirmação).
- RF-B5: `back_url` `/assinatura/retorno` consolida o status com `GET /preapproval/{id}`
  (não confiar em query param).
- RF-B6: Admin: contagem de assinantes ativos na tela de usuários/metricas (sem dashboard próprio v1).

## Modelagem de Dados & Contratos de API
```prisma
model Subscription {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  mpPreapprovalId String   @unique
  status          String // 'pending'|'authorized'|'paused'|'cancelled'
  currentPeriodEnd DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
// Order: + fiscalStatus/fiscalUrl/fiscalNumber (Frente A)
```
Contratos internos:
- `POST /api/subscriptions/checkout` → 302/`{ initPoint }`; `GET /api/subscriptions/me` → estado.
- `POST /api/subscriptions/me/cancel` → espelha MP.
- MP usados: `POST /preapproval` (+`/preapproval_plan` admin-criado no painel), `GET /preapproval/{id}`,
  `PUT /preapproval/{id}` `{"status":"canceled"}`, `POST /v1/payments/{id}/refunds` (cancelamento
  do ciclo vigente se ADR-2 decidir reembolso).
- Sync Prisma ↔ Zod ↔ UI via `schema-contract-sync` em cada coluna nova.

## Critérios de Aceite & Casos de Teste
- **CA-1** Usuário assina no sandbox → MP `authorized` → webhook cria/liga `Subscription`;
  download de arte NÃO comprada passa a ser liberado; cancelar → bloqueio imediato.
- **CA-2** Webhook de renovação duplicado (`payment.created` do mesmo payment id) → `currentPeriodEnd`
  avança uma única vez (idempotente por `mpPaymentId` já unique em Order? criar `ProcessedEvent` se necessário — decisão no Apply com ADR-2).
- **CA-3** Retorno ao `back_url` com assinatura pendente → consolida status sem confiar no query.
- **CA-4** (A) Pedido PAID → documento emitido pelo provedor em sandbox do fornecedor → `fiscalUrl`
  válida no e-mail; refund → documento cancelado/ajustado.
- **CA-5** `npm run test`: rotas de assinatura (checkout/me/cancel) com fetch mock, cláusula de
  access com assinatura ativa/expirada.

## Non-goals (técnicos)
- Billing portal do MP embed, dunning multi-etapa, tentativas de cobrança alternativas.
- Cupons recorrentes, planos múltiplos, upgrade/downgrade.
- Emissão fiscal sem ADR-1 (proibido por design desta spec).
