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
          <span className="nks-eyebrow">Histórico do Navegador</span>
          <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-2xl md:text-3xl text-nks-black mt-2 mb-2">
            Meus Downloads
          </h1>
          <p className="text-sm text-nks-gray-700">
            Histórico das artes baixadas recentemente neste navegador.
          </p>
        </div>
        
        {history.length > 0 && (
          <Button 
            onClick={clearHistory} 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Limpar histórico
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 border border-nks-gray-200 bg-nks-gray-100 rounded max-w-lg mx-auto my-8">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-nks-black text-white mb-4">
            <History className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg text-nks-black mb-1.5">Sem downloads recentes</h3>
          <p className="text-sm text-nks-gray-700 mb-6 max-w-xs leading-normal">
            Você ainda não realizou downloads de arquivos editáveis na plataforma. Explore nosso acervo!
          </p>
          <Link href="/loja">
            <Button className="gap-1 px-5 h-9">
              Ir para a loja <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border border-nks-gray-200 rounded overflow-hidden bg-white shadow-nks-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-nks-black text-white border-b border-nks-gray-200 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Visual</th>
                  <th className="py-3.5 px-4">Arte / Título</th>
                  <th className="py-3.5 px-4">Formato</th>
                  <th className="py-3.5 px-4">Data do download</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nks-gray-200">
                {history.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-nks-gray-100 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="relative h-10 w-14 rounded overflow-hidden border border-nks-gray-200 bg-nks-gray-100">
                        <Image
                          src={item.previewUrl || '/placeholder.jpg'}
                          alt={item.artworkTitle}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-nks-black">
                      {item.artworkTitle}
                    </td>
                    <td className="py-3.5 px-4">
                      <FormatBadge format={item.format} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-nks-gray-400">
                      {formatDate(item.downloadedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link 
                        href={`/loja/${item.artworkId}`} 
                        className="inline-flex items-center gap-1 text-xs font-bold text-nks-red hover:underline hover:text-nks-red-dark"
                      >
                        Ver arte <ExternalLink className="h-3 w-3" />
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
