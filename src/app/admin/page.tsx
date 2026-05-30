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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-1.5">
          Dashboard Administrativo
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerenciamento e estatísticas gerais da plataforma NKS Art.
        </p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-450" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total de Artes"
              value={String(stats.artworks)}
              description="Ativas / Publicadas"
              icon={<ImageIcon className="h-5 w-5" />}
            />
            <StatsCard
              title="Total de Downloads"
              value={String(stats.downloads)}
              description="Downloads registrados"
              icon={<DownloadCloud className="h-5 w-5" />}
            />
            <StatsCard
              title="Categorias"
              value={String(stats.categories)}
              description="Divisões do catálogo"
              icon={<FolderHeart className="h-5 w-5" />}
            />
            <StatsCard
              title="Membros Equipe"
              value={String(stats.users)}
              description="Usuários homologados"
              icon={<Users className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="h-4.5 w-4.5" /> Downloads Recentes
              </span>
              <div className="flex flex-col gap-3">
                {recentDownloads.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-205">{log.art}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{log.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-1.5 py-0.5 font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-350 rounded border border-slate-300/40">
                        {log.format}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(log.time)}</span>
                    </div>
                  </div>
                ))}
                {recentDownloads.length === 0 && (
                  <div className="text-center text-sm text-slate-400 py-6">Nenhum download registrado recentemente.</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-fit">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5" /> Ações Rápidas
              </span>
              <div className="flex flex-col gap-2.5">
                <Link href="/admin/artes/nova" className="w-full">
                  <button className="w-full text-center py-2.5 bg-gradient-to-r from-violet-650 to-indigo-650 text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer">
                    Cadastrar Nova Arte
                  </button>
                </Link>
                <Link href="/admin/conteudo" className="w-full">
                  <button className="w-full text-center py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer">
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
