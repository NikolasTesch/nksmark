# PRD — billing-fase3

## Problema
O `PRD.md` lista estes remainders da Fase 2 que travam a operação comercial fora do MVP:

- **Nota fiscal**: vendas emitidas via Pix/cartão não têm NF; a empresa precisa emitir documento
  fiscal por venda para o cliente (hoje o cliente recebe só o e-mail de confirmação de pagamento).
  Decisão de domínio contábil pendente: NF-e produto vs. NFS-e serviço vs. simples cupom/recibo
  digital para item digital — exige parecer do contador ANTES de código.
- **Assinatura/recorrência**: o papel atual é binário (compra avulsa CLIENT × acervo total FASE).
  Não existe produto autoatendido entre eles — venda recorrente (assinatura mensal do acervo),
  que é o modelo natural de um catálogo de artes para sublimação.

## Persona afetada
- Cliente PJ que precisa de NF para creditar insumo.
- Cliente recorrente (estamparia pequena) que quer "baixar tudo" sem negociar acesso FASE manual.
- ADMIN/time financeiro (conciliação de recorrência, cancelamentos, NF emitidas).

## Métricas de sucesso
- 100% dos pedidos PAID com documento fiscal disponível ao cliente (NF-e/NFS-e ou recibo
  declarado-como-suficiente pelo contador).
- ≥ 5% da receita vinda de assinaturas ativas em 3 meses do lançamento.
- Churn mensal de assinantes < 10%.
- Zero cobrança duplicada (idempotência de webhook de recorrência comprovada por teste).

## Fora de escopo (produto)
- Trial grátis com cartão salvo, planos anuais, multi-planos (v1: um único plano de acervo).
- Migração de clientes FASE existentes (admin continua atribuindo role à mão).
- Contabilidade completa (apuração, GUIA) — só emissão/documento por venda.
