'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col gap-5 py-8 max-w-lg">
      <span className="nks-eyebrow">Painel</span>
      <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black leading-none">
        Falha ao carregar
      </h1>
      <p className="text-sm text-nks-gray-700 leading-relaxed">
        Esta tela do painel quebrou. Tente de novo; se persistir, anote o código e avise o time.
      </p>
      {error.digest ? (
        <p className="font-mono text-[11px] text-nks-gray-400 bg-white border border-nks-gray-200 rounded px-3 py-2">
          digest: {error.digest}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link href="/admin">
          <Button variant="ghost">Voltar ao painel</Button>
        </Link>
      </div>
    </div>
  )
}
