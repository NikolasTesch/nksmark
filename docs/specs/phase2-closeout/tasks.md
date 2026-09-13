# Tasks — phase2-closeout

## Ambiente de produção
- [ ] T-1 Conferir `DATABASE_URL` de produção (Neon) e rodar `prisma db push`
- [ ] T-2 Aplicar `prisma/fts-setup.sql` no banco de produção e validar `search_vector` populado (1 query de teste)
- [ ] T-3 Definir `RESEND_API_KEY` real no env de produção (remover dependência do default `re_placeholder`)

## Mercado Pago
- [ ] T-4 Registrar notification URL `/api/payments/webhook` no painel MP (produção) com `MP_WEBHOOK_SECRET` configurado
- [ ] T-5 Smoke: pagar sandbox → confirmar `Order=PAID` em produção, `paidAt`, e e-mail entregue
- [ ] T-6 Smoke: reenviar mesmo webhook (retry) → status inalterado (idempotência)
- [ ] T-7 Smoke: webhook sem `x-signature` válida → 401 sem efeito

## Testes
- [x] T-8 Rodar `npm run test` completo; zerar falhas
- [x] T-9 Revisar `src/app/api/admin/sales/route.test.ts`: cobre mês/ano, avgTicket, topArtworks, distribuição? Complementar gaps triviais

## Docs
- [x] T-10 `CLAUDE.md`: corrigir notas obsoletas (aba Filtros implementada; Analytics importado em `src/app/layout.tsx`; zip implementado)
- [ ] T-11 Converter `docs/specs/active/feat-marketplace-pendencias.md` em checklist verificado e mover para `docs/specs/archive/`
- [x] T-12 Atualizar status de `feat-download-zip-multi-arquivo`/`feat-marketplace-pagamento` conforme estado real

## Encerramento
- [ ] T-13 Verificar eventos reais do Vercel Analytics no dashboard de produção
- [ ] T-14 Rodar skill `env-guard` antes do commit final
- [ ] T-15 Marcar Fase 2 como concluída no `PRD.md` (roterização de pendências restantes para as novas specs)
