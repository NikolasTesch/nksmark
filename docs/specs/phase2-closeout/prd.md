# PRD — phase2-closeout

> **Status:** 🟡 **CÓDIGO CONCLUÍDO / OPS EM PRODUÇÃO PENDENTE**  
> **Data:** 2026-09-17  
> **Evidências:** Código e testes da Fase 2 estão 100% finalizados (315 testes verdes). Restam validações operacionais de produção (webhook real e script SQL de FTS no Neon).

## Problema
A Fase 2 (marketplace) está com o código concluído, mas itens operacionais de fechamento
não foram feitos e a documentação diverge do código real:

- `docs/specs/active/feat-marketplace-pendencias.md` segue "pendente" sem checklist de
  verificação (deploy do schema no Neon, webhook MP registrado, testes de `GET /api/admin/sales`).
- `CLAUDE.md` afirma que a aba "Filtros" de `/admin/conteudo` e o Analytics estão pendentes —
  **a aba já existe** (drag-and-drop dnd-kit em `src/app/admin/conteudo/page.tsx`, aba `filters`)
  e `@vercel/analytics` **já está importado** em `src/app/layout.tsx`.
- `docs/specs/archive/feat-download-zip-multi-arquivo.md` trata como pendente/active uma API
  (`/api/downloads/zip`) que já está implementada e testada.

Sem isso, não há como declarar a Fase 2 "no ar" com evidência, e novos devs/IA partem de um
mapa errado.

## Persona afetada
- Mantenedor do projeto (você) e qualquer agente IA que leia `CLAUDE.md`/`docs/` como fonte de verdade.
- Cliente final: indiretamente (pagamentos só fecham de verdade com webhook em produção).

## Métricas de sucesso
- 1 pagamento real aprovado em produção → `Order.status=PAID` + e-mail transacional recebido.
- Testes Vitest passando em CI/local (`npm run test` verde, incluindo cobertura de `GET /api/admin/sales`).
- Zero divergências documentadas: `CLAUDE.md` e `docs/specs/active/` consistentes com o código.
- `docs/specs/active/feat-marketplace-pendencias.md` movida para `archive/`.

## Fora de escopo (produto)
- Qualquer feature nova (refund, favoritos persistidos, busca server-side têm specs próprias).
- Melhoria de testes além de confirmar/fechar o que a pendência já lista.
- Configuração de Billing/planos no Mercado Pago (produção) além do registro do webhook.
