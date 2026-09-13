import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { LoadingGrid } from '@/components/shared/LoadingGrid'

export default function LojaLoading() {
  return (
    <>
      <Header />

      <section className="bg-nks-black border-b border-white/10" aria-hidden>
        <div className="container mx-auto px-4 md:px-8 py-7 md:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex flex-col gap-3 max-w-lg">
            <div className="h-2.5 w-24 animate-pulse rounded bg-white/15" />
            <div className="h-7 w-72 max-w-full animate-pulse rounded bg-white/20" />
            <div className="h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="h-10 w-full max-w-sm animate-pulse rounded border border-white/15 bg-white/10 mt-1" />
          </div>
          <div className="flex gap-8">
            <div className="h-10 w-16 animate-pulse rounded bg-white/15" />
            <div className="h-10 w-16 animate-pulse rounded bg-white/15" />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-8 py-6 md:py-10 flex gap-10 items-start">
        <aside className="hidden lg:flex w-[230px] shrink-0 flex-col gap-5" aria-hidden>
          <div className="h-2.5 w-20 animate-pulse rounded bg-nks-gray-100" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-full animate-pulse rounded bg-nks-gray-100" />
          ))}
        </aside>

        <div className="flex-grow min-w-0 w-full">
          <div className="flex items-end justify-between border-b border-nks-gray-200 pb-3 mb-5" aria-hidden>
            <div className="flex flex-col gap-2">
              <div className="h-5 w-40 animate-pulse rounded bg-nks-gray-100" />
              <div className="h-3 w-16 animate-pulse rounded bg-nks-gray-100" />
            </div>
            <div className="h-9 w-32 animate-pulse rounded bg-nks-gray-100" />
          </div>
          <LoadingGrid count={8} />
        </div>
      </div>

      <Footer />
    </>
  )
}
