@AGENTS.md

# NKS Art — Guia do Projeto

Catálogo digital de artes para sublimação. Área pública para navegação, downloads liberados
apenas para usuários autenticados com role **FASE** (equipe interna), e painel admin protegido
para upload/gestão. Pagamento fica para a Fase 2. Especificação completa em `spec.md`.

> Antes de codar: leia `spec.md` e este arquivo. O `AGENTS.md` (importado acima) avisa que esta
> versão do Next.js tem breaking changes — consulte `node_modules/next/dist/docs/` quando em dúvida.

## Stack real (já instalada)

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | **Next.js 16** (App Router) | `spec.md` diz 14; o projeto roda 16.2.6 |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui | `baseColor: slate`, CSS variables |
| ORM / DB | Prisma 5 + Neon (PostgreSQL) | |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3` | URLs assinadas para download |
| Auth | NextAuth.js v5 (beta) | Credentials provider, sessão JWT |
| Email | Resend + React Email | suporte / sugestão de arte |
| Validação | Zod v4 | |

**Framer Motion** já instalado e em uso. **Vercel Analytics** ainda não configurado.
Pagamento (Stripe/Mercado Pago), busca livre e marca d'água são Fase 2.

## Comandos

```bash
npm install --legacy-peer-deps   # necessário por peer deps de next-auth v5 / react 19
npm run dev                       # servidor de desenvolvimento
npm run build                     # build de produção
npm run lint                      # eslint (config next)
npx prisma generate               # após mudar schema.prisma
npx prisma db push                # sincroniza Neon (NÃO há pasta migrations — usa db push)
npx ts-node prisma/seed.ts        # popula categorias iniciais
```

## Estrutura

```
src/
├── app/
│   ├── (public)/        # rotas públicas (loja, faq, suporte, gratis, meus-downloads, ...)
│   ├── admin/           # painel protegido (artes, categorias, dashboard)
│   ├── api/             # Route Handlers REST (artworks, downloads, categories, tags, ...)
│   ├── login/           # tela de login
│   └── layout.tsx, page.tsx, globals.css
├── components/  ui/ (shadcn) · layout/ · artwork/ · admin/ · shared/
├── hooks/       useArtworkFilters, useDownloadHistory
├── lib/         auth/ · r2/ · email/ · validations/ · utils/ · prisma.ts
└── types/       api.ts, artwork.ts
middleware.ts    # protege /admin (ADMIN) e /meus-downloads (FASE|ADMIN)
prisma/          # schema.prisma + seed.ts
```

### Divergências entre `spec.md` e o build atual

- `/` **redireciona para `/loja`** — hero removida por ora; a entrada pública é direto o catálogo.
- `/admin/conteudo` tem abas Categorias e Tags implementadas; **aba Filtros ainda pendente**.
- `/admin/usuarios`, `/admin/artes/[id]`, `/admin/downloads`, `/admin/metricas` — **todos implementados**.
- Login admin: verificação via ADMIN_PASSWORD_HASH no `.env` (bcrypt/scrypt, sem fallback em texto puro).
- Framer Motion em uso em `/admin/downloads` e `/quem-somos`.
- Para o roadmap completo de Fase 2, consulte `PRD.md`.

## Convenções (seguir o que já existe no código)

- **TypeScript** em tudo. Componentes `PascalCase`, utils `camelCase`. Alias de import: `@/*` → `src/*`.
- **API**: todo Route Handler retorna `ApiResponse<T>` (`src/types/api.ts`):
  `{ success: boolean, data?: T, error?: string }`. Valide o body com Zod (`safeParse`) e devolva
  `error.issues[0].message` com status 400. Erros inesperados → `console.error` + status 500.
- **Proteção de rotas de API**: use os helpers de `src/lib/auth/middleware.ts`
  (`protectAdminRoute`, `protectFaseRoute`) — eles retornam `{ authorized, response, user }`.
  A proteção de páginas fica em `middleware.ts` (matcher `/admin/*` e `/meus-downloads/*`).
- **Roles** (`Role` do Prisma): `VISITOR` (default), `FASE`, `ADMIN`. Download exige FASE ou ADMIN.
- **Prisma**: instância única importada de `@/lib/prisma`. Nunca instanciar `PrismaClient` solto.
- **R2**: cliente em `@/lib/r2/client`; downloads sempre via URL assinada (`getSignedDownloadUrl`),
  nunca expor a URL pública direta dos arquivos originais.
- **Cores/tema**: via CSS variables + tokens do `tailwind.config.ts` (`primary`, `muted`, etc.).
  Não hardcode hex em componentes.
- **Credenciais**: somente via `.env.local` (ver `.env.example`). Nunca commitar segredos.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`).

## Workflow de Tarefas (obrigatório)

Antes de codar qualquer feature ou correção não-trivial, siga este fluxo:

1. **Crie uma spec detalhada** em `specs/` com nome descritivo (ex.: `specs/feat-filtros-admin.md`).
   A spec deve conter: objetivo, escopo (o que faz / o que não faz), mudanças de modelo de dados,
   endpoints afetados, componentes/páginas impactadas, critérios de aceitação e riscos.
2. **Execute a implementação** conforme a spec.
3. **Ao concluir**, atualize `spec.md` e `PRD.md` se a tarefa:
   - Adicionar ou remover uma rota / endpoint
   - Mudar o schema do Prisma
   - Alterar o comportamento de um perfil de usuário
   - Marcar um item como concluído no roadmap

Esse fluxo mantém `spec.md` e `PRD.md` como source of truth e evita que a documentação
fique desatualizada em relação ao código real.

## Regras invioláveis (do `spec.md`)

1. Visitante (sem login) **nunca** baixa arquivo — vê "Faça login para baixar".
2. Download liberado **apenas** para role FASE/ADMIN, sempre via URL assinada do R2 e registrado em
   `Download` (com `userId`).
3. Contas FASE são criadas manualmente pelo admin; não há auto-cadastro.
4. Não deletar artes fisicamente — usar `Artwork.status` (DRAFT/PUBLISHED/ARCHIVED).
