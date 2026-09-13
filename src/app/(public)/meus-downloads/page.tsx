'use client'

import * as React from 'react'
import { useDownloadHistory, type DownloadHistoryItem } from '@/hooks/useDownloadHistory'
import { FormatBadge } from '@/components/artwork/FormatBadge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { History, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils/format'

export default function MeusDownloadsPage() {
  const { history, loading, error, refresh } = useDownloadHistory()

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="nks-eyebrow">Histórico da Conta</span>
          <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-2xl md:text-3xl text-nks-black mt-2 mb-2">
            Meus Downloads
          </h1>
          <p className="text-sm text-nks-gray-700">
            Todas as artes baixadas pela sua conta, sincronizadas entre dispositivos.
          </p>
        </div>
      </div>

      {loading ? (
        <DownloadsSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center text-center p-12 border border-nks-gray-200 bg-nks-gray-100 rounded max-w-lg mx-auto my-8">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-nks-red text-white mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg text-nks-black mb-1.5">Erro ao carregar histórico</h3>
          <p className="text-sm text-nks-gray-700 mb-6 max-w-xs leading-normal">{error}</p>
          <Button onClick={refresh} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sem downloads recentes"
          description="Você ainda não realizou downloads de arquivos editáveis na plataforma. Explore o acervo."
          actionHref="/loja"
          actionLabel="Explore o acervo"
        />
      ) : (
        <div className="border border-nks-gray-200 rounded overflow-hidden bg-white shadow-nks-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[480px]">
              <thead>
                <tr className="bg-nks-black text-white border-b border-nks-gray-200 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Visual</th>
                  <th className="py-3.5 px-4">Arte / Título</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Formato</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Data do download</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nks-gray-200">
                {history.map((item, idx) => (
                  <DownloadRow key={`${item.id}-${idx}`} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function DownloadRow({ item }: { item: DownloadHistoryItem }) {
  const [imgFailed, setImgFailed] = React.useState(false)
  return (
    <tr className="hover:bg-nks-gray-100 transition-colors">
      <td className="py-3.5 px-4">
        <div className="relative h-10 w-14 rounded overflow-hidden border border-nks-gray-200 bg-nks-gray-100 shrink-0">
          <Image
            src={imgFailed ? '/placeholder.svg' : item.previewUrl || '/placeholder.svg'}
            alt={item.artworkTitle}
            fill
            className="object-cover"
            onError={() => setImgFailed(true)}
          />
        </div>
      </td>
      <td className="py-3.5 px-4 font-semibold text-nks-black max-w-[160px] sm:max-w-none">
        <span className="line-clamp-2 leading-snug">{item.artworkTitle}</span>
      </td>
      <td className="py-3.5 px-4 hidden sm:table-cell">
        <FormatBadge format={item.format} />
      </td>
      <td className="py-3.5 px-4 text-xs text-nks-gray-400 hidden md:table-cell whitespace-nowrap">
        {formatDate(item.downloadedAt)}
      </td>
      <td className="py-3.5 px-4 text-right">
        <Link
          href={`/loja/${item.artworkSlug ?? item.artworkId}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-nks-red hover:underline hover:text-nks-red-dark whitespace-nowrap"
        >
          Ver arte <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  )
}

function DownloadsSkeleton() {
  return (
    <div className="border border-nks-gray-200 rounded overflow-hidden bg-white">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-nks-gray-200 last:border-b-0">
          <div className="h-10 w-14 shrink-0 animate-pulse rounded bg-nks-gray-100" />
          <div className="h-3 flex-1 max-w-[200px] animate-pulse rounded bg-nks-gray-100" />
          <div className="hidden sm:block h-3 w-12 animate-pulse rounded bg-nks-gray-100" />
          <div className="hidden md:block h-3 w-24 animate-pulse rounded bg-nks-gray-100" />
        </div>
      ))}
    </div>
  )
}
