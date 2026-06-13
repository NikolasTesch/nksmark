# Spec — Pendências do Marketplace: Deploy, Variáveis e Testes

> **Status:** pendente · **Autor:** Antigravity (AI) · **Data:** 2026-06-13  
> **Foco:** Resolução dos itens pendentes da Fase 2 (Marketplace / Pagamentos) listados em `PENDENCIAS-MARKETPLACE.md`.

---

## 1. Objetivo

Esta especificação detalha os passos técnicos necessários para concluir a integração do marketplace com o Mercado Pago, cobrindo:
1. Sincronização do schema Prisma com o banco Neon em produção.
2. Configuração correta das variáveis de ambiente necessárias.
3. Configuração do webhook de pagamentos do Mercado Pago.
4. Escrita dos testes de API pendentes (`GET /api/admin/sales`).
5. Escrita dos testes para o status de pedidos (`GET /api/orders/[id]`).
6. Escrita dos testes de componentes Frontend pendentes (botão dinâmico na página da arte `/loja/[slug]` e estados do formulário de `/cadastro`).
7. Atualizações pós-conclusão na documentação principal (`spec.md` e `PRD.md`).

---

## 2. Detalhamento e Abordagem Técnica

### 2.1 Deploy do Schema no Banco (Neon)

O arquivo `prisma/schema.prisma` já contém a modelagem necessária para o marketplace, incluindo as alterações no enum `Role` (adicionando `CLIENT`), o novo enum `OrderStatus`, e as tabelas `Order` e `Artwork.priceCents`. No entanto, essa alteração precisa ser aplicada no banco de dados Neon remoto.

**Instruções de Execução:**
1. **Backup**: Antes de rodar comandos de sincronização, certifique-se de realizar uma exportação (dump) dos dados atuais do banco Neon de produção/staging no painel do Neon.
2. **Sincronização**: Rodar o comando `npx prisma db push` para aplicar a estrutura. Como o projeto não utiliza migrations formais (`prisma migrate dev`), o `db push` é o método padrão de sincronização.
3. **Geração do Cliente**: Rodar `npx prisma generate` para atualizar as definições de tipo do Prisma Client no projeto.
4. **Verificação**: Conectar no painel do Neon e verificar se a tabela `Order` e as novas colunas foram criadas com sucesso.

---

### 2.2 Configuração de Variáveis de Ambiente

As credenciais do Mercado Pago e URLs do app não podem ser commitadas e devem ser configuradas de forma distinta nos ambientes.

#### A. Ambiente de Desenvolvimento Local (com Webhook)
Para testar o fluxo de webhook localmente, é necessário expor a porta local usando um túnel (ex: `ngrok` ou `Cloudflare Tunnel`).
1. Iniciar o túnel local:
   ```bash
   ngrok http 3000
   ```
2. Copiar a URL gerada (ex: `https://abcd-123.ngrok-free.app`).
3. Adicionar as seguintes variáveis ao `.env.local`:
   ```env
   # URL base do app (usada para as back_urls e webhook)
   NEXT_PUBLIC_APP_URL=https://abcd-123.ngrok-free.app

   # Credenciais de Teste do Mercado Pago (Sandbox)
   MP_ACCESS_TOKEN=TEST-xxxx...
   MP_WEBHOOK_SECRET=sua_assinatura_de_teste_do_painel_do_mp
   ```

#### B. Ambiente de Produção/Staging (Vercel)
Configurar no painel da Vercel (Settings > Environment Variables) os valores reais de produção ou sandbox homologados:
- `NEXT_PUBLIC_APP_URL`: URL oficial do site (ex: `https://nksmark.vercel.app` ou domínio próprio).
- `MP_ACCESS_TOKEN`: Token de acesso de produção/sandbox fornecido pelo Mercado Pago.
- `MP_WEBHOOK_SECRET`: Token de validação da assinatura do webhook gerado no painel do Mercado Pago.

---

### 2.3 Cadastro de Webhook no Mercado Pago

Para que a confirmação de pagamento Pix/cartão funcione de forma assíncrona e segura, o webhook precisa ser registrado no painel de desenvolvedores do Mercado Pago.

1. Acesse o [Painel do Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app).
2. Selecione a aplicação correspondente às credenciais em uso.
3. Vá em **Webhooks** (ou Notificações de IPN).
4. Insira a URL completa apontando para a API do projeto:
   `https://<SEU_DOMINIO_OU_TUNEL>/api/payments/webhook`
5. Em **Eventos**, selecione apenas **Pagamentos** (`payment`).
6. Salve a configuração.
7. Copie a chave de segurança (Secret / Chave de Assinatura) e insira na variável `MP_WEBHOOK_SECRET` do ambiente (`.env.local` ou Vercel).

---

### 2.4 Testes de API: `GET /api/admin/sales`
**Arquivo a ser criado:** `src/app/api/admin/sales/route.test.ts`

O handler em `src/app/api/admin/sales/route.ts` exige autenticação do perfil `ADMIN` e realiza agregações complexas dos pedidos pagos (`status: OrderStatus.PAID`) agrupados por data, artes, categorias e clientes. Os testes vitest devem cobrir:

1. **Restrição de Acesso (Segurança)**:
   - Se um visitante, `CLIENT` ou `FASE` tentar acessar a rota, ela deve retornar status `403` ou `401`.
   - Se um `ADMIN` tentar acessar a rota, o acesso deve ser concedido (status `200`).
   - Mockar o helper `protectAdminRoute` para simular as sessões apropriadas.

2. **Cálculo Correto das Agregações**:
   - Mockar a consulta `prisma.order.findMany` para retornar uma lista controlada de pedidos com status `PAID` vinculando artes, categorias e usuários.
   - **Nota de Implementação do Mock**: Como o endpoint chama `prisma.order.findMany` duas vezes sequenciais (primeiro para o mês selecionado e depois para o anterior), o mock do Vitest deve utilizar `mockResolvedValueOnce` separadamente para cada consulta para evitar que ambas retornem os mesmos pedidos, garantindo que o cálculo de `percentChangeFromPrevMonth` seja validado com exatidão matemática:
     ```typescript
     // Consulta 1: Mês atual
     prismaMock.order.findMany.mockResolvedValueOnce(mockCurrentMonthOrders)
     // Consulta 2: Mês anterior
     prismaMock.order.findMany.mockResolvedValueOnce(mockPrevMonthOrders)
     ```
   - Verificar as propriedades da resposta JSON:
     - `stats.totalRevenueCents`: Soma dos preços de todos os pedidos pagos no período.
     - `stats.totalSales`: Quantidade exata de vendas pagas.
     - `stats.avgTicketCents`: Média correta de receita por venda.
     - `stats.totalClients`: Contagem distinta de clientes únicos que compraram.
     - `percentChangeFromPrevMonth`: Comparativo de receita do período atual com o período anterior mockado.
     - `topArtworks`: Lista ordenada de artes mais vendidas.
     - `categoryDistribution`: Distribuição correta de percentuais e receita por categoria.
     - `topClients`: Lista de clientes que mais gastaram.
     - `recentOrders`: Lista dos últimos pedidos limitados a 12 registros.

3. **Filtro de Data por Parâmetros**:
   - Validar se o handler utiliza o ano/mês passados na query string (`?year=2026&month=06`) para criar os limites de data (`startDate`/`endDate`) na consulta do Prisma.
   - Validar se, na ausência de parâmetros, o fallback do handler calcula as datas com base no mês e ano atuais.

---

### 2.5 Testes de API: `GET /api/orders/[id]`
**Arquivo a ser criado:** `src/app/api/orders/[id]/route.test.ts`

O handler em `src/app/api/orders/[id]/route.ts` é o ponto de consulta usado no polling de confirmação de pagamento. Os testes devem cobrir:

1. **Autenticação e Autorização**:
   - Usuário não autenticado deve receber `401`.
   - Se o pedido pertencer a outro usuário (e o requisitante não for um `ADMIN`), o endpoint deve retornar `404` (evitando vazamento sobre a existência de pedidos alheios).
2. **Sucesso no Retorno**:
   - Dono do pedido autenticado deve receber o status `200` com os dados do pedido (`id`, `status`, `amountCents`, `paidAt`, `artwork`).
   - Um administrador (`Role.ADMIN`) deve ser capaz de consultar qualquer pedido de qualquer cliente com status `200`.

---

### 2.6 Testes de Componente Frontend

Os arquivos de teste de frontend de componentes e páginas React rodam no Vitest, cujo ambiente padrão no projeto é `node`. Para emular o DOM e evitar erros de APIs do navegador, todos os arquivos de teste do frontend **devem iniciar** com a diretiva de ambiente de jsdom:
```typescript
// @vitest-environment jsdom
```

#### 2.6.1 Botão "Comprar/Baixar" por Role (`src/app/loja/[slug]/page.test.tsx`)
A página de detalhes da arte possui um botão dinâmico cuja ação varia dependendo de o usuário estar logado, sua role e se ele possui um pedido pago para a arte atual.

Devem ser criados testes utilizando `@testing-library/react` cobrindo os seguintes cenários:
1. **VISITOR (Não logado)**:
   - O botão exibe: `"Entrar para comprar — R$ 15,00"` (ou o preço dinâmico da arte).
   - O clique no botão redireciona para a página de login: `router.push('/login?callbackUrl=/loja/<slug>')`.
2. **CLIENT sem compra anterior**:
   - O botão exibe: `"Comprar por R$ 15,00"`.
   - O clique no botão dispara uma chamada de `POST /api/orders` enviando o `artworkId`.
   - Simular redirecionamento para o `initPoint` retornado pelo Mercado Pago.
3. **CLIENT com compra PAGA**:
   - O botão exibe: `"Baixar arte comprada"`.
   - O clique no botão abre o modal de downloads (`DownloadModal`).
4. **FASE ou ADMIN (Equipe Interna)**:
   - O botão exibe: `"Liberar downloads"`.
   - O clique abre o modal de downloads diretamente, sem passar por fluxo de compra.

*Nota técnica para o mock*: Mockar `useSession` do `next-auth/react`, `useRouter` e `useParams` do `next/navigation`, bem como a função global `fetch`.

#### 2.6.2 Estados do Formulário de Auto-Cadastro (`src/app/cadastro/page.test.tsx`)
A página `/cadastro` deve ser testada para verificar o comportamento da UI perante as diferentes respostas do backend.

1. **Estado de Loading**:
   - Ao submeter o formulário (enviando Nome, E-mail e Senha), o botão de submissão deve ser desabilitado e exibir o spinner de carregamento (`Loader2`).
2. **Estado de Sucesso**:
   - Se o backend retornar `{ success: true }` no `POST /api/auth/register`, o formulário chama `signIn` e redireciona o usuário para a página de destino (`/loja` ou callback URL).
3. **Estado de Erro**:
   - Se o backend retornar `{ success: false, error: "E-mail já cadastrado" }`, a tela deve exibir uma mensagem de erro em um banner destacado (`AlertTriangle` e o texto do erro).

---

### 2.7 Atualização da Documentação (`spec.md` e `PRD.md`)

Após concluir e testar as pendências acima:
1. **`spec.md`**:
   - Atualizar a seção de "Perfis de Usuário" para detalhar o comportamento definitivo da role `CLIENT`.
   - Detalhar as novas rotas de checkout (`/cadastro`, `/minhas-compras`, `/compra/*`, `/admin/vendas`) na tabela de rotas.
   - Adicionar informações das novas tabelas/colunas Prisma.
   - Atualizar a tabela de endpoints com as novas rotas de API do marketplace.
   - Marcar os itens de pagamento no roadmap de Fase 2 como concluídos.
2. **`PRD.md`**:
   - Marcar o item "Sistema de pagamento (Mercado Pago)" como concluído no roadmap (Fase 2).
   - Marcar "Artes premium vs gratuitas" e "Análise de vendas no admin" como concluídos.
   - Atualizar o status geral do PRD para refletir que a Fase 2 (Marketplace) está ativa e homologada.

---

## 3. Plano de Execução Sugerido

1. **Fase de Banco de Dados**:
   - Executar backup remoto do Neon.
   - Rodar `npx prisma db push` e `npx prisma generate`.
2. **Fase de API e Testes Backend**:
   - Criar `src/app/api/admin/sales/route.test.ts`.
   - Criar `src/app/api/orders/[id]/route.test.ts`.
   - Rodar os testes via `npm test` para validar a cobertura das APIs de vendas e pedidos.
3. **Fase de Testes Frontend**:
   - Criar testes de componente com environment `jsdom` para o botão dinâmico em `/loja/[slug]/page.tsx`.
   - Criar testes de componente com environment `jsdom` para a tela `/cadastro/page.tsx`.
   - Garantir que toda a suíte de testes de frontend e backend esteja passando (`npm test` geral).
4. **Fase de Integração e Deploy**:
   - Configurar o ngrok localmente e testar o fluxo de webhook de ponta a ponta com pagamentos de teste (sandbox).
   - Registrar a URL definitiva de produção ou homologação no painel do Mercado Pago.
   - Inserir as chaves no painel da Vercel e realizar o deploy.
5. **Fase de Documentação**:
   - Atualizar `spec.md` e `PRD.md` com as novas especificações e status.

---

## 4. Critérios de Aceitação (Checklist)

- [ ] A tabela `Order` e os novos campos em `Artwork` e `Role` estão refletidos no Neon de produção/staging.
- [ ] O arquivo `src/app/api/admin/sales/route.test.ts` existe e valida com 100% de precisão as agregações de receita, ticket médio, clientes únicos e variação mensal para ADMIN (usando mock resolvido de forma individual), retornando `403` para outros perfis.
- [ ] O arquivo `src/app/api/orders/[id]/route.test.ts` existe e valida o polling, garantindo proteção de visibilidade para outros usuários (`404`) e sucesso para dono e `ADMIN` (`200`).
- [ ] Os testes de componente para `/loja/[slug]/page.tsx` com environment `jsdom` validam os 4 estados do botão de ação com base na role e status da compra.
- [ ] Os testes de componente para `/cadastro/page.tsx` com environment `jsdom` validam os estados de loading, sucesso e mensagens de erro do formulário.
- [ ] Todos os testes da aplicação (`npm test`) estão passando sem erros.
- [ ] O webhook do Mercado Pago valida a assinatura (`MP_WEBHOOK_SECRET`) e responde com status `200` para evitar reentregas em loops.
- [ ] Os documentos `spec.md` e `PRD.md` estão totalmente atualizados.
