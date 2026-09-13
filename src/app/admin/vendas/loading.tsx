export default function VendasLoading() {
  return (
    <div className="flex flex-col gap-8 py-4" aria-busy="true" aria-label="Carregando vendas">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-36 animate-pulse rounded bg-nks-gray-200" />
          <div className="h-3 w-56 animate-pulse rounded bg-nks-gray-100" />
        </div>
        <div className="h-10 w-48 animate-pulse rounded-sm bg-nks-gray-200" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-nks-gray-200 rounded-sm p-5 shadow-nks-sm min-h-[105px] flex flex-col gap-3"
          >
            <div className="h-2.5 w-24 animate-pulse rounded bg-nks-gray-100" />
            <div className="h-7 w-28 animate-pulse rounded bg-nks-gray-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-nks-gray-100" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4 min-h-[280px]">
        <div className="h-3 w-32 animate-pulse rounded bg-nks-gray-100" />
        <div className="flex-1 animate-pulse rounded-sm bg-nks-gray-100/60" />
      </div>

      <div className="bg-white border border-nks-gray-200 rounded-sm overflow-hidden shadow-nks-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-nks-gray-200 last:border-b-0"
          >
            <div className="h-3.5 flex-1 animate-pulse rounded bg-nks-gray-100" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-nks-gray-100" />
            <div className="h-3.5 w-16 animate-pulse rounded bg-nks-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
