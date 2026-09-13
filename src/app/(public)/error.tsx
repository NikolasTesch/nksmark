'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 md:py-24 gap-5 max-w-md mx-auto">
      <span className="nks-eyebrow">Erro</span>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-nks-black">
        Algo deu errado
      </h1>
      <p className="text-sm text-nks-gray-700 leading-relaxed">
        Não conseguimos carregar esta página. Tente de novo ou volte para a loja.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link href="/loja">
          <Button variant="ghost">Ir para a loja</Button>
        </Link>
      </div>
    </div>
  )
}
