'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArtworkForm } from '@/components/admin/ArtworkForm'
import { Category } from '@prisma/client'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const mockCategories: Category[] = [
  { id: 'c1', name: 'Estampas', slug: 'estampas', color: '#10b981', showInFilter: true, filterOrder: 1 },
  { id: 'c2', name: 'Fontes', slug: 'fontes', color: '#ec4899', showInFilter: true, filterOrder: 2 },
  { id: 'c3', name: 'Vetores', slug: 'vetores', color: '#3b82f6', showInFilter: true, filterOrder: 3 },
  { id: 'c4', name: 'Logos', slug: 'logos', color: '#f59e0b', showInFilter: true, filterOrder: 4 },
]

export default function NovaArtePage() {
  const router = useRouter()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setCategories(res.data)
        } else {
          setCategories(mockCategories)
        }
      })
      .catch(() => setCategories(mockCategories))
      .finally(() => setLoading(false))
  }, [])

  const uploadSingleFile = async (file: File, folder: 'previews' | 'files') => {
    const data = new FormData()
    data.append('file', file)
    data.append('folder', folder)
    
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: data
    })
    const result = await res.json()
    if (!result.success) {
      throw new Error(result.error || 'Erro no upload de arquivo.')
    }
    return result.data // returns { url, key, size }
  }

  const handleSubmit = async (formData: Record<string, unknown>, files: File[]) => {
    try {
      // 1. Separate preview file (PNG or JPG) from other files
      const previewFile = files.find(f => f.type.startsWith('image/'))
      const otherFiles = files.filter(f => !f.type.startsWith('image/'))

      let previewUrl = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&fit=crop&q=60' // default fallback placeholder

      if (previewFile) {
        const uploadResult = await uploadSingleFile(previewFile, 'previews')
        previewUrl = uploadResult.url
      } else if (files.length > 0) {
        // Fallback check if file is named like an image
        const firstFile = files[0]
        if (firstFile.type.startsWith('image/') || firstFile.name.endsWith('.png') || firstFile.name.endsWith('.jpg') || firstFile.name.endsWith('.jpeg')) {
          const uploadResult = await uploadSingleFile(firstFile, 'previews')
          previewUrl = uploadResult.url
        }
      }

      // 2. Upload editable original files to R2/files
      const uploadedFiles = []
      const originalFilesToUpload = otherFiles.length > 0 ? otherFiles : files

      for (const file of originalFilesToUpload) {
        const uploadResult = await uploadSingleFile(file, 'files')
        
        const ext = file.name.split('.').pop()?.toUpperCase() || 'CDR'
        const validFormats = ['CDR', 'AI', 'PDF', 'OTF', 'PNG', 'JPG']
        const format = validFormats.includes(ext) ? ext : 'CDR'

        uploadedFiles.push({
          format,
          url: uploadResult.url,
          size: uploadResult.size
        })
      }

      // 3. Send payload to API
      const res = await fetch('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          previewUrl,
          files: uploadedFiles
        })
      })

      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error || 'Erro ao cadastrar arte no banco de dados.')
      }

      alert('Arte cadastrada com sucesso!')
      router.push('/admin/artes')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Erro ao processar criação da arte.')
      throw e
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      <div>
        <Link href="/admin/artes" className="inline-flex items-center gap-1 text-[11px] font-bold text-nks-gray-400 hover:text-nks-red uppercase tracking-wider mb-2 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Voltar para Listagem
        </Link>
        <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black mb-1.5">
          Cadastrar Nova Arte
        </h1>
        <p className="text-xs font-semibold text-nks-gray-700">
          Preencha os metadados e faça o upload do preview e arquivos originais.
        </p>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center py-12 justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
          </div>
        ) : (
          <ArtworkForm 
            categories={categories} 
            tags={[]} 
            onSubmit={handleSubmit} 
          />
        )}
      </div>
    </div>
  )
}
