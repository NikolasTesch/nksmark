# PRD — ui-feedback-polish

## Problema
A loja e o admin funcionam, mas a superfície de feedback visual tem 4 furos concretos no código de hoje:

1. **Sem toast global.** O único feedback de ação é inline; `src/app/admin/cupons/page.tsx`
   implementou um toast artesanal local que não é reutilizável. Carrinho, cupom, favorito e
   download usam estados inline distintos (`couponFeedback` na página do carrinho) ou nada.
2. **Placeholder quebrado.** `/placeholder.jpg` é referenciado em `ArtworkPreview.tsx` (3x),
   `meus-downloads/page.tsx:87` e `minhas-compras/page.tsx:149` — o arquivo **não existe** em
   `public/` (confirmado). Toda imagem quebrada hoje mostra o ícone morto do navegador.
3. **Empty states inconsistentes.** Existe `src/components/shared/EmptyState.tsx`, mas carrinho
   vazio, zero resultados na loja, sem favoritos e sem compras renderizam variações ad-hoc.
4. **Galeria limitada no mobile.** `ArtworkPreview.tsx` tem setas de teclado e zoom fullscreen,
   mas não tem gestos de toque (arrastar para trocar, pinçar para zoom) — o device mais usado
   para vitrine.

## Persona afetada
Visitante/cliente na loja pública (`/loja`, `/loja/[slug]`, `/carrinho`, `/minhas-compras`,
`/meus-downloads`) e admin usando cupons.

## Métricas de sucesso
- 100% das ações mutativas cliente (cupom, carrinho, favorito, download) com feedback ≤300ms após resposta da API.
- Zero requisições 404 a `/placeholder.jpg` em produção.
- Manutenção: um único componente de toast e um único de empty state usados nas 2 superfícies.
- Galeria operável por toque no mobile (trocar imagem por swipe).

## Fora de escopo (produto)
- Redesenho das telas; só feedback/estado.
- Favoritos persistidos no servidor (outra spec).
- Migração do toast artesanal de cupons faz parte, mas sem redesign do admin.
