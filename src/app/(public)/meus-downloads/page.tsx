'use client'

import * as React from 'react'
import { useDownloadHistory } from '@/hooks/useDownloadHistory'
import { FormatBadge } from '@/components/artwork/FormatBadge'
import { Button } from '@/components/ui/button'
import { Trash2, History, ArrowRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils/format'

export default function MeusDownloadsPage() {
  const { history, clearHistory } = useDownloadHistory()

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
            Meus Downloads
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Histórico das artes baixadas recentemente neste navegador.
          </p>
        </div>
        
        {history.length > 0 && (
          <Button 
            onClick={clearHistory} 
            variant="outline" 
            size="sm" 
            className="text-red-500 hover:text-red-700 hover:bg-red-50/50 gap-1.5 h-9 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Histórico
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-16 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl max-w-lg mx-auto my-8">
          <div className="p-4 bg-white dark:bg-slate-950 rounded-full shadow-sm mb-4">
            <History className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1.5">Sem downloads recentes</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-normal">
            Você ainda não realizou downloads de arquivos editáveis na plataforma. Explore nosso acervo!
          </p>
          <Link href="/loja">
            <Button className="rounded-full font-semibold gap-1 px-5 h-9">
              Ir para a Loja <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4">Visual</th>
                  <th className="py-3.5 px-4">Arte / Título</th>
                  <th className="py-3.5 px-4">Formato</th>
                  <th className="py-3.5 px-4">Data do Download</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="relative h-10 w-14 rounded-md overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50">
                        <Image
                          src={item.previewUrl || '/placeholder.jpg'}
                          alt={item.artworkTitle}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {item.artworkTitle}
                    </td>
                    <td className="py-3.5 px-4">
                      <FormatBadge format={item.format} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {formatDate(item.downloadedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link 
                        href={`/loja/${item.artworkId}`} 
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        Ver Arte <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
