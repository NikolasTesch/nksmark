# Índice de Especificações e PRDs — NKS Art

> **Última sincronização com o código:** 2026-09-17  
> **Status da Suíte de Testes:** 45 arquivos / 315 testes passando (`npm test` verde)

Este diretório centraliza os documentos de produto (PRDs), especificações técnicas (Specs) e planos de tarefas (Tasks) do projeto, alinhados à metodologia **Specification-Driven Development (SDD)**.

---

## 🗺️ Mapa de Status das Funcionalidades

A tabela abaixo resume o levantamento de implementação de cada iniciativa em relação ao código-fonte real e banco de dados:

| Especificação / Módulo | Tipo | Status de Implementação | Documentação |
|---|---|---|---|
| **[Loja Server-Side](./loja-server-side/)** | Feature Core | 🟢 **Concluído** | [PRD](./loja-server-side/prd.md) · [Spec](./loja-server-side/spec.md) · [Tasks](./loja-server-side/tasks.md) |
| **[Melhorias Admin (Refunds & Tabelas)](./melhorias-admin/)** | Feature Core | 🟢 **Concluído** | [PRD](./melhorias-admin/prd.md) · [Spec](./melhorias-admin/spec.md) · [Tasks](./melhorias-admin/tasks.md) |
| **[UI Feedback & Polish](./ui-feedback-polish/)** | UX / Polish | 🟢 **Concluído** | [PRD](./ui-feedback-polish/prd.md) · [Spec](./ui-feedback-polish/spec.md) · [Tasks](./ui-feedback-polish/tasks.md) |
| **[Phase 2 Closeout](./phase2-closeout/)** | Ops / Doc | 🟡 **Código Concluído / Ops Pendente** | [PRD](./phase2-closeout/prd.md) · [Spec](./phase2-closeout/spec.md) · [Tasks](./phase2-closeout/tasks.md) |
| **[Billing Fase 3 (Assinatura e Fiscal)](./billing-fase3/)** | Expansão | 🟡 **Parcial / Híbrido**<br>• *Assinatura:* Fundação Pronta<br>• *Fiscal:* Não Implementado | [PRD](./billing-fase3/prd.md) · [Spec](./billing-fase3/spec.md) · [Tasks](./billing-fase3/tasks.md) |
| **[Landing Page](./landing-page/)** | Expansão | 🔴 **Não Implementado (Backlog)** | [PRD](./landing-page/prd.md) · [Spec](./landing-page/spec.md) · [Tasks](./landing-page/tasks.md) |
| **[Descoberta de Artes](./descoberta-artes/)** | Expansão | 🔴 **Não Implementado (Backlog)** | [PRD](./descoberta-artes/prd.md) · [Spec](./descoberta-artes/spec.md) · [Tasks](./descoberta-artes/tasks.md) |

---

## 📂 Detalhamento por Categoria

### 🟢 1. Concluídas e Implementadas

Funcionalidades cujos requisitos foram implementados no código e validados por testes unitários e de integração:

- **[Loja Server-Side](./loja-server-side/)**: Migração de filtros, busca FTS e paginação do cliente para o servidor (`src/lib/artworks/query.ts`), URLs canônicas compartilháveis via `searchParams` e carregamento otimizado.
- **[Melhorias Admin](./melhorias-admin/)**: Sistema de estorno de compras (`createRefund` no Mercado Pago, status `REFUNDED`), modal de confirmação no admin e componente unificado e responsivo `DataTable.tsx`.
- **[UI Feedback & Polish](./ui-feedback-polish/)**: Sistema global de notificações via `sonner`, correção do asset de fallback `public/placeholder.svg`, unificação de `EmptyState` e gestos touch na galeria mobile (`ArtworkPreview.tsx`).

---

### 🟡 2. Parcialmente Implementadas / Aguardando Ops

Funcionalidades com desenvolvimento de código finalizado ou em andamento, mas com bloqueios externos ou etapas de infraestrutura pendentes:

- **[Phase 2 Closeout](./phase2-closeout/)**: O código da Fase 2 (Marketplace) está 100% testado e concluído. Restam pendências de operações em produção (registro do webhook no painel de produção do Mercado Pago e aplicação do SQL de FTS no Neon remoto).
- **[Billing Fase 3](./billing-fase3/)**:
  - **Frente B (Assinatura do Acervo)**: Model `Subscription` no Prisma, rotas `/api/subscriptions/*`, página `/assinatura` e integração Mercado Pago Preapproval implementadas e testadas.
  - **Frente A (Emissão Fiscal NF-e/NFS-e)**: 0% implementada. Aguarda decisão contábil e aprovação de ADR sobre regime e fornecedor de emissão.

---

### 🔴 3. Não Implementadas (Backlog de Expansão)

PRDs e especificações detalhadas que aguardam priorização para início de desenvolvimento:

- **[Landing Page](./landing-page/)**: Substituição do redirecionamento seco de `/` para `/loja` por uma landing page institucional com Hero, carrossel de novidades, grid de categorias e SEO/Open Graph.
  - *Estado atual:* `src/app/page.tsx` continua realizando `redirect('/loja')`.
- **[Descoberta de Artes](./descoberta-artes/)**: Sistema de artes relacionadas com cálculo de relevância por sobreposição de tags (M2M) e sistema completo de avaliações/reviews de clientes (`Review` model, notas de 1 a 5 estrelas, formulário e moderação).
  - *Estado atual:* Nenhuma entidade ou rota de reviews existe no código; a rota `/loja/[slug]` continua usando filtro simples de mesma categoria.

---

### 📦 4. Histórico e Arquivo (`archive/`)

Especificações de sprints e entregas anteriores arquivadas após homologação:

- [feat-chamados-admin.md](./archive/feat-chamados-admin.md): Sistema de chamados de suporte técnico no painel admin.
- [feat-download-zip-multi-arquivo.md](./archive/feat-download-zip-multi-arquivo.md): Geração de pacote ZIP com múltiplos vetores para FASE/ADMIN.
- [feat-loja-marketplace-polish.md](./archive/feat-loja-marketplace-polish.md): Ajustes visuais da loja e fluxo de compra.
- [feat-marketplace-pagamento.md](./archive/feat-marketplace-pagamento.md): Arquitetura inicial da integração com Mercado Pago.
- [feat-marketplace-pendencias.md](./archive/feat-marketplace-pendencias.md): Reconciliação dos testes e endpoints do marketplace.
- [fix-suporte-route.md](./archive/fix-suporte-route.md): Correção da rota de suporte com Resend.
- [filter-tab-drag-and-drop.json](./archive/filter-tab-drag-and-drop.json) e [meus-downloads-server-driven.json](./archive/meus-downloads-server-driven.json): Metadados de tarefas anteriores.

---

## 🔄 Fluxo de Trabalho (SDD)

Ao iniciar uma nova iniciativa:
1. Para novas features, crie a pasta correspondente em `docs/specs/<feature-name>/` com `prd.md`, `spec.md` e `tasks.md`.
2. Mantenha o cabeçalho de status explicitamente atualizado.
3. Ao finalizar, atualize este índice (`docs/specs/README.md`) e os documentos globais (`PRD.md` e `spec.md`).
