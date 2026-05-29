# NKS Art — Project Spec (v2)

## Visão geral

Catálogo digital de artes para sublimação e afins. Área pública para navegação. Downloads liberados apenas para usuários autenticados com role **fase** (equipe interna). Administração protegida para upload, edição e gestão completa. Pagamento planejado para Fase 2.

---

## Stack técnica

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + SSG para SEO e performance |
| Estilização | Tailwind CSS + shadcn/ui | Componentes acessíveis prontos |
| Animações | Framer Motion | Transições de página, hover nas artes |
| ORM | Prisma | Type-safe, migrations versionadas |
| Banco de dados | Neon (PostgreSQL) | Sem congelamento, free tier |
| Storage de arquivos | Cloudflare R2 | Artes originais + previews, sem egress fee |
| Autenticação | NextAuth.js v5 | Roles: visitante, fase, admin |
| Email | Resend + React Email | Formulário de suporte/orçamento |
| Hospedagem | Vercel | Deploy automático via GitHub |
| DNS / CDN | Cloudflare | Cache de assets, proteção |
| Domínio | Registro.br | `.com.br` |
| Analytics | Vercel Analytics | Downloads, páginas mais vistas |
| Repositório | GitHub | Source of truth, CI/CD |

---

## Perfis de usuário (Roles)

### Visitante (público, sem login)
- Navega pelo catálogo livremente
- Filtra por categoria e tag
- Visualiza preview da arte
- **NÃO pode baixar nenhuma arte**
- Acessa FAQ, Suporte, Sugerir Arte, Quem Somos
- Vê botão "Faça login para baixar" no lugar do download

### Fase (equipe interna — autenticado)
- Todas as permissões do visitante
- **Pode visualizar e baixar todos os arquivos livremente** (CDR, AI, PDF, OTF)
- Acessa "Meus Downloads" com histórico pessoal
- **Não tem acesso ao painel admin**
- Conta criada manualmente pelo admin

### Admin (único — acesso total)
- Login com email + senha via NextAuth
- Acessa painel `/admin` completo
- **Página exclusiva de gestão de conteúdo**: categorias, tags, filtros
- Faz upload de novas artes com metadados
- Edita e remove artes publicadas (ativo/inativo/rascunho)
- Gerencia contas de usuários com role **fase**
- Vê log de downloads (quem baixou o quê)

---

## Navegação — menu principal

```
Loja | FAQ | Suporte | Sugerir Arte | Quem Somos | Grátis | Meus Downloads
```

| Rota | Página | Acesso |
|---|---|---|
| `/` | Home — hero, destaques, últimas artes | Público |
| `/loja` | Catálogo com filtro por categoria e tag | Público |
| `/loja/[slug]` | Detalhe da arte + preview + download (se fase) | Público / Download: fase |
| `/gratis` | Artes gratuitas (Fase 2: distinção free/pago) | Público |
| `/meus-downloads` | Histórico de downloads do usuário logado | Fase |
| `/sugerir-arte` | Formulário de sugestão de tema | Público |
| `/faq` | Perguntas frequentes em accordion | Público |
| `/suporte` | Formulário de contato via Resend | Público |
| `/quem-somos` | Sobre o estúdio e o designer | Público |
| `/admin` | Dashboard: métricas de downloads | Admin |
| `/admin/artes` | Listagem de artes (tabela com ações) | Admin |
| `/admin/artes/nova` | Upload e cadastro de nova arte | Admin |
| `/admin/artes/[id]` | Edição de arte existente | Admin |
| `/admin/conteudo` | **Gestão de categorias, tags e filtros** | Admin |
| `/admin/usuarios` | Listagem e gestão de usuários fase | Admin |

---

## Página Admin — Gestão de Conteúdo (`/admin/conteudo`)

Página dedicada com três seções em abas:

### Aba: Categorias
- Listagem de todas as categorias com contagem de artes
- Criar nova categoria (nome + slug + cor opcional)
- Editar nome e slug de categoria existente
- Arquivar/remover categoria (bloqueia se tiver artes vinculadas)

### Aba: Tags
- Listagem de todas as tags com contagem de uso
- Criar nova tag
- Renomear tag existente
- Remover tag (desvincula das artes automaticamente)

### Aba: Filtros
- Definir quais categorias aparecem no menu de filtro da `/loja`
- Ordenar a exibição dos filtros (drag-and-drop)
- Ativar/desativar filtros específicos sem apagar a categoria

---

## Modelo de dados

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String?
  role      Role       @default(VISITOR)
  downloads Download[]
  createdAt DateTime   @default(now())
}

enum Role {
  VISITOR
  FASE
  ADMIN
}

model Artwork {
  id          String     @id @default(cuid())
  title       String
  slug        String     @unique
  description String?
  status      Status     @default(DRAFT)
  isFree      Boolean    @default(true)
  previewUrl  String
  files       File[]
  category    Category   @relation(fields: [categoryId], references: [id])
  categoryId  String
  tags        Tag[]
  downloads   Download[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model File {
  id        String   @id @default(cuid())
  format    Format
  url       String
  size      Int
  artwork   Artwork  @relation(fields: [artworkId], references: [id])
  artworkId String
}

enum Format {
  CDR
  AI
  PDF
  OTF
  PNG
  JPG
}

model Category {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  color     String?
  showInFilter Boolean @default(true)
  filterOrder Int     @default(0)
  artworks  Artwork[]
}

model Tag {
  id       String    @id @default(cuid())
  name     String    @unique
  artworks Artwork[]
}

model Download {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  artwork   Artwork  @relation(fields: [artworkId], references: [id])
  artworkId String
  fileId    String
  createdAt DateTime @default(now())
}

model Suggestion {
  id          String   @id @default(cuid())
  email       String?
  description String
  createdAt   DateTime @default(now())
}
```

---

## Fluxos principais

### Download (role fase)
```
1. Usuário fase acessa /loja/[slug]
2. Vê preview + botões de formato (CDR, AI, PDF, OTF)
3. Clica em formato desejado
4. API verifica role = FASE ou ADMIN
5. API gera URL assinada temporária do R2 (15 min)
6. Download inicia via URL assinada
7. Registro salvo em Download com userId
```

### Tentativa de download (visitante)
```
1. Visitante acessa /loja/[slug]
2. Vê preview da arte
3. Botão de download exibe "Faça login para baixar"
4. Clica → redireciona para /login com return URL
5. Após login, se role = VISITANTE → mensagem "sem permissão"
6. Se role = FASE → download liberado
```

### Upload (admin)
```
1. Admin acessa /admin/artes/nova
2. Preenche: título, descrição, categoria, tags, status
3. Upload do preview (PNG/JPG) → R2 /previews/
4. Upload dos arquivos (CDR, AI, PDF, OTF) → R2 /files/
5. Salva → registro no banco com URLs do R2
```

---

## Funcionalidades por fase

### Fase 1 — MVP
- [ ] Catálogo público com grid de artes
- [ ] Filtros por categoria e tag
- [ ] Página de detalhe com preview
- [ ] Download liberado apenas para role FASE
- [ ] Visitante vê "Login para baixar"
- [ ] Autenticação com roles (VISITOR, FASE, ADMIN)
- [ ] Histórico de downloads em /meus-downloads
- [ ] Admin: upload, edição, publicação de artes
- [ ] Admin: página de gestão (categorias, tags, filtros)
- [ ] Admin: gestão de usuários FASE
- [ ] FAQ, Suporte (Resend), Sugerir Arte, Quem Somos

### Fase 2 — Pós-lançamento
- [ ] Sistema de pagamento (Stripe ou Mercado Pago)
- [ ] Artes premium vs gratuitas
- [ ] Preview com marca d'água automática
- [ ] Busca por texto livre
- [ ] Coleções / séries de artes
- [ ] Newsletter de novas artes
- [ ] Analytics avançado no painel admin

---

## Variáveis de ambiente

```env
# Banco
DATABASE_URL=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=nks-art-files
R2_PUBLIC_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=

# Email
RESEND_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME="NKS Art"
```

---

## Convenções de código

- Linguagem: TypeScript em todo o projeto
- Componentes: PascalCase (`ArtworkCard.tsx`)
- Funções utilitárias: camelCase (`generateSlug.ts`)
- Rotas de API: REST via Next.js Route Handlers
- Validação: Zod em todos os formulários e APIs
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`)
- Formatação: Prettier + ESLint (config Next.js)

---

## Decisões técnicas registradas

| Decisão | Motivo |
|---|---|
| Next.js App Router | Layouts aninhados, Server Components, melhor SEO |
| Neon em vez de Supabase | Sem congelamento no free tier |
| Cloudflare R2 | Zero custo de egress para arquivos grandes |
| URLs assinadas para download | Protege arquivos de hotlinking direto |
| Role FASE separada de VISITANTE | Controle granular sem expor admin |
| Download bloqueado para visitante | Proteção da propriedade intelectual |
| Gestão de conteúdo em página dedicada | Admin não precisa ir em artes para gerenciar filtros |
| Admin único sem RBAC complexo | Escopo atual não justifica complexity de multi-admin |
| Fase 2 para pagamento | Valida uso antes de adicionar complexidade |