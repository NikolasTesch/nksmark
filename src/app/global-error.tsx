'use client'

import { Archivo, DM_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Button } from '@/components/ui/button'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-archivo',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
})

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${dmSans.variable} ${ibmPlexMono.variable} font-sans`}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col antialiased">
        <main className="flex-grow flex items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center text-center gap-5 max-w-md">
            <span className="nks-eyebrow">Erro</span>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-nks-black">
              Algo deu errado
            </h1>
            <p className="text-sm text-nks-gray-700 leading-relaxed">
              A página não carregou. Tente de novo; se o problema continuar, volte para a loja.
            </p>
            {error.digest ? (
              <p className="font-mono text-[11px] text-nks-gray-400">
                Código: {error.digest}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button onClick={reset}>Tentar novamente</Button>
              {/* global-error renderiza fora do contexto do router — <a> é o único link possível aqui */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/loja">
                <Button variant="ghost">Ir para a loja</Button>
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
