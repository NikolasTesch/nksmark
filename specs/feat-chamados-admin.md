# Spec: Armazenamento e Visualização de Chamados de Suporte Técnico

## Objetivo
Permitir o armazenamento no banco de dados e a visualização no painel administrativo de todos os chamados de suporte técnico enviados via `/suporte`.

## Escopo
- Criar modelo `SupportTicket` no Prisma.
- Atualizar a API de suporte (`POST /api/support`) para salvar os chamados no banco de dados.
- Criar rotas administrativas de API (`GET /api/admin/support` e `PATCH /api/admin/support/[id]`) para listar e atualizar o status do chamado.
- Adicionar opção "Chamados de Suporte" no menu lateral do painel administrativo.
- Criar a página administrativa `/admin/chamados` para o administrador visualizar e gerenciar (ex. marcar como resolvido) os chamados de suporte.

## Alterações de Modelo de Dados
- Adicionar o modelo `SupportTicket` no `prisma/schema.prisma`:
  ```prisma
  model SupportTicket {
    id        String   @id @default(cuid())
    name      String
    email     String
    message   String
    status    String   @default("PENDING") // PENDING, RESOLVED
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  ```

## Endpoints Afetados
- `POST /api/support` (Modificado para salvar no banco de dados)
- `GET /api/admin/support` [NEW] (Listar chamados para o admin)
- `PATCH /api/admin/support/[id]` [NEW] (Atualizar status do chamado, ex: marcar como RESOLVED/PENDING)

## Componentes/Páginas Impactadas
- `src/components/admin/AdminSidebar.tsx` (Adicionado link para chamados)
- `src/app/admin/chamados/page.tsx` [NEW] (Página administrativa de chamados)

## Critérios de Aceitação
- Todo envio no formulário `/suporte` é salvo no banco de dados com status `PENDING`.
- Administradores logados conseguem visualizar todos os chamados na página `/admin/chamados`.
- Administradores conseguem marcar chamados como `RESOLVED` ou `PENDING` a partir do painel.
- O rate-limit de chamados e o envio opcional por e-mail continuam funcionando.

## Riscos e Mitigações
- Risco: Vazamento de informações dos chamados. Mitigação: Proteger as rotas de listagem e alteração no backend usando `protectAdminRoute`.
