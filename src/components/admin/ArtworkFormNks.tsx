'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Category, Status } from '@prisma/client'
import { Upload, Check, X, ChevronDown, Loader2, FileText, Images, RotateCcw, Image as ImageIcon, Plus } from 'lucide-react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { logger as log } from "@/lib/utils/logger";
import { generateSlug } from '@/lib/utils/slug'

type ExistingFile = { id?: string; format: string; size: number; url?: string }

interface ArtworkFormNksProps {
  mode: 'create' | 'edit'
  categories: Category[]
  artworkId?: string
  initialData?: {
    title?: string
    description?: string
    categoryId?: string
    status?: Status
    isFree?: boolean
    priceCents?: number
    tags?: { name: string }[]
    previewUrl?: string
    files?: ExistingFile[]
  } | null
  initialTags?: { id: string; name: string }[]
}

const PLACEHOLDER_PREVIEW =
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&fit=crop&q=60'

interface UploadProgressState {
  currentStep: string
  percent: number
  uploadedCount: number
  totalCount: number
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const results: R[] = new Array(items.length)
  let currentIndex = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++
      results[idx] = await fn(items[idx], idx)
    }
  })

  await Promise.all(workers)
  return results
}

export function ArtworkFormNks({ mode, categories, artworkId, initialData, initialTags }: ArtworkFormNksProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  // Form states (pré-preenchidos em modo edição)
  const [title, setTitle] = React.useState(initialData?.title || '')
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [categoryId, setCategoryId] = React.useState(initialData?.categoryId || '')
  const [status, setStatus] = React.useState<Status>(initialData?.status || 'PUBLISHED')
  const [isFree, setIsFree] = React.useState<boolean>(initialData?.isFree ?? true)
  // Preço em reais como string editável; convertido para centavos no envio.
  const [price, setPrice] = React.useState<string>(
    ((initialData?.priceCents ?? 1500) / 100).toFixed(2).replace('.', ',')
  )
  const [tagNames, setTagNames] = React.useState<string[]>(
    initialData?.tags?.map((t) => t.name) || []
  )
  const [newTag, setNewTag] = React.useState('')
  const [isAddingTag, setIsAddingTag] = React.useState(false)
  const [availableTags, setAvailableTags] = React.useState<{ id: string; name: string }[]>(
    initialTags || []
  )
  const [loadingTags, setLoadingTags] = React.useState(!initialTags)

  const tagContainerRef = React.useRef<HTMLDivElement>(null)
  const tagInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    let isMounted = true
    fetch('/api/tags')
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setAvailableTags(res.data)
        }
      })
      .catch((err) => log.error('Erro ao buscar tags:', err))
      .finally(() => {
        if (isMounted) setLoadingTags(false)
      })
    return () => {
      isMounted = false
    }
  }, [])
  const [files, setFiles] = React.useState<File[]>([])
  const [coverFile, setCoverFile] = React.useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = React.useState<File[]>([])
  const [fileIdsToRemove, setFileIdsToRemove] = React.useState<string[]>([])

  const galleryInputRef = React.useRef<HTMLInputElement>(null)
  const coverInputRef = React.useRef<HTMLInputElement>(null)

  // Pré-visualização local da capa selecionada
  const coverPreviewUrl = React.useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile]
  )
  React.useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
  }, [coverPreviewUrl])

  const effectiveCoverUrl = coverPreviewUrl || (isEdit ? initialData?.previewUrl : null)

  const handleCoverInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0])
    }
    e.target.value = ''
  }

  const existingGalleryFiles = React.useMemo(
    () => (initialData?.files || []).filter((f) => f.format === 'PNG' || f.format === 'JPG'),
    [initialData]
  )

  const existingOriginalFiles = React.useMemo(
    () => (initialData?.files || []).filter((f) => f.format !== 'PNG' && f.format !== 'JPG'),
    [initialData]
  )

  const toggleRemoveFile = (fileId: string) => {
    setFileIdsToRemove((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    )
  }

  const handleGalleryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setGalleryFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
    e.target.value = ''
  }

  const [submitting, setSubmitting] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<UploadProgressState | null>(null)
  const [error, setError] = React.useState('')
  const [dragActive, setDragActive] = React.useState(false)
  const dragCounterRef = React.useRef(0)

  // Aceita formatos originais de vetor e documento para download
  const acceptFormats = '.cdr,.ai,.pdf,.otf,.png,.jpg'

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setDragActive(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...filesArray])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...filesArray])
    }
    e.target.value = ''
  }

  const uploadSingleFile = async (
    file: File,
    folder: 'previews' | 'files',
    onProgress?: (loaded: number, total: number) => void
  ) => {
    // Para arquivos de download (folder === 'files'), usa upload direto via URL pré-assinada
    // no Cloudflare R2, contornando o limite de 4.5 MB do payload da Vercel.
    if (folder === 'files') {
      const presignRes = await fetch('/api/admin/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          folder: 'files',
        }),
      })

      if (!presignRes.ok) {
        let errMsg = `Falha ao preparar upload (${presignRes.status})`
        try {
          const errJson = await presignRes.json()
          if (errJson.error) errMsg = errJson.error
        } catch {
          const text = await presignRes.text()
          if (text) errMsg = text
        }
        throw new Error(errMsg)
      }

      const presignResult = await presignRes.json()
      if (!presignResult.success || !presignResult.data?.uploadUrl) {
        throw new Error(presignResult.error || 'Erro ao gerar link de upload.')
      }

      const { uploadUrl, key, url } = presignResult.data

      // Upload direto ao Cloudflare R2 com rastreamento XHR de progresso
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              onProgress(e.loaded, e.total)
            }
          })
        }
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(
              new Error(
                `Falha ao enviar o arquivo para o armazenamento (${xhr.status} ${xhr.statusText}).`
              )
            )
          }
        })
        xhr.addEventListener('error', () => reject(new Error(`Falha de conexão ao enviar ${file.name}.`)))
        xhr.addEventListener('abort', () => reject(new Error(`Upload cancelado: ${file.name}.`)))

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      return {
        url,
        key,
        size: file.size,
      }
    }

    // Para imagem de capa (preview), envia para /api/admin/upload para aplicação de marca d'água via Sharp
    return new Promise<{ url: string; key: string; size: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const data = new FormData()
      data.append('file', file)
      data.append('folder', folder)

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(e.loaded, e.total)
          }
        })
      }

      xhr.addEventListener('load', () => {
        try {
          const result = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300 && result.success) {
            resolve(result.data as { url: string; key: string; size: number })
          } else {
            reject(new Error(result.error || `Erro no upload de ${file.name} (${xhr.status}).`))
          }
        } catch {
          reject(new Error(`Resposta inválida do servidor ao enviar ${file.name}.`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error(`Falha de conexão ao enviar ${file.name}.`)))
      xhr.addEventListener('abort', () => reject(new Error(`Upload cancelado: ${file.name}.`)))

      xhr.open('POST', '/api/admin/upload')
      xhr.send(data)
    })
  }

  const addTag = React.useCallback(
    (rawName: string) => {
      const clean = generateSlug(rawName)
      if (!clean) return
      if (!tagNames.includes(clean)) {
        setTagNames((prev) => [...prev, clean])
      }
      setAvailableTags((prev) => {
        if (!prev.some((t) => t.name === clean)) {
          return [...prev, { id: `local-${clean}`, name: clean }]
        }
        return prev
      })
      setNewTag('')
    },
    [tagNames]
  )

  const handleCloseAddTag = React.useCallback(() => {
    if (newTag.trim()) {
      addTag(newTag)
    }
    setIsAddingTag(false)
    setNewTag('')
  }, [newTag, addTag])

  React.useEffect(() => {
    if (!isAddingTag) return
    const handleClickOutside = (e: MouseEvent) => {
      if (tagContainerRef.current && !tagContainerRef.current.contains(e.target as Node)) {
        handleCloseAddTag()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isAddingTag, handleCloseAddTag])

  const cleanNewTag = React.useMemo(() => generateSlug(newTag), [newTag])

  const unselectedAvailableTags = React.useMemo(() => {
    return availableTags.filter((t) => !tagNames.includes(t.name))
  }, [availableTags, tagNames])

  const filteredAvailableTags = React.useMemo(() => {
    if (!newTag.trim()) return unselectedAvailableTags
    const search = newTag.trim().toLowerCase()
    return unselectedAvailableTags.filter(
      (t) => t.name.toLowerCase().includes(search) || t.name.includes(cleanNewTag)
    )
  }, [unselectedAvailableTags, newTag, cleanNewTag])

  const canCreateNew = React.useMemo(() => {
    if (!cleanNewTag) return false
    if (tagNames.includes(cleanNewTag)) return false
    const exactMatch = unselectedAvailableTags.some((t) => t.name.toLowerCase() === cleanNewTag)
    return !exactMatch
  }, [cleanNewTag, tagNames, unselectedAvailableTags])

  const handleSubmit = async (e: React.FormEvent, forceStatus?: Status) => {
    e.preventDefault()
    if (!title) {
      setError('O título da arte é obrigatório.')
      return
    }
    if (!categoryId) {
      setError('Selecione uma categoria.')
      return
    }
    if (!isEdit && files.length === 0) {
      setError('Selecione ou arraste pelo menos um arquivo original.')
      return
    }

    if (isEdit) {
      const remainingExisting = existingOriginalFiles.filter(
        (f) => !f.id || !fileIdsToRemove.includes(f.id)
      ).length
      if (remainingExisting + files.length === 0) {
        setError('A arte deve possuir pelo menos um arquivo original (CDR, AI, PDF, etc.).')
        return
      }
    }

    setSubmitting(true)
    setError('')

    try {
      const activeStatus = forceStatus || status
      // "15,90" / "15.90" → 1590 centavos. Inválido vira default 1500.
      const parsedPrice = Math.round(parseFloat(price.replace(',', '.')) * 100)
      const priceCents = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 1500

      if (isEdit) {
        const payload: Record<string, unknown> = {
          title,
          description,
          categoryId,
          status: activeStatus,
          isFree,
          priceCents,
          tagNames,
        }

        const filesToUploadCount = (coverFile ? 1 : 0) + files.length + galleryFiles.length
        let completedFilesCount = 0

        const updateProgress = (stepName: string, customPercent?: number) => {
          const calculatedPercent =
            filesToUploadCount > 0 ? Math.round((completedFilesCount / filesToUploadCount) * 100) : 0
          setUploadProgress({
            currentStep: stepName,
            percent: customPercent !== undefined ? customPercent : Math.min(99, calculatedPercent),
            uploadedCount: completedFilesCount,
            totalCount: filesToUploadCount,
          })
        }

        if (coverFile) {
          updateProgress('Enviando nova imagem de capa...', 10)
          const uploaded = await uploadSingleFile(coverFile, 'previews')
          payload.previewUrl = uploaded.url
          completedFilesCount++
          updateProgress('Nova imagem de capa enviada')
        }

        if (files.length > 0) {
          updateProgress(`Enviando novos arquivos originais (${completedFilesCount}/${filesToUploadCount})...`)
          const uploaded = await runWithConcurrency(files, 2, async (file) => {
            updateProgress(`Enviando original: ${file.name}...`)
            const result = await uploadSingleFile(file, 'files')
            completedFilesCount++
            updateProgress(`Concluído: ${file.name}`)
            const ext = file.name.split('.').pop()?.toUpperCase() || 'CDR'
            const validFormats = ['CDR', 'AI', 'PDF', 'OTF', 'PNG', 'JPG']
            const format = validFormats.includes(ext) ? ext : 'CDR'
            return { url: result.url, format, size: result.size }
          })
          payload.addFiles = uploaded
        }

        if (galleryFiles.length > 0) {
          updateProgress(`Enviando imagens da galeria (${completedFilesCount}/${filesToUploadCount})...`)
          const uploaded = await runWithConcurrency(galleryFiles, 2, async (file) => {
            updateProgress(`Enviando galeria: ${file.name}...`)
            const result = await uploadSingleFile(file, 'files')
            completedFilesCount++
            updateProgress(`Concluído: ${file.name}`)
            const ext = file.name.split('.').pop()?.toUpperCase() || 'PNG'
            return { url: result.url, format: ext === 'JPG' || ext === 'JPEG' ? 'JPG' : 'PNG', size: result.size }
          })
          payload.addGalleryImages = uploaded
        }

        if (fileIdsToRemove.length > 0) {
          payload.removeFileIds = fileIdsToRemove
        }

        updateProgress('Salvando alterações...', 99)

        const res = await fetch(`/api/artworks/${artworkId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          let errMsg = `Erro ao salvar alterações (${res.status})`
          try {
            const errJson = await res.json()
            if (errJson.error) errMsg = errJson.error
          } catch {
            const text = await res.text()
            if (text) errMsg = text
          }
          throw new Error(errMsg)
        }
        const result = await res.json()
        if (!result.success) {
          throw new Error(result.error || 'Erro ao salvar alterações.')
        }

        setUploadProgress({
          currentStep: 'Alterações salvas com sucesso!',
          percent: 100,
          uploadedCount: filesToUploadCount,
          totalCount: filesToUploadCount,
        })
      } else {
        // Total de arquivos a enviar
        const totalFilesCount = (coverFile ? 1 : 0) + files.length + galleryFiles.length
        let completedFilesCount = 0

        const updateProgress = (stepName: string, customPercent?: number) => {
          const calculatedPercent =
            totalFilesCount > 0 ? Math.round((completedFilesCount / totalFilesCount) * 100) : 0
          setUploadProgress({
            currentStep: stepName,
            percent: customPercent !== undefined ? customPercent : Math.min(99, calculatedPercent),
            uploadedCount: completedFilesCount,
            totalCount: totalFilesCount,
          })
        }

        // 1. Imagem de capa (preview) — campo dedicado
        let previewUrl = PLACEHOLDER_PREVIEW
        if (coverFile) {
          updateProgress('Enviando imagem de capa...', 5)
          const uploaded = await uploadSingleFile(coverFile, 'previews', (loaded, total) => {
            const filePercent = total > 0 ? loaded / total : 0
            const overallPercent = Math.round(
              ((completedFilesCount + filePercent) / Math.max(1, totalFilesCount)) * 100
            )
            updateProgress('Enviando imagem de capa...', Math.min(99, overallPercent))
          })
          previewUrl = uploaded.url
          completedFilesCount++
          updateProgress('Imagem de capa enviada com sucesso')
        }

        // 2. Arquivos originais (download) — upload concorrente (2 simultâneos)
        const uploadedFiles: { format: string; url: string; size: number }[] = []
        if (files.length > 0) {
          updateProgress(`Enviando arquivos originais (${completedFilesCount}/${totalFilesCount})...`)
          const results = await runWithConcurrency(files, 2, async (file) => {
            updateProgress(`Enviando: ${file.name}...`)
            const uploaded = await uploadSingleFile(file, 'files')
            completedFilesCount++
            updateProgress(`Concluído: ${file.name}`)
            const ext = file.name.split('.').pop()?.toUpperCase() || 'CDR'
            const validFormats = ['CDR', 'AI', 'PDF', 'OTF', 'PNG', 'JPG']
            const format = validFormats.includes(ext) ? ext : 'CDR'
            return { format, url: uploaded.url, size: uploaded.size }
          })
          uploadedFiles.push(...results)
        }

        // 3. Imagens da galeria (PNG/JPG) — campo dedicado (2 simultâneas)
        if (galleryFiles.length > 0) {
          updateProgress(`Enviando fotos de galeria (${completedFilesCount}/${totalFilesCount})...`)
          const galleryResults = await runWithConcurrency(galleryFiles, 2, async (file) => {
            updateProgress(`Enviando galeria: ${file.name}...`)
            const uploaded = await uploadSingleFile(file, 'files')
            completedFilesCount++
            updateProgress(`Concluído: ${file.name}`)
            const ext = file.name.split('.').pop()?.toUpperCase() || 'PNG'
            return {
              format: ext === 'JPG' || ext === 'JPEG' ? 'JPG' : 'PNG',
              url: uploaded.url,
              size: uploaded.size,
            }
          })
          uploadedFiles.push(...galleryResults)
        }

        updateProgress('Salvando catálogo no banco de dados...', 99)

        const res = await fetch('/api/artworks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            categoryId,
            status: activeStatus,
            isFree,
            priceCents,
            tagNames,
            previewUrl,
            files: uploadedFiles,
          }),
        })
        if (!res.ok) {
          let errMsg = `Erro ao cadastrar arte (${res.status})`
          try {
            const errJson = await res.json()
            if (errJson.error) errMsg = errJson.error
          } catch {
            const text = await res.text()
            if (text) errMsg = text
          }
          throw new Error(errMsg)
        }
        const result = await res.json()
        if (!result.success) {
          throw new Error(result.error || 'Erro ao cadastrar arte no banco de dados.')
        }

        setUploadProgress({
          currentStep: 'Arte cadastrada com sucesso!',
          percent: 100,
          uploadedCount: totalFilesCount,
          totalCount: totalFilesCount,
        })
      }

      router.push('/admin/artes')
      router.refresh()
    } catch (err) {
      log.error(err)
      setError(err instanceof Error ? err.message : 'Erro ao processar a arte.')
      setUploadProgress(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2 animate-in fade-in duration-300">
      {/* Breadcrumb & Cabeçalho */}
      <div>
        <Link
          href="/admin/artes"
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-nks-gray-400 hover:text-nks-red uppercase tracking-wider mb-3 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para Listagem
        </Link>
        <h1 className="font-display text-[28px] font-black uppercase tracking-tight text-nks-black leading-none">
          {isEdit ? 'Editar Arte' : 'Nova Arte'}
        </h1>
        <p className="text-xs font-semibold text-nks-gray-400 mt-1.5">
          {isEdit
            ? 'Atualize os metadados de catálogo, imagem de capa e arquivos para download.'
            : 'Envie os arquivos e preencha os metadados de catálogo.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-nks-red text-xs font-bold p-4 border border-nks-red/20 rounded-lg animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => handleSubmit(e)}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* COLUNA ESQUERDA: Arquivos */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-white border border-nks-gray-200 rounded-xl p-6 shadow-nks-sm">
          {/* Imagem de capa */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider px-1">
              Imagem de capa
            </span>
            <input
              ref={coverInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleCoverInput}
              className="hidden"
            />
            {effectiveCoverUrl ? (
              <div className="relative h-44 w-full rounded-xl overflow-hidden border border-nks-gray-200 bg-nks-gray-100 shadow-nks-sm group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={effectiveCoverUrl}
                  alt="Imagem de capa"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="bg-white/90 hover:bg-white text-nks-gray-750 text-[10px] font-bold px-2.5 py-1 rounded shadow-sm transition-colors cursor-pointer"
                  >
                    {isEdit && !coverFile ? 'Trocar capa' : 'Trocar'}
                  </button>
                  {coverFile && (
                    <button
                      type="button"
                      onClick={() => setCoverFile(null)}
                      title={isEdit ? 'Cancelar nova capa' : 'Remover capa'}
                      className="bg-white/90 hover:bg-nks-red hover:text-white text-nks-gray-700 rounded p-1 shadow-sm transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {isEdit && coverFile && (
                  <div className="absolute bottom-2 left-2 bg-emerald-600/95 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                    Nova capa selecionada
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed border-nks-gray-200 bg-nks-gray-100/50 hover:bg-nks-gray-100 hover:border-nks-gray-400 rounded-xl py-8 px-4 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer"
              >
                <div className="p-2.5 bg-white rounded-full border border-nks-gray-200/60 shadow-nks-sm mb-2">
                  <ImageIcon className="h-5 w-5 text-nks-gray-400" />
                </div>
                <span className="text-xs font-black text-nks-black block mb-0.5">
                  Selecionar imagem de capa
                </span>
                <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-wider block">
                  PNG - JPG - usada na vitrine
                </span>
              </button>
            )}
          </div>

          {/* ARQUIVOS ORIGINAIS (DOWNLOAD) */}
          <div className="flex flex-col gap-3 pt-3 border-t border-nks-gray-200">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider">
                Arquivos originais (download){isEdit && existingOriginalFiles.length > 0 ? ` (${existingOriginalFiles.length})` : ''}
              </span>
              <button
                type="button"
                onClick={() => document.getElementById('file-upload-input')?.click()}
                className="text-[10px] font-bold text-nks-red hover:text-nks-red-light transition-colors cursor-pointer"
              >
                + adicionar arquivos
              </button>
            </div>

            {/* Dropzone para arquivos originais */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl py-9 px-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-nks-red bg-nks-red-subtle/15'
                  : 'border-nks-gray-200 bg-nks-gray-100/50 hover:bg-nks-gray-100 hover:border-nks-gray-400'
              }`}
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <input
                type="file"
                id="file-upload-input"
                accept={acceptFormats}
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="p-3 bg-white rounded-full border border-nks-gray-200/60 shadow-nks-sm mb-2.5">
                <Upload className="h-5 w-5 text-nks-gray-400" />
              </div>
              <span className="text-xs font-black text-nks-black block mb-0.5">
                Arraste os arquivos aqui
              </span>
              <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-wider mb-4 block">
                CDR - AI - PDF - OTF - até 50 MB cada
              </span>
              <button
                type="button"
                className="bg-white hover:bg-nks-gray-100 border border-nks-gray-250 text-nks-gray-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-nks-sm"
              >
                Selecionar arquivos
              </button>
            </div>

            {/* Arquivos originais já existentes (em edição) */}
            {isEdit && existingOriginalFiles.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider px-1">
                  Arquivos no catálogo
                </span>
                <div className="flex flex-col gap-2">
                  {existingOriginalFiles.map((file, idx) => {
                    const isMarkedForRemoval = file.id && fileIdsToRemove.includes(file.id)
                    return (
                      <div
                        key={file.id || idx}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                          isMarkedForRemoval
                            ? 'border-nks-red/40 bg-red-50/50 opacity-60'
                            : 'border-nks-gray-200 bg-nks-gray-100/40 hover:bg-nks-gray-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`border px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider uppercase min-w-[36px] text-center ${
                              isMarkedForRemoval
                                ? 'bg-red-100 text-nks-red border-red-200'
                                : 'bg-nks-gray-100 border-nks-gray-200/80 text-nks-gray-750'
                            }`}
                          >
                            {file.format}
                          </div>
                          <FileText className={`h-3.5 w-3.5 ${isMarkedForRemoval ? 'text-nks-red' : 'text-nks-gray-400'}`} />
                          {isMarkedForRemoval && (
                            <span className="text-[10px] font-bold text-nks-red uppercase tracking-wider">
                              (Será removido)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              isMarkedForRemoval ? 'text-nks-red line-through' : 'text-nks-gray-400'
                            }`}
                          >
                            {(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB
                          </span>
                          {file.id && (
                            <button
                              type="button"
                              onClick={() => toggleRemoveFile(file.id!)}
                              title={isMarkedForRemoval ? 'Desfazer remoção' : 'Remover arquivo'}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                isMarkedForRemoval
                                  ? 'text-nks-red hover:bg-red-100'
                                  : 'text-nks-gray-400 hover:text-nks-red hover:bg-nks-gray-100'
                              }`}
                            >
                              {isMarkedForRemoval ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lista de novos arquivos originais selecionados */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider px-1">
                  {isEdit ? `Novos arquivos a enviar (${files.length})` : `Arquivos Selecionados (${files.length})`}
                </span>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {files.map((file, idx) => {
                    const ext = file.name.split('.').pop()?.toUpperCase() || 'CDR'
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-nks-gray-200 bg-white shadow-nks-sm"
                      >
                        <div className="flex items-center gap-3 max-w-[75%]">
                          <div className="bg-nks-gray-100 border border-nks-gray-200/80 text-nks-gray-750 px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider uppercase min-w-[36px] text-center">
                            {ext}
                          </div>
                          <span className="text-xs font-bold text-nks-black truncate" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-nks-gray-400 font-bold uppercase whitespace-nowrap">
                            {(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB
                          </span>
                          <div className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFiles((prev) => prev.filter((_, i) => i !== idx))
                            }}
                            className="p-1 text-nks-gray-400 hover:text-nks-red rounded-lg transition-colors cursor-pointer hover:bg-nks-gray-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Galeria de imagens adicionais */}
          <div className="flex flex-col gap-3 pt-4 border-t border-nks-gray-200 mt-1">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <Images className="h-3.5 w-3.5 text-nks-gray-400" />
                  <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider">
                    Imagens da galeria
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-[10px] font-bold text-nks-red hover:text-nks-red-light transition-colors cursor-pointer"
                >
                  + adicionar
                </button>
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                multiple
                onChange={handleGalleryInput}
                className="hidden"
              />

              {/* Imagens de galeria existentes */}
              {existingGalleryFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {existingGalleryFiles.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className={`relative h-[72px] w-[72px] rounded-lg overflow-hidden border bg-nks-gray-100 shrink-0 transition-all duration-200 ${
                        file.id && fileIdsToRemove.includes(file.id)
                          ? 'border-nks-red opacity-40'
                          : 'border-nks-gray-200'
                      }`}
                    >
                      {file.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.url}
                          alt={file.format}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <span className="text-[9px] font-black text-nks-gray-400 uppercase">
                            {file.format}
                          </span>
                        </div>
                      )}
                      {file.id && (
                        <button
                          type="button"
                          onClick={() => toggleRemoveFile(file.id!)}
                          title={fileIdsToRemove.includes(file.id) ? 'Desfazer remoção' : 'Remover imagem'}
                          className="absolute top-0.5 right-0.5 bg-white/90 hover:bg-nks-red hover:text-white text-nks-gray-700 rounded p-0.5 shadow-sm transition-colors cursor-pointer"
                        >
                          {fileIdsToRemove.includes(file.id) ? (
                            <RotateCcw className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Novas imagens de galeria a enviar */}
              {galleryFiles.length > 0 && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {galleryFiles.map((file, idx) => {
                    const ext = file.name.split('.').pop()?.toUpperCase() || 'PNG'
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-nks-gray-200 bg-white"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="bg-nks-gray-100 border border-nks-gray-200/80 text-nks-gray-750 px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider uppercase min-w-[36px] text-center shrink-0">
                            {ext}
                          </div>
                          <span className="text-xs font-bold text-nks-black truncate" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGalleryFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-nks-gray-400 hover:text-nks-red rounded-lg transition-colors cursor-pointer hover:bg-nks-gray-100 shrink-0 ml-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {existingGalleryFiles.length === 0 && galleryFiles.length === 0 && (
                <span className="text-[10px] font-semibold text-nks-gray-400 px-1">
                  Nenhuma imagem adicional. Use &quot;+ adicionar&quot; para incluir fotos do produto na galeria.
                </span>
              )}
          </div>
        </div>

        {/* COLUNA DIREITA: Metadados */}
        <div className="lg:col-span-7 flex flex-col gap-6 bg-white border border-nks-gray-200 rounded-xl p-6 shadow-nks-sm">
          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">
              Título da arte
            </label>
            <input
              type="text"
              placeholder="Ex: Mandala floral aquarela"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#f3f4f6] text-nks-black placeholder:text-nks-gray-400 text-xs font-bold px-4 py-3 rounded-lg border border-transparent focus:border-nks-gray-200 focus:bg-white focus:outline-none transition-all duration-200"
            />
          </div>

          {/* Categoria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">
              Categoria
            </label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full bg-[#f3f4f6] text-nks-black text-xs font-bold px-4 py-3 rounded-lg border border-transparent focus:border-nks-gray-200 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all duration-200"
              >
                <option value="" className="font-semibold">
                  Selecione uma categoria
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="font-semibold">
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-nks-gray-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 items-center p-2 bg-[#f3f4f6] rounded-lg min-h-[46px] border border-transparent">
              {tagNames.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-nks-gray-200/70 text-nks-gray-700 rounded text-xs font-bold shadow-nks-sm transition-all"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTagNames(tagNames.filter((t) => t !== tag))}
                    className="text-nks-gray-400 hover:text-nks-red focus:outline-none cursor-pointer transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {isAddingTag ? (
                <div ref={tagContainerRef} className="relative inline-flex items-center">
                  <div className="flex items-center gap-1.5 bg-white border border-nks-red rounded px-2.5 py-1 shadow-nks-sm">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newTag.trim()) {
                            addTag(newTag)
                          }
                        } else if (e.key === 'Escape') {
                          setIsAddingTag(false)
                          setNewTag('')
                        }
                      }}
                      placeholder="Buscar ou criar tag..."
                      autoFocus
                      className="bg-transparent text-nks-black text-xs font-bold focus:outline-none w-36 placeholder:text-nks-gray-400"
                    />
                    <button
                      type="button"
                      onClick={handleCloseAddTag}
                      className="text-nks-gray-400 hover:text-nks-black p-0.5 rounded cursor-pointer transition-colors"
                      title="Concluir"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Dropdown de sugestões e criação */}
                  <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-nks-gray-200 rounded-xl shadow-lg p-3 z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    {loadingTags && availableTags.length === 0 ? (
                      <div className="flex items-center justify-center py-3 text-nks-gray-400 text-xs font-semibold gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-nks-red" />
                        Carregando tags...
                      </div>
                    ) : (
                      <>
                        {canCreateNew && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              addTag(newTag)
                            }}
                            className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-nks-red bg-nks-red/5 hover:bg-nks-red/10 border border-nks-red/20 transition-all cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Criar tag &ldquo;{cleanNewTag}&rdquo;</span>
                          </button>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-nks-gray-400 px-0.5">
                          <span>Tags existentes {filteredAvailableTags.length > 0 && `(${filteredAvailableTags.length})`}</span>
                          {filteredAvailableTags.length > 0 && (
                            <span className="text-[9px] font-semibold text-nks-gray-350">clique para selecionar</span>
                          )}
                        </div>

                        {filteredAvailableTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                            {filteredAvailableTags.map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  addTag(tag.name)
                                }}
                                className="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded bg-nks-gray-100 hover:bg-nks-red/10 text-nks-gray-700 hover:text-nks-red border border-nks-gray-200 hover:border-nks-red/30 transition-all cursor-pointer"
                              >
                                #{tag.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-nks-gray-400 px-1 py-1.5">
                            {newTag.trim()
                              ? 'Nenhuma tag existente correspondente.'
                              : availableTags.length === 0
                              ? 'Nenhuma tag cadastrada ainda. Digite um nome e pressione Enter para criar.'
                              : 'Todas as tags disponíveis já foram selecionadas.'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="inline-flex items-center gap-1 text-nks-gray-400 hover:text-nks-red font-bold text-xs px-3 py-1 bg-white border border-dashed border-nks-gray-350 hover:border-nks-red/30 rounded cursor-pointer transition-all"
                >
                  <Plus className="h-3 w-3" />
                  adicionar tag
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">
              Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('PUBLISHED')}
                className={`py-2.5 px-4 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                  status === 'PUBLISHED'
                    ? 'bg-[#F7E6E7] border-nks-red text-nks-red shadow-nks-sm'
                    : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-50'
                }`}
              >
                Ativo
              </button>
              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                className={`py-2.5 px-4 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                  status === 'DRAFT'
                    ? 'bg-nks-gray-100 border-nks-gray-300 text-nks-black shadow-nks-sm'
                    : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-50'
                }`}
              >
                Rascunho
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">
              Descrição (Opcional)
            </label>
            <textarea
              placeholder="Forneça detalhes adicionais como dimensões recomendadas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#f3f4f6] text-nks-black placeholder:text-nks-gray-400 text-xs font-bold px-4 py-3 rounded-lg border border-transparent focus:border-nks-gray-200 focus:bg-white focus:outline-none transition-all duration-200 resize-y min-h-[60px]"
            />
          </div>

          {/* Grátis */}
          <div className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              id="is-free-checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-nks-gray-300 text-nks-red focus:ring-nks-red cursor-pointer accent-nks-red"
            />
            <label
              htmlFor="is-free-checkbox"
              className="text-xs font-bold text-nks-gray-700 cursor-pointer select-none"
            >
              Marcar como grátis (download liberado a clientes logados, sem cobrança)
            </label>
          </div>

          {/* Preço (ignorado quando grátis) */}
          {!isFree && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">
                Preço de venda
              </label>
              <div className="relative max-w-[180px]">
                <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-nks-gray-400 pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="15,00"
                  className="w-full bg-[#f3f4f6] text-nks-black text-xs font-bold pl-9 pr-4 py-3 rounded-lg border border-transparent focus:border-nks-gray-200 focus:bg-white focus:outline-none transition-all duration-200"
                />
              </div>
              <span className="text-[10px] font-semibold text-nks-gray-400">
                Valor cobrado do cliente por esta arte. Padrão: R$ 15,00.
              </span>
            </div>
          )}

          {/* Barra de Progresso de Upload */}
          {submitting && uploadProgress && (
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-nks-gray-100/70 border border-nks-gray-200 mt-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-nks-black flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-nks-red shrink-0" />
                  <span className="truncate">{uploadProgress.currentStep}</span>
                </span>
                <span className="font-mono font-black text-nks-red text-xs ml-2 shrink-0">
                  {uploadProgress.percent}%
                </span>
              </div>
              <div className="w-full bg-nks-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-nks-red h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
              {uploadProgress.totalCount > 0 && (
                <div className="flex justify-between items-center text-[10px] font-bold text-nks-gray-400">
                  <span>
                    Arquivos: {uploadProgress.uploadedCount} de {uploadProgress.totalCount} concluídos
                  </span>
                  <span>Não feche esta página</span>
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 bg-nks-red hover:bg-nks-red-light disabled:bg-nks-red/60 text-white text-xs font-black py-3.5 px-6 rounded-lg transition-colors cursor-pointer shadow-nks-sm"
            >
              {submitting ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Upload className="h-4.5 w-4.5" />
              )}
              {isEdit ? 'Salvar alterações' : 'Publicar arte'}
            </button>
            {isEdit ? (
              <Link
                href="/admin/artes"
                className="flex items-center justify-center bg-white hover:bg-nks-gray-100 border border-nks-gray-250 text-nks-gray-750 text-xs font-black py-3.5 px-6 rounded-lg transition-colors cursor-pointer shadow-nks-sm text-center"
              >
                Cancelar
              </Link>
            ) : (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'DRAFT')}
                disabled={submitting}
                className="bg-white hover:bg-nks-gray-100 disabled:bg-nks-gray-50 border border-nks-gray-250 text-nks-gray-750 text-xs font-black py-3.5 px-6 rounded-lg transition-colors cursor-pointer shadow-nks-sm text-center"
              >
                Salvar rascunho
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
