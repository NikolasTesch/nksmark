import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { LoadingGrid } from '@/components/shared/LoadingGrid'
import { LojaView } from './LojaView'
import { fetchArtworkPage } from '@/lib/artworks/query'
import { parseArtworkQuery } from '@/lib/validations/artwork-query'
import { logger as log } from '@/lib/utils/logger'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function toUrlSearchParams(sp: SearchParams): URLSearchParams {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach((v) => usp.append(key, v))
    else if (value !== undefined) usp.set(key, value)
  }
  return usp
}

export default async function LojaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const query = parseArtworkQuery(toUrlSearchParams(sp))
  const [result, categories, tags, counts] = await Promise.all([
    fetchArtworkPage(query),
    prisma.category.findMany({ where: { showInFilter: true }, orderBy: { filterOrder: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.artwork.groupBy({ by: ['categoryId'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
  ])

  const categoryCounts: Record<string, number> = {}
  for (const row of counts) categoryCounts[row.categoryId] = row._count._all

  return (
    <>
      <Header />
      <Suspense
        fallback={
          <div className="container mx-auto px-4 md:px-8 py-10">
            <LoadingGrid count={8} />
          </div>
        }
      >
        <LojaView
          items={result.items}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          categories={categories}
          tags={tags}
          categoryCounts={categoryCounts}
        />
      </Suspense>
      <Footer />
    </>
  )
}
