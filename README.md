# NKS Art — Catálogo Digital de Artes de Alta Fidelidade

Plataforma corporativa e acervo digital privado para equipes de design e sublimação.

## Stack Técnica

- **Framework**: Next.js 16 (App Router)
- **Estilização**: Tailwind CSS v4 & shadcn/ui
- **Banco de Dados**: Neon (PostgreSQL) via Prisma ORM
- **Storage**: Cloudflare R2 (S3 API compatível)
- **Autenticação**: NextAuth.js v5 (auth.js)
- **Mensageria**: Resend & React Email

## Estrutura de Diretórios

O projeto segue estritamente a arquitetura modular solicitada:

```
nks-art/
├── .github/workflows/   # CI/CD pipelines (Lint & Type-check)
├── prisma/              # Modelagem de dados e scripts de seeds
├── public/              # Favicon, fontes e ícones PWA
├── src/
│   ├── app/             # Rotas públicas, administrativas e Route Handlers (API)
│   ├── components/      # Componentes UI reutilizáveis (Layout, Artwork, Admin, Shared)
│   ├── hooks/           # Custom React Hooks (Filters, Local History)
│   ├── lib/             # Instâncias e helpers (Prisma Client, NextAuth, R2, Resend)
│   ├── validations/     # Validações Zod (Artworks, Downloads, Suggestions)
│   └── types/           # Tipagem do TypeScript para API e Entidades
```

## Como Iniciar

1. Clone o repositório
2. Copie o arquivo `.env.example` para `.env.local` e insira suas credenciais:
   ```bash
   cp .env.example .env.local
   ```
3. Instale as dependências:
   ```bash
   npm install --legacy-peer-deps
   ```
4. Gere o cliente do Prisma e rode as migrations:
   ```bash
   npx prisma generate
   # npx prisma db push (para sincronizar o Neon DB)
   ```
5. Popule as categorias iniciais (Seed):
   ```bash
   npx ts-node prisma/seed.ts
   ```
6. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

## Credenciais Padrão (Mock)

- **Admin**: `admin@nksart.com.br` / `admin123`
