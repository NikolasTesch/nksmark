# Tasks — ui-feedback-polish

## Toast
- [x] T-1 Instalar `sonner`; montar `<Toaster />` em `src/app/layout.tsx` com estilo dos tokens NKS
- [x] T-2 Migrar toast artesanal de `admin/cupons/page.tsx` para `sonner` (remover código local)
- [x] T-3 Emissões no carrinho: add/remove item, cupom sucesso/erro (substituir `couponFeedback` inline)
- [x] T-4 Emissões em favorito (`useFavorites` mutações) e download/ZIP (`DownloadModal.tsx`)
- [ ] T-5 Toasts de erro de fetch em `useArtworks`/login/cadastro onde hoje há só console — `useArtworks`: lane hooks; login/cadastro já têm banner (não só console)

## Placeholder
- [x] T-6 Criar `public/placeholder.svg` com a marca (4:5, fundo cinza, monograma NKS vermelho)
- [x] T-7 Trocar as 5 referências `/placeholder.jpg` → `/placeholder.svg`
- [x] T-8 `onError`→ placeholder nos `<Image>` de `ArtworkCard`/listagens sem fallback

## Empty states
- [x] T-9 Carrinho vazio → `EmptyState` com CTA `/loja`
- [x] T-10 Loja sem resultados → `EmptyState` "Nenhuma arte encontrada" + botão limpar filtros — implementado em `LojaView.tsx`
- [x] T-11 Favoritos zerados (filtro "Só favoritas" ativo) → `EmptyState` com dica — implementado em `LojaView.tsx`
- [x] T-12 `/minhas-compras` e `/meus-downloads` vazios → `EmptyState` (compra: CTA loja; download: "explore o acervo" para FASE)
- [x] T-13 `/admin/chamados` sem tickets → `EmptyState`

## Galeria
- [x] T-14 Swipe horizontal troca imagem (Framer Motion drag, threshold 40px, sem conflito com scroll vertical)
- [x] T-15 Pinch-to-zoom no fullscreen (1x–4x, pan 1 dedo quando ampliado, `touch-action: none` no overlay)
- [x] T-16 Manter/regredir teclado+botões; testar em viewport mobile (browser panel)

## Skeletons + QA
- [x] T-17 `/meus-downloads` e `/minhas-compras`: `LoadingGrid`/skeleton de linha durante fetch inicial
- [x] T-18 Component tests (Vitest): empty state da loja; smoke do placeholder
- [x] T-19 `npm run test` + check visual responsivo das telas tocadas
