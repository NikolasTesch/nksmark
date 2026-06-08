'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ArtworkPreview } from '@/components/artwork/ArtworkPreview'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { DownloadModal } from '@/components/artwork/DownloadModal'
import { FormatBadge } from '@/components/artwork/FormatBadge'
import { CategoryBadge } from '@/components/shared/CategoryBadge'
import { TagBadge } from '@/components/shared/TagBadge'
import { Button } from '@/components/ui/button'
import { ArtworkWithRelations } from '@/types/artwork'
import { File as PrismaFile } from '@prisma/client'
import { Download, Lock, ChevronRight, Calendar, FileType, Sparkles, Loader2, ShoppingCart, CheckCircle2, FileCheck, ShieldCheck, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatBRL } from '@/lib/utils/format'

export default function ArtworkDetailsPage() {
  const { slug } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [downloadModalOpen, setDownloadModalOpen] = React.useState(false)
  const [artwork, setArtwork] = React.useState<ArtworkWithRelations | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [hasPurchased, setHasPurchased] = React.useState(false)
  const [buying, setBuying] = React.useState(false)
  const [buyError, setBuyError] = React.useState('')
  const [related, setRelated] = React.useState<ArtworkWithRelations[]>([])

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
  const isLoggedIn = !!session?.user
  const isFaseOrAdmin = userRole === 'FASE' || userRole === 'ADMIN'
  const isClient = userRole === 'CLIENT'

  // Cliente: verifica se já comprou esta arte (pedido PAGO) para liberar download.
  React.useEffect(() => {
    if (!artwork || !isClient || artwork.isFree) {
      setHasPurchased(false)
      return
    }
    let active = true
    fetch('/api/orders')
      .then((r) => r.json())
      .then((res) => {
        if (!active || !res.success) return
        const paid = (res.data as { status: string; artwork: { id: string } }[]).some(
          (o) => o.artwork.id === artwork.id && o.status === 'PAID'
        )
        setHasPurchased(paid)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [artwork, isClient])

  // Artes relacionadas: mesma categoria, exceto a atual (máx. 5).
  React.useEffect(() => {
    if (!artwork) return
    let active = true
    fetch(`/api/artworks?categoryId=${artwork.categoryId}`)
      .then((r) => r.json())
      .then((res) => {
        if (!active || !res.success) return
        setRelated(
          (res.data as ArtworkWithRelations[]).filter((a) => a.slug !== artwork.slug).slice(0, 5)
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [artwork])

  // Quem pode baixar: equipe sempre; arte grátis para qualquer logado; cliente que comprou.
  const canDownload = isFaseOrAdmin || (isLoggedIn && !!artwork?.isFree) || (isClient && hasPurchased)

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

  const handlePrimaryClick = async () => {
    if (!artwork) return

    // Já pode baixar (equipe, arte grátis logado, ou cliente que comprou).
    if (canDownload) {
      setDownloadModalOpen(true)
      return
    }

    // Não logado → manda autenticar e volta para esta arte.
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/loja/${artwork.slug}`)
      return
    }

    // Cliente logado sem compra → inicia o checkout do Mercado Pago.
    if (isClient && !artwork.isFree) {
      setBuying(true)
      setBuyError('')
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artworkId: artwork.id }),
        })
        const result = await res.json()
        if (result.success && result.data?.initPoint) {
          window.location.href = result.data.initPoint
          return
        }
        setBuyError(result.error || 'Não foi possível iniciar o pagamento.')
      } catch {
        setBuyError('Falha na comunicação com o servidor.')
      } finally {
        setBuying(false)
      }
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

  const handleZipDownloadRequest = async (): Promise<boolean> => {
    if (!artwork) return false
    try {
      const res = await fetch('/api/downloads/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id }),
      })

      if (!res.ok) {
        const result = await res.json().catch(() => null)
        console.warn('Backend zip download call failed:', result?.error)
        return false
      }

      // Resposta é binária (.zip): materializa em blob e dispara o download.
      const blob = await res.blob()
      const safeTitle = artwork.title.toLowerCase().replace(/\s+/g, '-')
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${safeTitle}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
      return true
    } catch (e) {
      console.error('Error downloading zip:', e)
      return false
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

  // Estado do botão de ação principal conforme role + situação de compra.
  // Computado uma vez e reutilizado no painel lateral e na barra fixa do mobile.
  const primary: { label: React.ReactNode; icon: React.ReactNode; variant: 'default' | 'secondary' } = (() => {
    if (canDownload) {
      return {
        icon: <Download className="h-5 w-5" />,
        label: isFaseOrAdmin
          ? 'Liberar downloads'
          : isClient && hasPurchased
            ? 'Baixar arte comprada'
            : 'Baixar arte grátis',
        variant: 'default',
      }
    }
    if (!isLoggedIn) {
      return {
        icon: <Lock className="h-5 w-5" />,
        label: artwork.isFree ? 'Entrar para baixar' : `Entrar para comprar — ${formatBRL(artwork.priceCents)}`,
        variant: 'secondary',
      }
    }
    if (isClient && !artwork.isFree) {
      return {
        icon: buying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />,
        label: buying ? 'Redirecionando ao pagamento...' : `Comprar por ${formatBRL(artwork.priceCents)}`,
        variant: 'default',
      }
    }
    // Visitante autenticado sem permissão (caso raro).
    return { icon: <Lock className="h-5 w-5" />, label: 'Acesso restrito', variant: 'secondary' }
  })()

  return (
    <>
      <Header />
      <main className="flex-grow flex flex-col container mx-auto px-4 md:px-8 py-8 pb-28 lg:pb-8 animate-in fade-in duration-300 gap-8">
        {/* Breadcrumb: Loja › Categoria › Título */}
        <nav aria-label="Navegação estrutural" className="flex items-center gap-1.5 text-xs font-semibold text-nks-gray-400 flex-wrap">
          <Link href="/loja" className="hover:text-nks-red transition-colors">Loja</Link>
          <ChevronRight className="h-3 w-3 text-nks-gray-200" />
          <Link href={`/loja?cat=${artwork.categoryId}`} className="hover:text-nks-red transition-colors">
            {artwork.category.name}
          </Link>
          <ChevronRight className="h-3 w-3 text-nks-gray-200" />
          <span className="text-nks-gray-700 truncate max-w-[180px] sm:max-w-xs">{artwork.title}</span>
        </nav>

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
                {artwork.isFree ? (
                  <span className="inline-flex items-center gap-1 bg-nks-red text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm">
                    <Sparkles className="h-3 w-3" /> Grátis
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-nks-black text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-sm">
                    {formatBRL(artwork.priceCents)}
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
                onClick={handlePrimaryClick}
                size="lg"
                disabled={buying}
                className="w-full gap-2 font-bold h-12"
                variant={primary.variant}
              >
                {primary.icon}
                {primary.label}
              </Button>

              {hasPurchased && (
                <p className="text-[11px] text-green-700 text-center font-semibold leading-normal mt-2.5 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Compra confirmada — download liberado.
                </p>
              )}

              {buyError && (
                <p className="text-[11px] text-nks-red text-center font-semibold leading-normal mt-2.5">
                  {buyError}
                </p>
              )}

              <p className="text-[10px] text-nks-gray-400 text-center leading-normal mt-2.5 max-w-xs mx-auto">
                {isFaseOrAdmin
                  ? 'Downloads diretos a partir do nosso Cloudflare R2 privado.'
                  : artwork.isFree
                    ? 'Arte gratuita — faça login para baixar os arquivos originais.'
                    : 'Pagamento seguro via Mercado Pago (Pix ou cartão). Download liberado após a confirmação.'}
              </p>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 border-t border-nks-gray-200 pt-4 mt-4">
                {[
                  { icon: <FileCheck className="h-4 w-4" />, label: 'Arquivo original' },
                  { icon: <ShieldCheck className="h-4 w-4" />, label: 'Download seguro' },
                  { icon: <RefreshCw className="h-4 w-4" />, label: 'Uso comercial' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center text-center gap-1.5">
                    <span className="text-nks-red">{item.icon}</span>
                    <span className="text-[10px] font-semibold leading-tight text-nks-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Artes relacionadas */}
        {related.length > 0 && (
          <section className="border-t border-nks-gray-200 pt-8 mt-2">
            <h2 className="font-display font-bold uppercase tracking-[-0.015em] text-lg md:text-xl text-nks-black mb-1">
              Você também pode gostar
            </h2>
            <p className="text-[12px] text-nks-gray-400 font-semibold mb-5">
              Mais artes em <span className="text-nks-red">{artwork.category.name}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-[18px]">
              {related.map((art) => (
                <ArtworkCard key={art.id} artwork={art} />
              ))}
            </div>
          </section>
        )}

        <DownloadModal
          open={downloadModalOpen}
          onOpenChange={setDownloadModalOpen}
          artwork={artwork}
          files={artwork.files as PrismaFile[]}
          userRole={userRole}
          canDownload={canDownload}
          onDownloadRequest={handleDownloadRequest}
          onZipDownloadRequest={handleZipDownloadRequest}
        />
      </main>

      {/* Barra de ação fixa (mobile) — mantém o CTA sempre acessível ao rolar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-center gap-3 border-t border-nks-gray-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(17,17,17,0.08)]">
        <div className="flex flex-col leading-none shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-nks-gray-400">
            {artwork.isFree ? 'Arte' : 'Preço'}
          </span>
          <span className="text-base font-bold text-nks-black">
            {artwork.isFree ? <span className="text-nks-red">Grátis</span> : formatBRL(artwork.priceCents)}
          </span>
        </div>
        <Button
          onClick={handlePrimaryClick}
          disabled={buying}
          className="flex-1 gap-2 font-bold h-11"
          variant={primary.variant}
        >
          {primary.icon}
          {primary.label}
        </Button>
      </div>

      <Footer />
    </>
  )
}
