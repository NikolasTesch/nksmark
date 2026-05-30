import * as React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="flex-grow flex flex-col container mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
      <Footer />
    </>
  )
}
