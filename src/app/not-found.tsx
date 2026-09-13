import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-20">
        <div className="flex flex-col items-center text-center gap-5 max-w-md">
          <span className="nks-eyebrow">404</span>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-nks-black">
            Página não encontrada
          </h1>
          <p className="text-sm text-nks-gray-700 leading-relaxed">
            Esse endereço não existe ou a arte saiu do catálogo. Confira o link ou volte para a loja.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link href="/loja">
              <Button>Ir para a loja</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Ir para o início</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
