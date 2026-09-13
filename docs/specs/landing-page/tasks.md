# Tasks — landing-page

- [ ] T-1 Decidir copy final (headline, sub, 3 passos) com o produto — placeholder PT-BR até aprovar
- [ ] T-2 `src/app/page.tsx`: remover `redirect()`, criar Server Component com seções da RF-1
- [ ] T-3 Queries agregadas (novidades, categorias `showInFilter`, contagens) + `revalidate = 3600`
- [ ] T-4 Hero: imagem `<Image priority>` (arte do acervo ou `public/brand`), CTAs primário/secundário
- [ ] T-5 Faixa de novidades reutilizando `ArtworkCard` + scroll-snap CSS no mobile
- [ ] T-6 Grid de categorias linkando `/loja?cat=<id>` (parâmetro alinhado com `loja-server-side`)
- [ ] T-7 "Como funciona" + prova social com contagens reais
- [ ] T-8 `generateMetadata` + `metadataBase` + `public/og.png` + JSON-LD (Organization/ItemList)
- [ ] T-9 Revisão de design com @designer (hierarchy, spacing, motion mínimo) antes do QA final
- [ ] T-10 Lighthouse mobile/desktop (≥90 perf/SEO/a11y) + preview de OG (simulador de link)
- [ ] T-11 Smoke: `/`, filtros por categoria na loja, middleware não bloqueia `/`, `npm run test` verde
