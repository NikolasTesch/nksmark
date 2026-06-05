# Spec — Marketplace: pagamento por arte (Mercado Pago)

> **Status:** implementado (código + testes) · **Autor:** Nikolas · **Data:** 2026-06-05
> **Fase:** marca o início da Fase 2 (pagamento) descrita em `PRD.md` §9 / `spec.md`.
>
> **Pendência de deploy:** o schema foi alterado (enum `Role` ganhou `CLIENT`, novo enum
> `OrderStatus`, modelo `Order`, `Artwork.priceCents`). Rodar `npx prisma db push` contra o Neon
> (com backup antes) e configurar `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET`. Cadastrar a URL do
> webhook (`/api/payments/webhook`) no painel do Mercado Pago. Integração via REST (`fetch`),
> sem SDK novo. 93 testes passando (`npm test`).

## 1. Objetivo

Transformar o NKS Art de catálogo de distribuição interna em **marketplace**: qualquer pessoa
pode criar uma conta de **cliente**, pagar por uma arte (R$ 15 por padrão) e, após a confirmação
do pagamento, baixar os arquivos originais e receber um e-mail de confirmação. O admin ganha uma
página de **análise de vendas** (artes e nichos mais vendidos, clientes que mais compraram,
receita).

O fluxo interno atual (role `FASE`/`ADMIN` baixa de graça via URL assinada) **permanece intacto**.
A monetização recai apenas sobre a nova role `CLIENT`.

## 2. Decisões de produto (já validadas)

| Tema | Decisão |
|---|---|
| Gateway | **Mercado Pago** — Checkout Pro (redirect), Pix + cartão + boleto |
| Conta do cliente | **Auto-cadastro** com e-mail + senha → role `CLIENT`. Compra fica permanente na conta |
| Granularidade da compra | **Uma arte por compra** (sem carrinho no MVP) |
| Preço | Campo `priceCents` no `Artwork`, **default `1500`** (R$ 15,00), ajustável por arte pelo admin |

## 3. Escopo

### Faz (MVP)
- Nova role `CLIENT` + auto-cadastro público (`/cadastro`) e login na tela existente.
- Campo `priceCents` em `Artwork` (default 1500), editável no admin.
- Botão **Comprar** na página da arte para clientes; checkout direto via Mercado Pago.
- Modelo `Order` (1 arte por pedido) com ciclo `PENDING → PAID/FAILED/EXPIRED`.
- Webhook do Mercado Pago com validação de assinatura e idempotência.
- E-mail transacional "pagamento confirmado" (Resend + React Email).
- Página do cliente `/minhas-compras` com re-download permanente das artes pagas.
- Páginas de retorno do checkout: `/compra/sucesso`, `/compra/pendente`, `/compra/falha`.
- Autorização de download estendida: `CLIENT` baixa apenas artes com `Order` PAGO (ou `isFree`).
- Página admin `/admin/vendas`: receita, nº de vendas, artes mais vendidas, categorias (nichos)
  mais vendidas, top clientes, lista de pedidos — com filtro por período.

### Não faz (fora deste MVP)
- Carrinho com múltiplas artes / cupons / descontos.
- Reembolso/estorno automatizado (tratado manualmente no painel do Mercado Pago; refletido só
  como leitura de status).
- Emissão de nota fiscal / integração fiscal.
- Assinatura/recorrência, créditos, saldo.
- Marca d'água no preview (continua na Fase 2 separada).
- Migração de artes free→pago em massa (apenas o campo de preço passa a existir).

## 4. Modelo de dados (Prisma)

> Sincronização via `npx prisma db push` (o projeto não usa migrations) + `npx prisma generate`.

```prisma
enum Role {
  VISITOR
  CLIENT   // NOVO — cliente pagante, auto-cadastro
  FASE
  ADMIN
}

enum OrderStatus {
  PENDING    // pedido criado, aguardando pagamento
  PAID       // pagamento aprovado
  FAILED     // recusado/cancelado
  EXPIRED    // preferência expirou sem pagamento
  REFUNDED   // estornado (refletido manualmente)
}

model Artwork {
  // ...campos atuais...
  priceCents Int @default(1500)   // NOVO — preço em centavos de BRL
  orders     Order[]              // NOVO
}

model User {
  // ...campos atuais...
  orders Order[]   // NOVO
}

model Order {
  id            String      @id @default(cuid())
  user          User        @relation(fields: [userId], references: [id])
  userId        String
  artwork       Artwork     @relation(fields: [artworkId], references: [id])
  artworkId     String
  amountCents   Int                       // snapshot do preço no momento da compra
  status        OrderStatus @default(PENDING)
  mpPreferenceId String?                  // id da preference do Mercado Pago
  mpPaymentId    String?    @unique       // id do pagamento aprovado (idempotência)
  paymentMethod  String?                  // pix | credit_card | boleto (informativo)
  createdAt      DateTime   @default(now())
  paidAt         DateTime?
  updatedAt      DateTime   @updatedAt

  @@index([userId])
  @@index([artworkId])
  @@index([status])
}
```

Notas:
- `amountCents` é **snapshot**: o preço da arte pode mudar depois sem alterar pedidos antigos.
- `Download` permanece igual; um download de `CLIENT` só é registrado se houver `Order` PAGO da arte.
- Um cliente pode ter no máximo **um pedido PAGO por arte** (re-compra bloqueada na criação); pode
  reabrir um `PENDING` antigo em vez de duplicar.

## 5. Integração Mercado Pago

- SDK: `mercadopago` (server-side). Apenas no runtime Node (nunca no Edge/middleware).
- **Criação do pedido** (`POST /api/orders`): servidor lê `artwork.priceCents` (nunca confia em
  valor vindo do cliente), cria `Order(PENDING)`, cria *Preference* com:
  - `items`: título da arte, `unit_price` = `amountCents/100`, `quantity: 1`, `currency_id: BRL`.
  - `external_reference`: `order.id`.
  - `back_urls`: `${APP_URL}/compra/sucesso|pendente|falha`.
  - `notification_url`: `${APP_URL}/api/payments/webhook`.
  - `auto_return: "approved"`.
  - Persiste `mpPreferenceId`; retorna `init_point` para redirect.
- **Webhook** (`POST /api/payments/webhook`, público):
  - Valida o header `x-signature` (HMAC SHA256 com `MP_WEBHOOK_SECRET`, conforme docs MP:
    template `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`). Assinatura inválida → 401.
  - Para `type=payment`: busca o pagamento via SDK pelo `data.id`, lê `status` e
    `external_reference`.
  - **Idempotente**: se `Order` já está PAGO ou `mpPaymentId` já gravado, responde 200 sem reprocessar.
  - **Confere o valor**: `payment.transaction_amount*100` deve bater com `order.amountCents`; divergência → loga e não aprova.
  - `approved` → `Order.status=PAID`, grava `mpPaymentId`, `paidAt`, `paymentMethod`; dispara e-mail.
  - `rejected/cancelled` → `FAILED`. Sempre responde **200** rápido (evita reentrega infinita).
- **Página de sucesso** faz *polling* em `GET /api/orders/[id]` até `PAID` (a confirmação
  autoritativa vem do webhook, não da back_url — back_url pode chegar antes do webhook).

## 6. Autorização de download (mudança central)

`POST /api/downloads` e `POST /api/downloads/zip` deixam de usar `protectFaseRoute` direto e passam
a aplicar esta regra (novo helper em `src/lib/auth/middleware.ts`, ex. `authorizeArtworkDownload`):

| Role | Regra |
|---|---|
| VISITOR / não logado | bloqueado (401/403) — "faça login" / "compre para baixar" |
| CLIENT | permitido **somente** se `artwork.isFree` **ou** existe `Order` PAGO desse `userId`+`artworkId` |
| FASE / ADMIN | permitido para qualquer arte PUBLISHED (comportamento atual, sem pagamento) |

Demais regras atuais seguem: arte precisa estar `PUBLISHED`, URL assinada R2, registro em
`Download`, rate limit por usuário. O `upsert` do admin master (`id: 'admin'`) é preservado.

## 7. Autenticação

- `src/lib/auth/config.ts` → `authorize`: adicionar branch para `Role.CLIENT` (hoje só aceita
  FASE/ADMIN do banco). Mesmo fluxo de `verifyPassword`.
- **Auto-cadastro**: `POST /api/auth/register` cria `User{ role: CLIENT, passwordHash }`
  (Zod: nome, e-mail único, senha forte; hash via `@/lib/auth/password`; rate limit por IP).
  E-mail duplicado → 409.
- `edge-config.ts` já propaga `role`/`id` no JWT — sem mudança.
- `middleware.ts`: adicionar matcher `'/minhas-compras/:path*'` liberando `CLIENT|FASE|ADMIN`
  (visitante → `/login`). `/admin/*` continua só ADMIN.

## 8. Endpoints de API

| Endpoint | Método | Acesso | Descrição |
|---|---|---|---|
| `/api/auth/register` | POST | Público | Cria conta `CLIENT` |
| `/api/orders` | POST | CLIENT | Cria pedido + preference MP; retorna `{ orderId, initPoint }` |
| `/api/orders` | GET | CLIENT | Lista pedidos do cliente logado |
| `/api/orders/[id]` | GET | CLIENT (dono) | Status do pedido (polling da página de sucesso) |
| `/api/payments/webhook` | POST | Público (assinado) | Notificações do Mercado Pago |
| `/api/downloads` | POST | CLIENT(pago)/FASE/ADMIN | **Alterado**: nova regra de autorização |
| `/api/downloads/zip` | POST | CLIENT(pago)/FASE/ADMIN | **Alterado**: idem |
| `/api/admin/sales` | GET | ADMIN | Agregações de vendas por período |
| `/api/artworks` `[id]` | POST/PUT | ADMIN | **Alterado**: passa a aceitar/validar `priceCents` |

Todos retornam `ApiResponse<T>` e validam body com Zod (`safeParse`, `error.issues[0].message`,
status 400; erro inesperado → `console.error` + 500). Novos schemas em
`src/lib/validations/order.ts` e `src/lib/validations/auth.ts`.

## 9. Páginas e componentes

### Cliente / público
- `/cadastro` — formulário de auto-cadastro (loading/success/error). Link cruzado com `/login`.
- `/loja/[slug]` — bloco de ação por role:
  - VISITOR → "Faça login para comprar" (→ `/login?callbackUrl=`).
  - CLIENT sem compra → **"Comprar por R$ XX,00"** → `POST /api/orders` → redirect `initPoint`.
  - CLIENT com compra paga → botão **"Baixar"** (abre `DownloadModal` atual).
  - FASE/ADMIN → download atual inalterado.
- `/minhas-compras` — lista de artes compradas (status, data, valor) + re-download permanente.
- `/compra/sucesso` (polling), `/compra/pendente`, `/compra/falha`.
- `DownloadModal`: reaproveitado; o aviso "apenas equipe FASE" passa a considerar também CLIENT pago.

### Admin
- `/admin/vendas` — **nova página de análise** (segue padrão de `/admin/metricas`): filtro por
  mês/ano; cards de **receita total** e **nº de vendas**; **artes mais vendidas**; **nichos
  (categorias) mais vendidos**; **top clientes** (por nº de compras e valor); tabela de pedidos
  recentes com status. Consome `GET /api/admin/sales`.
- `/admin/artes/nova` e `/admin/artes/[id]` — campo **Preço (R$)** (default 15,00).
- Navegação do admin e do header público atualizadas (item "Minhas Compras" para CLIENT, "Vendas"
  no admin).

## 10. E-mail

- Novo template `src/lib/email/templates/payment-confirmed.tsx` (React Email), enviado no webhook
  ao confirmar pagamento: nome da arte, valor, link para `/minhas-compras` (download permanente).
  Reusa `resend` + `EMAIL_FROM`. Falha de e-mail é logada mas **não** quebra a confirmação.

## 11. Variáveis de ambiente (novas)

```env
MP_ACCESS_TOKEN=        # token privado do Mercado Pago (server-side)
MP_WEBHOOK_SECRET=      # secret para validar x-signature do webhook
NEXT_PUBLIC_APP_URL=    # já existe — usado em back_urls/notification_url
```
Atualizar `.env.example`. Nenhum segredo commitado.

## 12. Critérios de aceitação

1. Cliente consegue se cadastrar, logar e ver a loja com botão "Comprar por R$ 15,00".
2. Ao comprar, é redirecionado ao Mercado Pago; pagando (sandbox), o webhook marca o `Order` como
   PAGO **e** o cliente recebe o e-mail de confirmação.
3. Antes do pagamento confirmado, o download da arte **fica bloqueado** para o cliente.
4. Após PAGO, o cliente baixa os arquivos (URL assinada R2) e o download é registrado; o re-download
   continua disponível em `/minhas-compras` indefinidamente.
5. VISITOR nunca compra nem baixa; FASE/ADMIN continuam baixando de graça, sem pagar.
6. Webhook: assinatura inválida é rejeitada; reentrega do mesmo evento **não** duplica pedido nem
   e-mail (idempotência); valor divergente não aprova.
7. O preço é sempre lido do servidor (`artwork.priceCents`); manipular o valor no cliente não altera
   a cobrança.
8. `/admin/vendas` mostra, para o período: receita total, nº de vendas, top artes, top categorias
   (nichos) e top clientes, batendo com os pedidos PAGOS do banco.
9. Admin define/edita o preço por arte; default de novas artes é R$ 15,00.
10. Todas as features novas acompanham testes (regra `testing_and_implementation.md`).

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Webhook não chega / chega atrasado | Página de sucesso faz polling do status; confirmação é sempre via webhook, não back_url |
| Reentrega duplicada do webhook | Idempotência por `mpPaymentId` único + checagem de status PAGO |
| Manipulação de preço no cliente | Valor lido do banco no servidor; webhook confere `transaction_amount` |
| Assinatura do webhook mal validada | Implementar conforme docs MP (template `id;request-id;ts`), testar com payloads reais; rejeitar inválidos |
| Edge Runtime x SDK MP | SDK só em route handlers Node; nada de MP no `middleware.ts`/edge-config |
| FK `Download.userId` para CLIENT | CLIENT já existe em `User` (criado no cadastro); sem o problema do admin-env |
| Sandbox vs produção | Usar credenciais de teste em dev; documentar troca no `.env` |
| Estorno/chargeback | Fora do MVP; status REFUNDED apenas refletido manualmente, revoga download |
| Conta CLIENT tentando rota interna | `middleware.ts` mantém `/admin` só ADMIN; download checa role + pedido |

## 14. Testes (obrigatórios)

Backend (`vitest`/jest + mocks de MP, Resend, R2 — padrão do repo):
- `orders`: cria pedido com preço do banco; bloqueia VISITOR; impede 2º pedido pago da mesma arte.
- `payments/webhook`: aprova pedido em `approved`; idempotente em reentrega; rejeita assinatura
  inválida; ignora `external_reference` desconhecido; não aprova com valor divergente.
- `downloads`: CLIENT sem pedido pago → 403; CLIENT com pedido pago → URL assinada + registro;
  FASE/ADMIN seguem baixando sem pedido; arte não PUBLISHED → 403.
- `auth/register`: cria CLIENT; e-mail duplicado → 409; senha fraca → 400.
- `admin/sales`: agregações (receita, top artes/categorias/clientes) corretas para um conjunto de
  pedidos PAGOS.

Frontend (`flutter`? não — aqui é React/Next): testes de componente onde já há padrão
(`DownloadModal.test.tsx`): botão "Comprar" por role; estados loading/success/error do cadastro.

## 15. Pós-conclusão (manter docs como source of truth)

Ao finalizar a implementação, **atualizar** (regra do `CLAUDE.md`):
- `spec.md` e `PRD.md`: nova role CLIENT, rotas novas (`/cadastro`, `/minhas-compras`,
  `/compra/*`, `/admin/vendas`), endpoints novos, campo `priceCents`, mudança de comportamento de
  download e marcar itens de pagamento no roadmap como concluídos.
- `.env.example`: variáveis do Mercado Pago.
```
```
