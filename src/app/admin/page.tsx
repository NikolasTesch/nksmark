'use client'

import * as React from 'react'
import { StatsCard } from '@/components/admin/StatsCard'
import { DownloadCloud, ImageIcon, FolderHeart, Users, ShieldCheck, History, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAdminStats } from '@/hooks/useAdminStats'
import { formatDate } from '@/lib/utils/format'

export default function AdminDashboard() {
  const { data, loading } = useAdminStats()

  const stats = data?.stats || {
    artworks: 0,
    downloads: 0,
    categories: 0,
    users: 0,
  }

  const recentDownloads = data?.recentDownloads || []

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      <div>
        <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black mb-1.5">
          Dashboard Administrativo
        </h1>
        <p className="text-xs font-semibold text-nks-gray-700">
          Gerenciamento e estatísticas gerais da plataforma NKS Art.
        </p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
            <StatsCard
              title="Total de Artes"
              value={stats.artworks}
              description="Ativas / Publicadas"
              icon={<ImageIcon className="h-4.5 w-4.5" />}
            />
            <StatsCard
              title="Total de Downloads"
              value={stats.downloads}
              description="Downloads registrados"
              icon={<DownloadCloud className="h-4.5 w-4.5" />}
            />
            <StatsCard
              title="Categorias"
              value={stats.categories}
              description="Divisões do catálogo"
              icon={<FolderHeart className="h-4.5 w-4.5" />}
            />
            <StatsCard
              title="Membros Equipe"
              value={stats.users}
              description="Usuários homologados"
              icon={<Users className="h-4.5 w-4.5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px]">
            
            <div className="lg:col-span-2 bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-nks-red" /> Downloads Recentes
              </span>
              <div className="flex flex-col gap-2.5">
                {recentDownloads.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-3 border border-nks-gray-100 rounded-sm bg-nks-gray-100/40 hover:bg-nks-gray-100/80 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-nks-black">{log.art}</span>
                      <span className="text-[10px] text-nks-gray-400 font-semibold">{log.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] px-2 py-0.5 font-black bg-nks-black text-white rounded-sm border border-nks-black">
                        {log.format}
                      </span>
                      <span className="text-[10px] text-nks-gray-400 font-semibold">{formatDate(log.time)}</span>
                    </div>
                  </div>
                ))}
                {recentDownloads.length === 0 && (
                  <div className="text-center text-xs text-nks-gray-400 py-8 border border-dashed border-nks-gray-200 rounded-sm bg-nks-gray-100/20">
                    Nenhum download registrado recentemente.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4 h-fit">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-nks-red" /> Ações Rápidas
              </span>
              <div className="flex flex-col gap-2.5">
                <Link href="/admin/artes/nova" className="w-full">
                  <button className="w-full text-center py-3 bg-nks-red hover:bg-nks-red-dark text-white font-display uppercase tracking-wider font-extrabold text-xs rounded-sm transition-all active:scale-[0.99] cursor-pointer">
                    Cadastrar Nova Arte
                  </button>
                </Link>
                <Link href="/admin/conteudo" className="w-full">
                  <button className="w-full text-center py-3 border border-nks-black bg-white hover:bg-nks-gray-100 text-nks-black font-display uppercase tracking-wider font-extrabold text-xs rounded-sm transition-all active:scale-[0.99] cursor-pointer">
                    Gerenciar Conteúdo
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
