'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ArtworkPreview } from '@/components/artwork/ArtworkPreview'
import { DownloadModal } from '@/components/artwork/DownloadModal'
import { FormatBadge } from '@/components/artwork/FormatBadge'
import { CategoryBadge } from '@/components/shared/CategoryBadge'
import { TagBadge } from '@/components/shared/TagBadge'
import { Button } from '@/components/ui/button'
import { ArtworkWithRelations } from '@/types/artwork'
import { File as PrismaFile } from '@prisma/client'
import { Download, Lock, ChevronLeft, Calendar, FileType, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'

export default function ArtworkDetailsPage() {
  const { slug } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [downloadModalOpen, setDownloadModalOpen] = React.useState(false)
  const [artwork, setArtwork] = React.useState<ArtworkWithRelations | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch(`/api/artworks?slug=${slug}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setArtwork(res.data[0])
        } else {
          setArtwork(null)
        }
      })
      .catch(() => setArtwork(null))
      .finally(() => setLoading(false))
  }, [slug])

  const userRole = (session?.user as { role?: string })?.role
  const isFaseOrAdmin = userRole === 'FASE' || userRole === 'ADMIN'

  // Galeria: imagem principal + mockups (PNG/JPG) que tenham url pública liberada.
  const galleryImages = React.useMemo(() => {
    if (!artwork) return []
    const images = [artwork.previewUrl]
    for (const file of artwork.files) {
      if ((file.format === 'PNG' || file.format === 'JPG') && file.url) {
        images.push(file.url)
      }
    }
    return Array.from(new Set(images.filter(Boolean)))
  }, [artwork])

  const handleDownloadClick = () => {
    if (!artwork) return
    if (isFaseOrAdmin) {
      setDownloadModalOpen(true)
    } else {
      router.push(`/login?callbackUrl=/loja/${artwork.slug}`)
    }
  }

  const handleDownloadRequest = async (fileId: string, email?: string): Promise<string | null> => {
    if (!artwork) return null
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: artwork.id,
          fileId: fileId
        })
      })
      const result = await res.json()
      if (result.success && result.data?.downloadUrl) {
        return result.data.downloadUrl
      }
      // Falha real (autorização, status da arte, etc.) — não fabricar URL.
      console.warn('Backend download call failed:', result.error)
      return null
    } catch (e) {
      console.error('Error recording download:', e)
      return null
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-nks-gray-400" />
          <span className="text-sm text-nks-gray-700 font-semibold">Carregando detalhes da arte...</span>
        </main>
        <Footer />
      </>
    )
  }

  if (!artwork) {
    return (
      <>
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center py-24 gap-4">
          <span className="text-base text-nks-gray-700 font-semibold">Arte não localizada no catálogo.</span>
          <Link href="/loja">
            <Button className="rounded-xl">Voltar para o catálogo</Button>
          </Link>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-grow flex flex-col container mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-300 gap-8">
        <div>
          <Link href="/loja" className="inline-flex items-center gap-1 text-sm font-semibold text-nks-gray-400 hover:text-nks-red transition-colors">
            <ChevronLeft className="h-4 w-4" /> Voltar para o catálogo
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 flex flex-col gap-4">
            <ArtworkPreview
              url={artwork.previewUrl}
              title={artwork.title}
              images={galleryImages}
              formats={artwork.files.map((f) => f.format)}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6 p-6 bg-white border border-nks-gray-200 rounded-lg shadow-nks-sm h-fit">
            
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge name={artwork.category.name} color={artwork.category.color} />
                {artwork.isFree && (
                  <span className="inline-flex items-center gap-1 bg-nks-red text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm">
                    <Sparkles className="h-3 w-3" /> Grátis
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-[-0.015em] text-nks-black leading-tight mt-1">
                {artwork.title}
              </h1>
              <div className="flex items-center gap-4 text-xs text-nks-gray-400 mt-1 font-semibold">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {formatDate(artwork.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FileType className="h-3.5 w-3.5" /> {artwork.files.length} {artwork.files.length === 1 ? 'formato' : 'formatos'}
                </span>
              </div>
            </div>

            {artwork.description && (
              <div className="flex flex-col gap-2 border-t border-nks-gray-200 pt-4">
                <span className="text-xs font-bold text-nks-gray-400 uppercase tracking-wider">Sobre esta arte</span>
                <p className="text-sm text-nks-gray-700 leading-relaxed">
                  {artwork.description}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-nks-gray-200 pt-4">
              <span className="text-xs font-bold text-nks-gray-400 uppercase tracking-wider">
                Disponível para download em:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {artwork.files.map((file) => (
                  <FormatBadge key={file.id} format={file.format} />
                ))}
              </div>
            </div>

            {artwork.tags.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-nks-gray-200 pt-4">
                <span className="text-xs font-bold text-nks-gray-400 uppercase tracking-wider">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {artwork.tags.map((tag) => (
                    <TagBadge key={tag.id} name={tag.name} />
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-nks-gray-200 pt-6 mt-2">
              <Button
                onClick={handleDownloadClick}
                size="lg"
                className="w-full gap-2 font-bold h-12"
                variant={isFaseOrAdmin ? 'default' : 'secondary'}
              >
                {isFaseOrAdmin ? (
                  <>
                    <Download className="h-5 w-5 animate-pulse" />
                    Liberar downloads
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Entrar como equipe para baixar
                  </>
                )}
              </Button>
              
              <p className="text-[10px] text-nks-gray-400 text-center leading-normal mt-2.5 max-w-xs mx-auto">
                {isFaseOrAdmin 
                  ? 'Downloads diretos a partir do nosso Cloudflare R2 privado.' 
                  : 'Arquivos protegidos por direitos autorais. Acesso restrito a designers homologados.'}
              </p>
            </div>
          </div>
        </div>

        <DownloadModal
          open={downloadModalOpen}
          onOpenChange={setDownloadModalOpen}
          artwork={artwork}
          files={artwork.files as PrismaFile[]}
          userRole={userRole}
          onDownloadRequest={handleDownloadRequest}
        />
      </main>
      <Footer />
    </>
  )
}
