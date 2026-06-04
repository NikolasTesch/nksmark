import type { Metadata } from 'next'
import { Archivo, DM_Sans, IBM_Plex_Mono } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// Display quadrada e geométrica — ecoa o lettering anguloso da logo
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-archivo',
})

// Sans funcional — todo o trabalho de texto
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
})

// Mono — restrita a formatos de arquivo e snippets técnicos
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'NKS Art — Catálogo Digital de Artes de Alta Fidelidade',
    template: '%s | NKS Art'
  },
  description: 'Catálogo premium de artes e arquivos editáveis para sublimação, estamparias e designers. Baixe arquivos em alta resolução CDR, AI, PDF e fontes exclusivas.',
  keywords: ['sublimacao', 'estampa', 'vetores', 'coreldraw', 'illustrator', 'fontes', 'artes digitais'],
  authors: [{ name: 'NKS Art Studio' }],
  icons: {
    icon: '/favicon.ico',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${dmSans.variable} ${ibmPlexMono.variable} font-sans`}>
      <body className="min-h-screen bg-background text-foreground flex flex-col antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
