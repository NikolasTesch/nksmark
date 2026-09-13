'use client'

import * as React from 'react'
import { History, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAdminDownloads } from '@/hooks/useAdminDownloads'
import { formatRelativeTime } from '@/lib/utils/format'
import { DataTable } from '@/components/admin/DataTable'

export default function AdminDownloadLogsPage() {
  const { downloads, loading, error, refresh } = useAdminDownloads()

  return (
    <div className="flex flex-col gap-6 py-2 animate-in fade-in duration-300">
      
      {/* Title Header with Refresh Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-black uppercase tracking-tight text-nks-black mb-1 flex items-center gap-2.5">
            LOG DE DOWNLOADS
          </h1>
          <p className="text-xs font-semibold text-nks-gray-400">
            Quem baixou o quê, e quando.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center justify-center p-2.5 border border-nks-gray-200 bg-white hover:bg-nks-gray-100 text-nks-black rounded-sm transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
          title="Atualizar Logs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-nks-red' : 'text-nks-black'}`} />
        </button>
      </div>

      {error && (
        <div className="bg-nks-red-subtle border border-nks-red/20 p-4 rounded-sm flex items-center gap-3 text-xs font-semibold text-nks-red-dark">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button 
              onClick={refresh} 
              className="underline hover:text-nks-red cursor-pointer uppercase tracking-wider font-extrabold text-[10px]"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white border border-nks-gray-200 rounded-lg shadow-nks-sm overflow-hidden">
        {loading && downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
            <span className="text-xs text-nks-gray-400 font-semibold uppercase tracking-wider">
              Carregando logs de downloads...
            </span>
          </div>
        ) : (
          <DataTable
            headerVariant="light"
            rows={downloads}
            getRowKey={(log) => log.id}
            emptyTitle="Nenhum download registrado"
            emptyDescription="Quando os membros da equipe fizerem downloads de artes, os logs aparecerão aqui em tempo real."
            emptyIcon={History}
            columns={[
              {
                id: 'user',
                header: 'Usuário',
                headerClassName: 'sm:px-6',
                cellClassName: 'sm:px-6',
                render: (log) => (
                  <div className="flex flex-col">
                    <span className="font-bold text-nks-black text-xs sm:text-sm leading-tight">
                      {log.userName}
                    </span>
                    <span className="text-[10px] text-nks-gray-400 font-medium leading-none mt-1 font-sans hidden sm:block">
                      {log.userEmail}
                    </span>
                  </div>
                ),
              },
              {
                id: 'artwork',
                header: 'Arte',
                headerClassName: 'sm:px-6',
                cellClassName: 'sm:px-6 text-xs font-semibold text-nks-black max-w-[120px] sm:max-w-none',
                render: (log) => (
                  <span className="line-clamp-2 leading-snug">{log.artworkTitle}</span>
                ),
              },
              {
                id: 'format',
                header: 'Formato',
                align: 'center',
                headerClassName: 'sm:px-6 w-20 sm:w-24',
                cellClassName: 'sm:px-6',
                render: (log) => (
                  <span className="inline-block font-mono text-[9px] px-2 py-0.5 border border-nks-gray-200/80 bg-white text-nks-gray-700 font-black rounded-sm shadow-sm select-none tracking-wider">
                    {log.format}
                  </span>
                ),
              },
              {
                id: 'when',
                header: 'Quando',
                hideOnMobile: true,
                headerClassName: 'sm:px-6 w-28 sm:w-36',
                cellClassName: 'sm:px-6 text-xs text-nks-gray-400 font-semibold whitespace-nowrap',
                render: (log) => formatRelativeTime(log.createdAt),
              },
            ]}
          />
        )}
      </div>

    </div>
  )
}
