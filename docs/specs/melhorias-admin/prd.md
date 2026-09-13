# PRD — melhorias-admin

## Problema
Dois furos operacionais no admin hoje:

1. **Sem estorno.** O enum `OrderStatus` tem `REFUNDED`, a UI de compras rotula "Estornado", mas
   **nenhum código produz esse estado** — zero chamadas de refund em `src/lib/payments/` e nas
   rotas admin. Problema de pagamento (cliente não baixou, arte com defeito, compra duplicada)
   só se resolve manualmente no painel do Mercado Pago, fora do sistema, sem registro.
2. **Tabelas admin não responsivas.** `/admin/colecoes` usa `<table>` raw inline
   (`page.tsx:341`), `/admin/artes` usa grid de cards, `/admin/usuarios`, `/admin/cupons`,
   `/admin/downloads` cada um com markup próprio de tabela/lista. Não existe componente de
   tabela compartilhado em `src/components/shared/`. No celular (o dispositivo do dono que
   precisa aprovar algo rápido) quebra horizontalmente.

## Persona afetada
ADMIN (time interno) resolvendo suporte/pagamento; o negócio (auditoria de estornos).

## Métricas de sucesso
- Estorno executável em ≤2 cliques no admin, com o `Order` refletindo `REFUNDED` automaticamente
  (via API + webhook), e download do cliente revogado no mesmo instante.
- Todas as telas de listagem do admin utilizáveis em viewport 390px sem overflow horizontal.
- 100% dos estornos registrados no sistema (não apenas no painel MP).

## Fora de escopo (produto)
- Estorno parcial por item de carrinho (v1: estorno total do pagamento; parcial fica documentado como extensão).
- Reembolso self-service pelo cliente (continua sendo decisão do admin).
- Chargeback/contestação automática (webhook próprio do MP — não tratado aqui).
- Redesenho visual do admin.
