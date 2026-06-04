# NKS Art — Product Requirements Document (PRD)

**Versão:** 1.0  
**Data:** 2026-06-02  
**Status:** MVP implementado — Fase 2 planejada

---

## 1. Visão do Produto

NKS Art é um catálogo digital de artes para sublimação. O produto resolve o problema de distribuição controlada de arquivos vetoriais (CDR, AI, PDF, OTF) para a equipe interna de uma empresa de personalização gráfica, ao mesmo tempo que apresenta o portfólio publicamente para atrair novos clientes.

**Proposta de valor:**
- Visitantes navegam e descobrem o catálogo livremente (funil de vendas)
- Equipe interna (role FASE) baixa qualquer arte sem fricção
- Admin gerencia todo o conteúdo em um painel unificado

---

## 2. Usuários e Personas

### Visitante (público, sem login)
- Descobre o catálogo via redes sociais ou busca orgânica
- Explora artes, filtra por categoria/tag
- Não pode baixar — vê CTA para login
- **Meta:** converter em usuário FASE (cliente)

### Fase (equipe interna)
- Funcionário ou parceiro da empresa com acesso autorizado
- Baixa artes em qualquer formato para uso em produção
- Acompanha seu histórico de downloads
- Conta criada manualmente pelo admin (sem auto-cadastro)

### Admin (único usuário)
- Dono/gestor do catálogo
- Faz upload, edita, publica e arquiva artes
- Gerencia usuários FASE, categorias, tags e filtros
- Acompanha métricas de uso

---

## 3. Estado Atual do MVP (Fase 1)

### ✅ Implementado

#### Autenticação e Autorização
- Login via email/senha (NextAuth v5, Credentials provider)
- Roles: `VISITOR`, `FASE`, `ADMIN`
- JWT session com proteção via middleware
- Admin autenticado por ADMIN_PASSWORD_HASH no `.env` (sem usuário no banco)
- Proteção de rotas: `/admin/*` → ADMIN, `/meus-downloads` → FASE|ADMIN

#### Catálogo Público (`/loja`)
- Grid de artes com paginação
- Filtros por categoria e tag (client-side)
- Busca por título
- Página de detalhe `/loja/[slug]` com galeria de previews, thumbnails e zoom
- Favoritos (localStorage)
- Visitante vê "Faça login para baixar" no lugar dos botões de download

#### Downloads (role FASE/ADMIN)
- Botões de formato na página da arte (CDR, AI, PDF, OTF, PNG, JPG)
- API gera URL assinada temporária do Cloudflare R2 (15 min)
- Arquivo original nunca exposto diretamente
- Registro salvo em `Download` com `userId`, `artworkId`, `fileId`
- Histórico em `/meus-downloads`

#### Páginas Públicas
- `/` — Redireciona para `/loja` (hero removida por ora; entrada pública é direto o catálogo)
- `/faq` — Accordion de perguntas frequentes
- `/suporte` — Formulário via Resend
- `/sugerir-arte` — Sugestão de tema com campo de imagem de referência
- `/quem-somos` — Página editorial com stats animados e timeline

#### Painel Admin
- `/admin` — Dashboard com métricas (total de artes, downloads, usuários)
- `/admin/artes` — Tabela de artes com filtros e ações
- `/admin/artes/nova` — Upload de arte com metadados e arquivos
- `/admin/artes/[id]` — Edição completa com galeria
- `/admin/conteudo` — Gestão de categorias e tags (abas)
- `/admin/usuarios` — Listagem e criação de usuários FASE
- `/admin/downloads` — Log de todos os downloads com filtros
- `/admin/metricas` — Analytics com gráficos de uso

#### Segurança
- Rate limiting nas APIs
- Headers de segurança (CSP, X-Frame-Options, etc.)
- Validação de assinatura no upload
- URLs assinadas para todos os downloads (vetores originais nunca expostos)
- Soft delete de artes (campo `status`: DRAFT/PUBLISHED/ARCHIVED)

### ⚠️ Divergências spec vs. implementação real

| Item no spec.md | Estado real |
|---|---|
| Next.js 14 | Roda **Next.js 16.2.6** |
| `/admin/conteudo` com aba Filtros | Aba Filtros ainda não implementada |
| Framer Motion (animações) | Instalado e em uso no admin/downloads e quem-somos |
| Vercel Analytics | Ainda não configurado |
| `/gratis` | Rota existe mas não diferencia free/pago (Fase 2) |

---

## 4. Requisitos Funcionais

### RF-01: Catálogo
- O sistema deve exibir artes com status PUBLISHED para visitantes
- Filtros por categoria e tag devem funcionar sem recarregar a página
- A página de detalhe deve mostrar preview em alta resolução via galeria com zoom

### RF-02: Downloads
- Apenas usuários com role FASE ou ADMIN podem iniciar downloads
- Cada download deve gerar uma URL assinada do R2 válida por 15 minutos
- Cada download deve ser registrado com `userId`, `artworkId` e `fileId`
- A URL pública direta dos arquivos originais nunca deve ser exposta

### RF-03: Autenticação
- Login via email/senha com sessão JWT
- Admin autenticado via variável de ambiente (sem usuário no banco)
- Middleware deve redirecionar visitantes não autorizados para /login com return URL

### RF-04: Painel Admin
- Upload de artes com múltiplos arquivos de formatos diferentes
- Edição de título, descrição, categoria, tags, status e preview
- Soft delete (arquivamento) — nunca exclusão física
- Visualização de log de downloads com filtros por usuário e arte

### RF-05: Gestão de Conteúdo
- Criar, editar e arquivar categorias
- Criar, renomear e remover tags
- Controlar quais categorias aparecem no filtro da loja (aba Filtros — pendente)

### RF-06: Usuários FASE
- Admin cria contas FASE com email e senha
- Não há auto-cadastro público
- Admin pode desativar contas FASE

---

## 5. Requisitos Não-Funcionais

| Requisito | Meta |
|---|---|
| Performance | LCP < 2,5s (imagens via R2 + CDN Cloudflare) |
| Segurança | Sem credenciais no código; arquivos protegidos por URL assinada |
| Escalabilidade | Neon PostgreSQL free tier → upgrade conforme crescimento |
| Disponibilidade | Vercel deploy automático via GitHub main |
| SEO | SSR/SSG para páginas públicas via Next.js App Router |

---

## 6. Modelo de Dados (atual)

O schema Prisma implementado cobre todas as entidades do MVP:

- `User` — visitante, fase ou admin (passwordHash para FASE)
- `Artwork` — arte com slug único, status, preview e múltiplos arquivos
- `File` — arquivo vinculado à arte com formato e URL R2
- `Category` — categoria com slug, cor e controle de exibição no filtro
- `Tag` — tag livre vinculada a artes (many-to-many)
- `Download` — registro de cada download com userId, artworkId, fileId
- `Suggestion` — sugestão de arte com email opcional e imagem de referência

---

## 7. Arquitetura de Alto Nível

```
Browser
  └── Next.js 16 (Vercel)
        ├── App Router (SSR + RSC)
        ├── Middleware (auth guards)
        └── Route Handlers (REST API)
              ├── Prisma ORM → Neon (PostgreSQL)
              ├── @aws-sdk/client-s3 → Cloudflare R2
              ├── NextAuth v5 (JWT session)
              └── Resend (email transacional)
```

---

## 8. Rotas Implementadas

### Públicas
| Rota | Descrição |
|---|---|
| `/` | Redireciona para `/loja` (hero removida por ora) |
| `/loja` | Catálogo com filtros |
| `/loja/[slug]` | Detalhe da arte + download (FASE) |
| `/gratis` | Artes gratuitas (distinção Fase 2) |
| `/faq` | Perguntas frequentes |
| `/suporte` | Formulário de contato |
| `/sugerir-arte` | Sugestão de tema |
| `/quem-somos` | Sobre o estúdio |
| `/login` | Autenticação |

### Protegidas (FASE/ADMIN)
| Rota | Descrição |
|---|---|
| `/meus-downloads` | Histórico do usuário logado |

### Admin
| Rota | Descrição |
|---|---|
| `/admin` | Dashboard de métricas |
| `/admin/artes` | Listagem de artes |
| `/admin/artes/nova` | Criar arte |
| `/admin/artes/[id]` | Editar arte |
| `/admin/conteudo` | Categorias e tags |
| `/admin/usuarios` | Usuários FASE |
| `/admin/downloads` | Log de downloads |
| `/admin/metricas` | Analytics |

### API
| Endpoint | Método | Acesso |
|---|---|---|
| `/api/artworks` | GET | Público |
| `/api/artworks/[id]` | GET, PUT, DELETE | ADMIN |
| `/api/downloads` | POST | FASE/ADMIN |
| `/api/downloads/zip` | POST | FASE/ADMIN |
| `/api/categories` | GET, POST | GET: público / POST: ADMIN |
| `/api/categories/[id]` | PUT, DELETE | ADMIN |
| `/api/tags` | GET, POST | GET: público / POST: ADMIN |
| `/api/tags/[id]` | PUT, DELETE | ADMIN |
| `/api/suggestions` | POST | Público |
| `/api/admin/upload` | POST | ADMIN |
| `/api/admin/users` | GET, POST | ADMIN |
| `/api/admin/users/[id]` | PUT, DELETE | ADMIN |
| `/api/admin/downloads` | GET | ADMIN |
| `/api/admin/metrics` | GET | ADMIN |
| `/api/admin/stats` | GET | ADMIN |

---

## 9. Fase 2 — Roadmap

### P0 — Alta prioridade (próximo sprint)
- [ ] **Aba Filtros** em `/admin/conteudo` — controle de ordem e visibilidade no filtro da loja
- [ ] **Vercel Analytics** — configurar `@vercel/analytics` para rastrear pageviews e eventos de download

### P1 — Média prioridade
- [ ] **Preview com marca d'água** — geração automática via Sharp no upload
- [ ] **Busca por texto livre** — full-text search no Neon ou Algolia
- [ ] **Coleções / séries** — agrupar artes relacionadas em uma série

### P2 — Pós-validação de uso
- [ ] **Sistema de pagamento** — Stripe ou Mercado Pago para artes premium
- [ ] **Artes premium vs gratuitas** — distinção visível na loja, bloqueio para VISITANTE sem compra
- [ ] **Newsletter** — notificação de novas artes para assinantes
- [ ] **Analytics avançado** — relatórios de artes mais baixadas, usuários mais ativos

---

## 10. Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=nks-art-files
R2_PUBLIC_URL=

# Autenticação
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=   # bcrypt hash da senha do admin

# Email
RESEND_API_KEY=
EMAIL_FROM=
SUGGESTION_RECIPIENT_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME="NKS Art"
```

---

## 11. Decisões Técnicas Registradas

| Decisão | Motivo |
|---|---|
| Next.js App Router | Layouts aninhados, Server Components, SEO nativo |
| Neon em vez de Supabase | Sem congelamento no free tier |
| Cloudflare R2 | Zero custo de egress — essencial para arquivos vetoriais grandes |
| URLs assinadas para download | Protege arquivos de hotlinking; expira em 15 min |
| Role FASE separada de VISITANTE | Controle granular sem expor a complexidade do admin |
| Admin via .env sem tabela no banco | Usuário único, sem necessidade de RBAC |
| Soft delete em Artwork | Preserva histórico de downloads vinculados |
| `db push` em vez de migrations | Projeto solo em desenvolvimento ativo — migrations formais na estabilização |
| Fase 2 para pagamento | Valida o modelo de uso antes de adicionar complexidade de checkout |
| Framer Motion para animações | Animações suaves em páginas editoriais e dashboard |
