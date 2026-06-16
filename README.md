# 🎨 NKS Art — Catálogo Digital de Artes & Acervo Privado

> Uma plataforma premium integrada de vitrine de vendas de artes digitais e acervo centralizado de segurança com backup automático para equipes de design e sublimação.

---

## 🧭 Visão Geral do Projeto

O **NKS Art** é uma solução corporativa robusta desenvolvida para solucionar os principais gargalos operacionais no segmento de design e sublimação. O ecossistema concilia duas frentes de grande impacto para a operação:

1. **Vitrine Comercial de Alta Conversão**: Permite que clientes naveguem por um catálogo responsivo e veloz, escolham suas estampas diretamente pelo celular e realizem compras individuais e instantâneas via checkout integrado do Mercado Pago (Pix/Cartão).
2. **Cofre e Backup Centralizado (Acervo Privado)**: Centraliza o armazenamento de arquivos pesados de alta fidelidade (`.CDR`, `.AI`, `.PDF`, `.OTF`) em nuvem segura, garantindo proteção total da propriedade intelectual da empresa, histórico de downloads auditado e imunidade contra perda de arquivos locais.

---

## 🛠️ Stack Técnica & Arquitetura

O projeto foi construído utilizando tecnologias modernas e escaláveis de desenvolvimento web:

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) utilizando Server Components (RSC) para SEO otimizado e carregamento instantâneo.
* **Interface (UI)**: [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) para um design limpo, responsivo e de alto padrão estético (variáveis HSL integradas).
* **Animações**: [Framer Motion](https://www.framer.com/motion/) para transições suaves e micro-interações na interface.
* **ORM**: [Prisma v5](https://www.prisma.io/) como camada de abstração de banco de dados tipo-segura.
* **Banco de Dados**: [Neon DB](https://neon.tech/) (PostgreSQL Serverless) de alta performance e disponibilidade.
* **Armazenamento (Storage)**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (compatível com S3 API) garantindo **Zero Egress Fees** (sem custo de tráfego nos downloads de arquivos pesados).
* **Autenticação**: [NextAuth.js v5 (auth.js)](https://authjs.dev/) com suporte a provedor de credenciais e sessões JWT.
* **Mensageria**: [Resend](https://resend.com/) + [React Email](https://react.email/) para disparo automático de emails transacionais e formulários de suporte.
* **Gateway de Pagamento**: Integração direta via API REST com o [Mercado Pago](https://www.mercadopago.com.br/) (sem dependências externas) para o fluxo de checkout e webhook seguro.
* **Testes**: [Vitest](https://vitest.dev/) para uma suíte de testes rápida em TypeScript.

---

## 👥 Perfis de Usuário & Controle de Acesso (RBAC)

O controle de acesso é definido granularmente a nível de rotas de página e endpoints da API por meio do enum `Role` do banco de dados:

### 🌐 Visitante (VISITOR) — *Sem Login*
* Acessa a `/loja` e visualiza o grid de artes com previews em alta definição.
* Filtra produtos por categoria e tag.
* Acessa páginas institucionais: `/quem-somos`, `/faq`, `/suporte`, `/sugerir-arte`.
* **Restrição**: Não pode baixar nenhum arquivo. O botão exibe *"Faça login para baixar/comprar"*.

### 🛒 Cliente (CLIENT) — *Auto-cadastro*
* Auto-cadastro disponível na rota pública `/cadastro`.
* Compra de artes individuais (checkout transparente integrado ao Mercado Pago via Pix ou cartão).
* Acesso à aba `/minhas-compras` com histórico de pedidos e downloads permanentes liberados apenas para as artes adquiridas.
* Acesso às artes gratuitas (`isFree: true`).

### 👥 Equipe Interna (FASE) — *Cadastro Manual*
* Criado manualmente via painel administrativo.
* Visualização e download imediato e livre de todos os formatos originais das artes (`.CDR`, `.AI`, `.PDF`, `.OTF`).
* Acesso à página `/meus-downloads` com seu histórico de downloads pessoal.
* **Restrição**: Não tem acesso às rotas do painel `/admin`.

### 👑 Administrador (ADMIN) — *Acesso Irrestrito*
* Login via email administrativo e senha com hash seguro.
* Acesso ao dashboard de métricas executivas em `/admin`.
* **Gestão de Conteúdo** (`/admin/conteudo`): Criação, edição e exclusão lógica de Categorias e Tags, além da reordenação e ativação de filtros no catálogo.
* **Gestão de Artes** (`/admin/artes`): Upload e cadastro de novos previews e arquivos, controle de status (Rascunho, Publicado, Arquivado), preços e categorizações.
* **Gestão de Equipes** (`/admin/usuarios`): Criação e controle de contas de usuários com a role `FASE`.
* **Análise Financeira** (`/admin/vendas`): Análise de receita total, principais clientes e produtos mais vendidos.
* **Auditoria operacional**: Visualização de logs detalhados de downloads.

---

## 📂 Estrutura de Diretórios

O projeto segue a convenção arquitetural modular recomendada:

```
nksmark/
├── .github/workflows/    # Pipelines de CI/CD (lint, typecheck e testes)
├── docs/                 # Documentações de infraestrutura e backups
├── prisma/               # Schema do banco de dados (schema.prisma) e script de seed.ts
├── public/               # Assets estáticos públicos, ícones e manifestos
├── specs/                # Histórico de especificações de features desenvolvidas
├── src/
│   ├── app/              # Rotas e layouts divididos em grupos
│   │   ├── (public)/     # Rotas institucionais e de compras (públicas/clientes)
│   │   ├── admin/        # Telas do painel de administração (restrito ADMIN)
│   │   ├── api/          # Route Handlers REST organizados por entidades
│   │   ├── cadastro/     # Tela de registro de clientes
│   │   ├── login/        # Tela de autenticação da plataforma
│   │   └── loja/         # Tela do catálogo principal e detalhes de artes
│   ├── components/       # Componentes de interface organizados por domínio
│   │   ├── ui/           # Componentes base do shadcn/ui
│   │   ├── admin/        # Componentes exclusivos do painel administrativo
│   │   ├── artwork/      # Componentes do catálogo, galerias e downloads
│   │   ├── layout/       # Cabeçalho, rodapé e barras de navegação lateral
│   │   └── shared/       # Componentes compartilhados genéricos (Ex: Feedback, Dialogs)
│   ├── hooks/            # React hooks customizados (filtros, histórico local)
│   ├── lib/              # Inicialização de SDKs (Prisma, Cloudflare R2, Resend, Mercado Pago)
│   ├── types/            # Tipagens globais de entidades e respostas de APIs
│   └── validations/      # Esquemas de validação de dados Zod
├── vitest.config.ts      # Configurações do framework de testes
```

---

## ⚡ Guia de Instalação & Configuração Local

### 1. Clonar o repositório e instalar dependências
Devido às dependências de parcerias entre React 19 e NextAuth.js v5 Beta, é obrigatório utilizar a flag `--legacy-peer-deps`:
```bash
git clone https://github.com/NikolasTesch/nksmark.git
cd nksmark
npm install --legacy-peer-deps
```

### 2. Variáveis de Ambiente
Duplique o arquivo de exemplo e preencha as variáveis de ambiente necessárias:
```bash
cp .env.example .env.local
```

Abra o arquivo `.env.local` e configure as credenciais:

| Variável | Descrição | Exemplo / Formato |
|---|---|---|
| `DATABASE_URL` | String de conexão com banco de dados PostgreSQL | `postgresql://user:password@host/dbname?sslmode=require` |
| `R2_ACCOUNT_ID` | ID da conta Cloudflare do R2 | `32-char-hex-string` |
| `R2_ACCESS_KEY_ID` | Chave de Acesso do R2 API | `24-char-string` |
| `R2_SECRET_ACCESS_KEY` | Chave Secreta do R2 API | `64-char-string` |
| `R2_BUCKET_NAME` | Nome do bucket criado no R2 | `nks-art-files` |
| `R2_PUBLIC_URL` | URL pública de leitura dos previews (CDN) | `https://previews.exemplo.com` |
| `NEXTAUTH_SECRET` | Segredo aleatório para criptografia da sessão | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL base da aplicação para callbacks de auth | `http://localhost:3000` |
| `ADMIN_EMAIL` | Email padrão para login do administrador inicial | `admin@nksart.com.br` |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt/scrypt para a senha do administrador | *Veja instruções abaixo para gerar* |
| `RESEND_API_KEY` | Chave de integração do serviço Resend | `re_123456789` |
| `EMAIL_FROM` | Remetente padrão de e-mails disparados | `NKS Art <contato@nksart.com.br>` |
| `MP_ACCESS_TOKEN` | Token de produção ou sandbox do Mercado Pago | `APP_USR-xxxxxxxx` |
| `MP_WEBHOOK_SECRET` | Segredo de webhook do Mercado Pago | `sua-assinatura-webhook` |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação (API URL) | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Nome de exibição da aplicação | `NKS Art` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`| Telefone para suporte rápido via WhatsApp | `0000000000` |

#### Gerando o `ADMIN_PASSWORD_HASH`
Você pode gerar o hash de senha do admin localmente utilizando o script de utilidade executando:
```bash
npx ts-node -e "const {hashPassword}=require('./src/lib/auth/password');hashPassword('SUA_SENHA_AQUI').then(console.log)"
```

### 3. Banco de Dados e Carga Inicial (Seed)
Execute a geração do Prisma client, sincronize o esquema do banco de dados (o projeto utiliza sincronização direta `db push` ao invés de migrations locais) e carregue as categorias estáticas iniciais:
```bash
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
```

### 4. Executando o Servidor de Desenvolvimento
Inicie a aplicação localmente:
```bash
npm run dev
```
O catálogo estará acessível em `http://localhost:3000`.

---

## 🧪 Execução de Testes

O projeto conta com testes unitários e de integração utilizando **Vitest** e **React Testing Library**:

* **Executar os testes uma única vez**:
  ```bash
  npm run test
  ```
* **Executar em modo watch (desenvolvimento ativo)**:
  ```bash
  npm run test:watch
  ```

---

## 📜 Convenções de Código & Diretrizes Internas

Para manter a consistência no repositório, certifique-se de seguir as seguintes convenções:

1. **Validação Estrita de Dados**: Todos os payloads de requisições HTTP (entrada de dados nas APIs) e formulários do lado do cliente devem ser validados usando esquemas declarativos do **Zod** (`src/validations/`).
2. **Segurança nos Downloads**: Arquivos de produção finais originais nunca devem ter suas URLs brutas do Cloudflare R2 expostas ao cliente. O backend gera URLs temporárias assinadas com expiração máxima de 15 minutos via helper `getSignedDownloadUrl`.
3. **Respostas Padronizadas de API**: Todos os Route Handlers devem responder utilizando a interface genérica padronizada `ApiResponse<T>` (`src/types/api.ts`):
   ```typescript
   export interface ApiResponse<T> {
     success: boolean
     data?: T
     error?: string
   }
   ```
4. **Proteção Baseada em Helpers**: A verificação de nível de autorização dentro das APIs deve utilizar os middlewares auxiliares importados de `@/lib/auth/middleware` (`protectAdminRoute`, `protectFaseRoute`), os quais retornam o status da autorização e as informações do usuário contidas no JWT decodificado.
5. **Estilos e Cores**: Não utilize códigos hexadecimais de cores diretamente nos arquivos `.tsx`. Adote as variáveis semânticas configuradas no Tailwind CSS (`bg-primary`, `text-muted-foreground`, etc.) para respeitar a compatibilidade e a transição fluida do tema.
6. **Controle de Mensagens de Commit**: Siga a convenção de [Conventional Commits](https://www.conventionalcommits.org/):
   * `feat:` Implementação de novas funcionalidades (ex: checkout Mercado Pago).
   * `fix:` Correção de bugs no sistema.
   * `chore:` Atualizações de build, pacotes ou documentações (ex: esta atualização do README).
