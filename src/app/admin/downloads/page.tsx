'use client'

import * as React from 'react'
import { History, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAdminDownloads } from '@/hooks/useAdminDownloads'
import { formatRelativeTime } from '@/lib/utils/format'
import { motion } from 'framer-motion'

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
        ) : downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-nks-gray-100 flex items-center justify-center text-nks-gray-400">
              <History className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-nks-black">Nenhum download registrado</span>
              <span className="text-xs text-nks-gray-400 font-semibold max-w-[280px]">
                Quando os membros da equipe fizerem downloads de artes, os logs aparecerão aqui em tempo real.
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white border-b border-nks-gray-200/80 font-display font-extrabold text-[10px] uppercase tracking-[0.12em] text-nks-gray-400 select-none">
                  <th className="py-4.5 px-6 font-bold">Usuário</th>
                  <th className="py-4.5 px-6 font-bold">Arte</th>
                  <th className="py-4.5 px-6 font-bold text-center w-24">Formato</th>
                  <th className="py-4.5 px-6 font-bold w-36">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nks-gray-100">
                {downloads.map((log, index) => (
                  <motion.tr 
                    key={log.id} 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.5) }}
                    className="hover:bg-nks-gray-100/20 transition-colors"
                  >
                    {/* User */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-nks-black text-sm leading-tight">
                          {log.userName}
                        </span>
                        <span className="text-[11px] text-nks-gray-400 font-medium leading-none mt-1 font-sans">
                          {log.userEmail}
                        </span>
                      </div>
                    </td>

                    {/* Artwork */}
                    <td className="py-4 px-6 text-xs font-semibold text-nks-black">
                      {log.artworkTitle}
                    </td>

                    {/* Format */}
                    <td className="py-4 px-6 text-center">
                      <span className="inline-block font-mono text-[9px] px-2 py-0.5 border border-nks-gray-200/80 bg-white text-nks-gray-700 font-black rounded-sm shadow-sm select-none tracking-wider">
                        {log.format}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-6 text-xs text-nks-gray-400 font-semibold whitespace-nowrap">
                      {formatRelativeTime(log.createdAt)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
