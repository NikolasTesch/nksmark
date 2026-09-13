export default function ArtesLoading() {
  return (
    <div className="flex flex-col gap-6 py-4" aria-busy="true" aria-label="Carregando artes">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-nks-gray-200/50">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-28 animate-pulse rounded bg-nks-gray-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-nks-gray-100" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-nks-gray-200" />
      </div>

      <div className="h-[58px] animate-pulse rounded-xl border border-nks-gray-200 bg-white" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-nks-gray-200 rounded-xl overflow-hidden shadow-nks-sm flex flex-col"
          >
            <div className="aspect-[4/3] w-full animate-pulse bg-nks-gray-100" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-nks-gray-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-nks-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
