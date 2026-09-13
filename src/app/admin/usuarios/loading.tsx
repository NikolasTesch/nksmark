export default function UsuariosLoading() {
  return (
    <div className="flex flex-col gap-6 py-4" aria-busy="true" aria-label="Carregando usuários">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-64 max-w-full animate-pulse rounded bg-nks-gray-200" />
        <div className="h-3 w-full max-w-md animate-pulse rounded bg-nks-gray-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[18px] items-start">
        <div className="lg:col-span-5 bg-white border border-nks-gray-200 p-6 rounded-sm shadow-nks-sm flex flex-col gap-4">
          <div className="h-3 w-40 animate-pulse rounded bg-nks-gray-100" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-sm bg-nks-gray-100" />
          ))}
          <div className="h-10 w-full animate-pulse rounded-sm bg-nks-gray-200" />
        </div>

        <div className="lg:col-span-7 bg-white border border-nks-gray-200 rounded-sm shadow-nks-sm overflow-hidden">
          <div className="h-11 bg-nks-black/80" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3.5 border-b border-nks-gray-200 last:border-b-0"
            >
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3.5 w-32 animate-pulse rounded bg-nks-gray-100" />
                <div className="h-2.5 w-40 animate-pulse rounded bg-nks-gray-100" />
              </div>
              <div className="h-5 w-14 animate-pulse rounded-sm bg-nks-gray-100" />
              <div className="h-8 w-8 animate-pulse rounded-sm bg-nks-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
