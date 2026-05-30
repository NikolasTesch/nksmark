import * as React from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { ArrowRight } from 'lucide-react'
import { ArtworkWithRelations } from '@/types/artwork'
import { Status } from '@prisma/client'
import prisma from '@/lib/prisma'

const mockFeaturedArtworks: ArtworkWithRelations[] = [
  {
    id: 'f1',
    title: 'Estampa Camiseta Automotiva Vintage Car',
    slug: 'estampa-camiseta-automotiva-vintage-car',
    description: 'Vetor completo de altíssima definição para sublimação e serigrafia. Ajustado em curvas perfeitas com paletas harmônicas de azul e dourado vintage.',
    status: Status.PUBLISHED,
    isFree: true,
    previewUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c1',
    category: { id: 'c1', name: 'Estampas', slug: 'estampas', color: '#10b981', showInFilter: true, filterOrder: 1 },
    tags: [{ id: 't1', name: 'sublimacao' }, { id: 't2', name: 'automotivo' }],
    files: [
      { id: 'file1', format: 'CDR', url: '#', size: 12500000, artworkId: 'f1' },
      { id: 'file2', format: 'AI', url: '#', size: 18400000, artworkId: 'f1' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'f2',
    title: 'Pacote Fontes Caligráficas para Casamentos',
    slug: 'pacote-fontes-caligraficas-para-casamentos',
    description: 'Arquivos de fontes em formato OTF com curvas elegantes e ligaduras completas para convites de luxo, marcas de noivas e lettering decorativo.',
    status: Status.PUBLISHED,
    isFree: false,
    previewUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c2',
    category: { id: 'c2', name: 'Fontes', slug: 'fontes', color: '#ec4899', showInFilter: true, filterOrder: 2 },
    tags: [{ id: 't3', name: 'casamento' }, { id: 't4', name: 'fontes' }],
    files: [
      { id: 'file3', format: 'OTF', url: '#', size: 450000, artworkId: 'f2' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'f3',
    title: 'Kit Vetores Logotipos Esportivos 2026',
    slug: 'kit-vetores-logotipos-esportivos-2026',
    description: 'Vetores esportivos geométricos e dinâmicos para equipes de corrida, futebol, e-sports e marcas atléticas. Totalmente adaptáveis em Corel e Illustrator.',
    status: Status.PUBLISHED,
    isFree: true,
    previewUrl: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c3',
    category: { id: 'c3', name: 'Vetores', slug: 'vetores', color: '#3b82f6', showInFilter: true, filterOrder: 3 },
    tags: [{ id: 't5', name: 'esportivo' }, { id: 't6', name: 'logos' }],
    files: [
      { id: 'file4', format: 'AI', url: '#', size: 24500000, artworkId: 'f3' },
      { id: 'file5', format: 'PDF', url: '#', size: 15100000, artworkId: 'f3' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export default async function HomePage() {
  let featuredArtworks: ArtworkWithRelations[] = []
  try {
    const dbArtworks = await prisma.artwork.findMany({
      where: { status: Status.PUBLISHED },
      take: 3,
      include: {
        category: true,
        tags: true,
        files: true
      },
      orderBy: { createdAt: 'desc' }
    })
    featuredArtworks = dbArtworks.length > 0 ? (dbArtworks as unknown as ArtworkWithRelations[]) : mockFeaturedArtworks
  } catch (e) {
    console.error('Error fetching featured artworks from database:', e)
    featuredArtworks = mockFeaturedArtworks
  }

  return (
    <>
      <Header />

      {/* Hero editorial — preto sólido, display Archivo, vermelho só na ação */}
      <section className="bg-nks-black text-white">
        <div className="container mx-auto px-4 md:px-8 py-16 md:py-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          <div className="max-w-2xl">
            <span className="nks-eyebrow">Catálogo NKS Art</span>
            <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-4xl sm:text-5xl md:text-6xl mt-3 mb-4 text-white">
              Artes prontas para sublimação
            </h1>
            <p className="text-[15px] md:text-base text-white/60 leading-relaxed max-w-xl">
              Catálogo curado de estampas, frases e elementos vetoriais. Baixe em{' '}
              <span className="font-mono text-white/80">CDR</span>,{' '}
              <span className="font-mono text-white/80">AI</span>,{' '}
              <span className="font-mono text-white/80">PDF</span> e{' '}
              <span className="font-mono text-white/80">OTF</span> — liberado para a equipe.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/loja"
                className="inline-flex h-12 items-center justify-center gap-2 rounded bg-nks-red px-8 text-[15px] font-medium text-white transition-colors duration-[160ms] hover:bg-nks-red-dark"
              >
                Ver coleção <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
              <Link
                href="/sugerir-arte"
                className="inline-flex h-12 items-center justify-center gap-2 rounded border border-white/20 px-8 text-[15px] font-medium text-white transition-colors duration-[160ms] hover:bg-white/10"
              >
                Sugerir arte
              </Link>
            </div>
          </div>

          {/* Stats discretas */}
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-3xl leading-none text-nks-red-light">1.240</span>
              <span className="text-[11px] uppercase tracking-[0.1em] text-white/50 mt-1.5">artes</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-3xl leading-none text-nks-red-light">6</span>
              <span className="text-[11px] uppercase tracking-[0.1em] text-white/50 mt-1.5">categorias</span>
            </div>
          </div>
        </div>
      </section>


      {/* Destaques do catálogo */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
            <div>
              <span className="nks-eyebrow">Em destaque</span>
              <h2 className="font-display font-bold uppercase tracking-[-0.015em] text-2xl md:text-3xl text-nks-black mt-2">
                Artes recém-adicionadas
              </h2>
            </div>
            <Link href="/loja" className="inline-flex items-center gap-1 text-sm font-semibold text-nks-red hover:text-nks-red-dark">
              Ver tudo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
            {featuredArtworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
