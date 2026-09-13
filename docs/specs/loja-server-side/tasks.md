# Tasks — loja-server-side

- [x] T-1 `src/lib/validations/artwork-query.ts`: Zod schema dos params (`q, cat, tag, free, sort, page, pageSize, ids`)
- [x] T-2 `src/lib/artworks/query.ts`: `buildWhere` + `fetchPage` (Prisma, sort por opção, `skip/take`, contagem)
- [x] T-3 FTS paginada: SQL com `LIMIT/OFFSET` + `COUNT(*) OVER()`; extrair para o helper; confirmar índices GIN/btree em produção
- [x] T-4 Atualizar `src/app/api/artworks/route.ts` para usar o helper (contrato `{items,total,page,pageSize}`); remover `/api/artworks/search` e suas chamadas em `useArtworks.ts`
- [x] T-5 `/loja` → Server Component: ler `searchParams`, chamar `fetchPage`, `<Suspense>` + `loading.tsx` com `LoadingGrid`
- [x] T-6 `useArtworkFilters` derivado 100% de `useSearchParams`; trocar-filtro-reseta-page; manter drawer mobile
- [x] T-7 Overlay de favoritos: enviar `ids` do localStorage (cap 200) quando `fav=1`; revalidar na mutação (`useRouter.refresh()`)
- [x] T-8 Chips de filtros ativos removíveis (aria-labels, "limpar tudo")
- [x] T-9 Ordenação server-side espelhando semântica atual (`recent|downloads|az|free`)
- [x] T-10 Atualizar `/loja/[slug]` (relacionadas por `categoryId` máx.5) para o mesmo helper — sem mudança visual
- [x] T-11 Testes: rota (paginação/clamp/ids/SQL-safe) + helper unit + smoke da página
- [ ] T-12 Medir payload inicial antes/depois com seed de ~500 artes; registrar no PRD
- [x] T-13 `npm run test` + revisão manual mobile (chips, drawer, share URL) — testes VERDES; revisão manual mobile pendente de execução humana
