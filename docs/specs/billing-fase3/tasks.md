# Tasks — billing-fase3

## Gate de decisão (humano — antes de qualquer Apply)
- [ ] T-0.1 **ADR-1 fiscal**: direção aprovada = **NFS-e (serviço)**. Caminho de emissão em decisão final (Emissor Nacional gov.br direto vs API Notaas Free — ver pesquisa set/2026: ambos exigem e-CNPJ A1 ~R$165/ano; nacional exige mTLS+XMLDSIG e município habilitado). Confirmar município do CNPJ.
- [x] T-0.2 **ADR-2 produto**: DECIDIDO — plano único do acervo, **tudo do acervo, R$ 29,90/mês**, cancelamento quando quiser **sem** reembolso do ciclo vigente
- [ ] T-0.3 Criar o plano no MP (`preapproval_plan`) no painel de produção/sandbox e anotar `plan_id` — *nota: pode ser eliminado; criar `/preapproval` inline com `auto_recurring` (padrão vigente do MP) dispensa plan_id no painel*

## Frente B — Assinatura (executável após T-0.2/T-0.3)
- [x] T-1 Model `Subscription` no schema + relation `User` + `db push` dev
- [x] T-2 `src/lib/payments/preapproval.ts`: `createPreapproval`, `getPreapproval`, `cancelPreapproval` (REST fetch) + unit tests com fetch mock
- [x] T-3 `POST /api/subscriptions/checkout` (cria registro `pending` + `/preapproval` com external_reference) + `GET /api/subscriptions/me` + `POST /api/subscriptions/me/cancel` (+ testes de rota)
- [x] T-4 Webhook: tratar `type=subscription_preapproval` (espelha status) e `payment` com `subscription_id` (estende `currentPeriodEnd`, idempotente) + testes de replay
- [x] T-5 `/assinatura/retorno`: consolida status via `GET /preapproval/{id}` + página `/assinatura` (estados vazio/ativa/cancelada, CTAs)
- [x] T-6 `canDownloadArtwork`: cláusula de assinatura `authorized` vigente → libera acervo; testes da matriz (sem compra+sem assinatura = 403; com assinatura = ok; expirada = 403)
- [ ] T-7 Middleware/RBAC: garantir que `/assinatura` exige sessão; smoke completo no sandbox MP (Pix Automático + cartão)
- [ ] T-8 Admin: card de assinantes ativos em `/admin/metricas` (count `authorized`) — trivial
- [ ] T-9 `.env.example` + env-guard (`MP_ACERVO_PLAN_ID` etc.)

## Frente A — Documento fiscal (executável SOMENTE após T-0.1)
- [ ] T-10 Adapter `src/lib/fiscal/` com interface `issueDocument` + provedor escolhido (SDK/REST do fornecedor)
- [ ] T-11 Colunas `fiscalStatus/fiscalUrl/fiscalNumber` em `Order` + sync Zod/UI (`schema-contract-sync`)
- [ ] T-12 Emissão assíncrona pós-aprovação no webhook (fire-and-forget com retry manual no admin) + botão Emitir/reemitir em `/admin/vendas`
- [ ] T-13 Cancelamento/ajuste no caminho de refund (liga com `melhorias-admin` T-6)
- [ ] T-14 Template/link de documento no e-mail de confirmação
- [ ] T-15 Sandbox do provedor: 1 NF emitida + 1 cancelada, anexos no ADR-1

## Encerramento
- [ ] T-16 `npm run test` completo; smoke mobile da página `/assinatura`
- [ ] T-17 Registrar ADRs aprovados em `docs/decisions/` e atualizar `CLAUDE.md`/`PRD.md`
