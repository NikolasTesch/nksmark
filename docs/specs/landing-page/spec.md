# Spec — landing-page

## Objetivo técnico
Substituir o redirect `/` → `/loja` por uma landing estática (Server Component, dados via Prisma
direto, `revalidate` por tempo) com pitch da marca, destaques do acervo e CTAs, reutilizando os
tokens/tricolor de `globals.css` e componentes existentes (`ArtworkCard`, Header/Footer).

## Requisitos

### Funcionais
1. **RF-1 Seções (nesta ordem):**
   - Hero: headline "Artes para sublimação prontas para cortar" (copy final é do produto),
     subtexto do modelo (compra avulsa via Pix/cartão + acervo FASE), CTAs "Explorar a loja"
     (primário, vermelho) e "Criar conta" (secundário).
   - Novidades: 8 artes `PUBLISHED` recentes (`createdAt desc`) via `ArtworkCard`.
   - Categorias: grid com as categorias `showInFilter` em `filterOrder`, linkando `/loja?cat=<id>`
     (compatível com a spec `loja-server-side`).
   - Como funciona: 3 passos (Escolha → Pague no Pix → Baixe o vetor), ícones lucide.
   - Prova social leve: contagens reais (`X artes publicadas`, `Y downloads`) agregadas do banco —
     nada inventado.
   - CTA final cadastro (login mágico para CLIENT é o funil).
2. **RF-2 Server Component estático** com `export const revalidate = 3600`; queries só no Prisma
   (mesmo helper `lib/artworks/query.ts` criado em `loja-server-side`, count agregado baratucho).
3. **RF-3 SEO/OG:** `generateMetadata` com title/description canônicos; `openGraph` com imagem
   (`public/og.png` estática da marca); `metadataBase` com `nksmark.com.br`; JSON-LD `Organization`
   + `ItemList` simples. Remover `redirect()` atual de `src/app/page.tsx`.
4. **RF-4 Responsivo mobile-first** — hero empilhada, carrossel de novidades scroll-snap nativo
   (CSS `scroll-snap-type`, sem lib).
5. **RF-5 Sem regressão de rota:** `/loja` continua funcionando; middleware de RBAC não bloqueia `/`.

### Não-funcionais
- RFN-1: JS da página ≈ 0 kB adicional de libs novas (usa o que existe; Framer Motion opcional e mínimo).
- RFN-2: LCP < 2s em 4G — imagem do hero como `<Image priority>` com dimensões explícitas; contagens agregadas no revalidate, não por request.
- RFN-3: Acessibilidade: landmarks (`header/main/section` com `aria-labelledby`), contraste dos botões AA, carrossel navegável por teclado.

## Modelagem de Dados & Contratos de API
Nenhuma tabela/endpoint novo. Consultas (uma só página, cacheada pelo revalidate):
- `artwork.findMany({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' }, take: 8 })`
- `category.findMany({ where: { showInFilter: true }, orderBy: { filterOrder: 'asc' } })` (colunas já existem em `Category`)
- contagens: `count()` publicados + downloads (query única de agregado).

## Critérios de Aceite & Casos de Teste
- **CA-1** `GET /` retorna 200 (não 3xx) e contém headline, 8 cards, link "Explorar a loja".
- **CA-2** Lighthouse mobile Performance ≥ 90, SEO ≥ 95, A11y ≥ 95 na landing.
- **CA-3** Compartilhar `/` no simulador de link: OG título/descrição/imagem presentes.
- **CA-4** Cliques em "Novidades"/categorias levam à loja com filtro já aplicado via URL.
- **CA-5** Sem sessão ativa, nada de conteúdo dependente de role na landing (preços visíveis, downloads não).

## Non-goals (técnicos)
- Página de produto individual institucional, A/B testing, CMS headless.
- Migração do Header/MobileMenu existente.
- Imagens hero geradas por IA (usar artes do próprio acervo/brand existente em `public/`).
