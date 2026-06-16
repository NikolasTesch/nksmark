# Spec: Fix Suporte Técnico Route

## Objetivo
Resolver a falha no envio de chamados da página de suporte técnico (`/suporte`) implementando o endpoint `/api/support` no backend.

## Escopo
- Criar a validação Zod (`src/lib/validations/support.ts`) para os campos: `name`, `email`, `message`.
- Criar o manipulador de rota POST `/api/support` (`src/app/api/support/route.ts`) com rate limit por IP e envio do e-mail usando Resend.
- Adaptar o formulário da página `/suporte` para ler a mensagem de erro da API em vez de exibir um erro fixo.
- Criar testes unitários para o endpoint.

## Alterações de Modelo de Dados
- Nenhuma (o chamado é enviado somente via e-mail e não persiste no banco).

## Endpoints Afetados
- `POST /api/support` [NEW]

## Critérios de Aceitação
- Chamados válidos são enviados e retornam status 200.
- Chamados com validações inválidas retornam status 400.
- Requisições abusivas (> 3 por minuto por IP) retornam status 429.
- O formulário do frontend renderiza a mensagem de erro específica retornada pelo backend.
