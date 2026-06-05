import Link from 'next/link'
import { XCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CompraFalhaPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-5 max-w-md mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nks-red-subtle text-nks-red">
        <XCircle className="h-9 w-9" />
      </div>
      <h1 className="font-display text-2xl font-extrabold uppercase text-nks-black">Pagamento não concluído</h1>
      <p className="text-sm text-nks-gray-700">
        Não foi possível concluir seu pagamento. Nenhum valor foi cobrado. Você pode tentar novamente a
        qualquer momento direto na página da arte.
      </p>
      <Link href="/loja">
        <Button size="lg" variant="secondary" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Button>
      </Link>
    </div>
  )
}
