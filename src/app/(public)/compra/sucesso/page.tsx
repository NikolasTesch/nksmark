'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function SucessoContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const [status, setStatus] = React.useState<'loading' | 'paid' | 'pending'>('loading')

  React.useEffect(() => {
    if (!orderId) {
      setStatus('pending')
      return
    }
    let active = true
    let tries = 0
    const maxTries = 15 // ~45s de polling

    // A confirmação autoritativa vem do webhook; aqui só consultamos o status.
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        const result = await res.json()
        if (!active) return
        if (result.success && result.data.status === 'PAID') {
          setStatus('paid')
          return
        }
      } catch {
        // ignora — tenta de novo
      }
      tries += 1
      if (active) {
        if (tries >= maxTries) setStatus('pending')
        else setTimeout(poll, 3000)
      }
    }
    poll()
    return () => {
      active = false
    }
  }, [orderId])

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-5 max-w-md mx-auto">
      {status === 'loading' && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-nks-red" />
          <h1 className="font-display text-2xl font-extrabold uppercase text-nks-black">Confirmando pagamento...</h1>
          <p className="text-sm text-nks-gray-700">
            Estamos confirmando seu pagamento com o Mercado Pago. Isso leva apenas alguns segundos.
          </p>
        </>
      )}

      {status === 'paid' && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="font-display text-2xl font-extrabold uppercase text-nks-black">Pagamento confirmado!</h1>
          <p className="text-sm text-nks-gray-700">
            Sua arte já está liberada. Enviamos também um e-mail de confirmação. Acesse seus downloads agora.
          </p>
          <Link href="/minhas-compras">
            <Button size="lg" className="gap-2">
              Ir para Minhas Compras <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </>
      )}

      {status === 'pending' && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Clock className="h-9 w-9" />
          </div>
          <h1 className="font-display text-2xl font-extrabold uppercase text-nks-black">Quase lá!</h1>
          <p className="text-sm text-nks-gray-700">
            Seu pagamento ainda está sendo processado. Assim que for confirmado, sua arte aparecerá em
            Minhas Compras e você receberá um e-mail.
          </p>
          <Link href="/minhas-compras">
            <Button size="lg" variant="secondary" className="gap-2">
              Ver Minhas Compras <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}

export default function CompraSucessoPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
        </div>
      }
    >
      <SucessoContent />
    </React.Suspense>
  )
}
