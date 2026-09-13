export default function ChamadosLoading() {
  return (
    <div className="flex flex-col gap-6 py-2" aria-busy="true" aria-label="Carregando chamados">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 max-w-full animate-pulse rounded bg-nks-gray-200" />
          <div className="h-3 w-72 max-w-full animate-pulse rounded bg-nks-gray-100" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-sm bg-nks-gray-200" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-nks-gray-200 rounded-lg p-4 shadow-nks-sm flex flex-col gap-3"
          >
            <div className="h-2.5 w-28 animate-pulse rounded bg-nks-gray-100" />
            <div className="h-7 w-12 animate-pulse rounded bg-nks-gray-200" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-nks-gray-200 rounded-lg shadow-nks-sm p-4 flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-3.5 w-40 animate-pulse rounded bg-nks-gray-100" />
              <div className="h-5 w-16 animate-pulse rounded-sm bg-nks-gray-100" />
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-nks-gray-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-nks-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
