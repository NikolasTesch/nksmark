# Spec — phase2-closeout

> **Status:** 🟡 **CÓDIGO CONCLUÍDO / OPS EM PRODUÇÃO PENDENTE**  
> **Data:** 2026-09-17  
> **Evidências:** Cobertura de testes concluída (T-8 e T-9 verdes). Itens pendentes são operacionais em painéis externos (T-1 a T-7).

## Objetivo técnico
Fechar os 4 itens operacionais da Fase 2 (schema no Neon, webhook MP, testes restantes,
Analytics verificado) e reconciliar `CLAUDE.md`/`docs/specs/` com o código, para que a Fase 2
seja declarada concluída com evidência e o mapa do repo volte a ser confiável.

## Requisitos

### Funcionais
1. **RF-1 Schema no Neon**: `prisma db push` aplicado no `DATABASE_URL` de produção;
   `search_vector`/índice FTS criados via `prisma/fts-setup.sql` no banco de produção
   (coluna não declarada no schema Prisma — migration manual é o caminho atual).
2. **RF-2 Webhook MP registrado**: notification URL `https://<domínio-prod>/api/payments/webhook`
   cadastrada no painel Mercado Pago com a assinatura (`verifyWebhookSignature` HMAC-SHA512/256
   já implementada em `src/lib/payments/mercadopago.ts`), e `MP_WEBHOOK_SECRET` no env de produção.
3. **RF-3 Testes restantes**: confirmar que `src/app/api/admin/sales/route.test.ts` (já existe) cobre
   o contrato de `GET /api/admin/sales`; rodar suíte completa e zerar falhas.
4. **RF-4 Analytics**: verificar eventos reais do `@vercel/analytics` (já importado em
   `src/app/layout.tsx`) no dashboard do projeto em produção; nada a codar se confirmado.
5. **RF-5 Higiene de docs**:
   - `CLAUDE.md`: remover notas obsoletas (aba Filtros "pendente", Analytics "não configurado",
     zip "Fase 2 futura") e registrar estado real.
   - `docs/specs/active/feat-marketplace-pendencias.md`: virar checklist verificado e mover a
     `docs/specs/archive/` ao concluir.
   - `feat-download-zip-multi-arquivo.md` / `feat-marketplace-pagamento.md`: garantir que estão
     arquivadas conforme o estado real (zip: implementado e testado).
6. **RF-6 Smoke de produção**: compra sandbox → aprovação → status `PAID` no admin →
   e-mail de confirmação (`payment-confirmed.tsx`) entregue (exige `RESEND_API_KEY` real;
   hoje o default é `re_placeholder` em `src/lib/email/resend.ts`).

### Não-funcionais
- RFN-1: Nenhuma alteração de código de aplicação é esperada além de fixes que os testes/smoke
  revelarem; se houver, devem ser triviais e apontados na review.
- RFN-2: Credenciais/segredos só via env (validar com skill `env-guard` ao final).

## Modelagem de Dados & Contratos de API
Sem mudanças. Contrato envolvido (já implementado, só validar em prod):
- `POST /api/payments/webhook` — valida `x-signature`, trata `type=payment`, idempotente via
  `updateMany ... status: PENDING`, aprovacao confere `amountCents`, erro de processamento → 502 (retry MP).

## Critérios de Aceite & Casos de Teste
- **CA-1** Dado um pagamento aprovado no MP sandbox, quando o webhook chega à URL de produção,
  então o `Order` fica `PAID`, `paidAt` preenchido e o cliente recebe e-mail.
- **CA-2** Dado um webhook duplicado (retry do MP), quando processado 2x, então não há mudança
  dupla de status (idempotência).
- **CA-3** Dado um request ao webhook sem assinatura válida, então `401` e log sem efeito.
- **CA-4** `npm run test` verde em checkout limpo apontando para banco de teste.
- **CA-5** grep em `CLAUDE.md` + `docs/specs/` não encontra mais afirmação desatualizada sobre
  filtros, analytics ou zip.

## Non-goals (técnicos)
- Trocar `db push` por migrations formais do Prisma (decisão separada; pode virar ADR depois).
- Refatorar a camada de pagamentos.
- Configurar Sentry/observabilidade nova.
