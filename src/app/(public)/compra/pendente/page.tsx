import Link from 'next/link'
import { Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CompraPendentePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-5 max-w-md mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Clock className="h-9 w-9" />
      </div>
      <h1 className="font-display text-2xl font-extrabold uppercase text-nks-black">Pagamento pendente</h1>
      <p className="text-sm text-nks-gray-700">
        Seu pagamento está sendo processado (ex.: boleto ou Pix aguardando compensação). Assim que for
        confirmado, sua arte ficará disponível em Minhas Compras e enviaremos um e-mail.
      </p>
      <Link href="/minhas-compras">
        <Button size="lg" className="gap-2">
          Ver Minhas Compras <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
