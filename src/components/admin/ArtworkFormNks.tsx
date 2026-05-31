'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Category, Status } from '@prisma/client'
import { Upload, Check, X, ChevronDown, Loader2, FileText, Images, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

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
    tags?: { name: string }[]
    previewUrl?: string
    files?: ExistingFile[]
  } | null
}

const PLACEHOLDER_PREVIEW =
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&fit=crop&q=60'

export function ArtworkFormNks({ mode, categories, artworkId, initialData }: ArtworkFormNksProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  // Form states (pré-preenchidos em modo edição)
  const [title, setTitle] = React.useState(initialData?.title || '')
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [categoryId, setCategoryId] = React.useState(initialData?.categoryId || '')
  const [status, setStatus] = React.useState<Status>(initialData?.status || 'PUBLISHED')
  const [isFree, setIsFree] = React.useState<boolean>(initialData?.isFree ?? true)
  const [tagNames, setTagNames] = React.useState<string[]>(
    initialData?.tags?.map((t) => t.name) || []
  )
  const [newTag, setNewTag] = React.useState('')
  const [isAddingTag, setIsAddingTag] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [galleryFiles, setGalleryFiles] = React.useState<File[]>([])
  const [fileIdsToRemove, setFileIdsToRemove] = React.useState<string[]>([])

  const galleryInputRef = React.useRef<HTMLInputElement>(null)

  const existingGalleryFiles = React.useMemo(
    () => (initialData?.files || []).filter((f) => f.format === 'PNG' || f.format === 'JPG'),
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
  const [error, setError] = React.useState('')
  const [dragActive, setDragActive] = React.useState(false)

  // Em criação aceita os formatos originais; em edição o dropzone troca apenas a capa.
  const acceptFormats = isEdit ? '.png,.jpg,.jpeg,.webp' : '.cdr,.ai,.pdf,.otf,.png,.jpg'

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files)
      setFiles((prev) => (isEdit ? filesArray.slice(0, 1) : [...prev, ...filesArray]))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files)
      setFiles((prev) => (isEdit ? filesArray.slice(0, 1) : [...prev, ...filesArray]))
    }
  }

  const uploadSingleFile = async (file: File, folder: 'previews' | 'files') => {
    const data = new FormData()
    data.append('file', file)
    data.append('folder', folder)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: data })
    const result = await res.json()
    if (!result.success) {
      throw new Error(result.error || 'Erro no upload de arquivo.')
    }
    return result.data as { url: string; key: string; size: number }
  }

  const commitTag = () => {
    const trimmed = newTag.trim().toLowerCase()
    if (trimmed && !tagNames.includes(trimmed)) {
      setTagNames([...tagNames, trimmed])
    }
    setNewTag('')
    setIsAddingTag(false)
  }

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
      setError('Selecione ou arraste pelo menos um arquivo.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const activeStatus = forceStatus || status

      if (isEdit) {
        const payload: Record<string, unknown> = {
          title,
          description,
          categoryId,
          status: activeStatus,
          isFree,
          tagNames,
        }

        const newCover = files.find((f) => f.type.startsWith('image/'))
        if (newCover) {
          const uploaded = await uploadSingleFile(newCover, 'previews')
          payload.previewUrl = uploaded.url
        }

        if (galleryFiles.length > 0) {
          const uploaded: { url: string; format: string; size: number }[] = []
          for (const file of galleryFiles) {
            const result = await uploadSingleFile(file, 'files')
            const ext = file.name.split('.').pop()?.toUpperCase() || 'PNG'
            uploaded.push({ url: result.url, format: ext === 'JPG' ? 'JPG' : 'PNG', size: result.size })
          }
          payload.addGalleryImages = uploaded
        }

        if (fileIdsToRemove.length > 0) {
          payload.removeFileIds = fileIdsToRemove
        }

        const res = await fetch(`/api/artworks/${artworkId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!result.success) {
          throw new Error(result.error || 'Erro ao salvar alterações.')
        }
      } else {
        // 1. Imagem de capa (preview)
        const previewFile = files.find((f) => f.type.startsWith('image/'))
        const otherFiles = files.filter((f) => !f.type.startsWith('image/'))
        let previewUrl = PLACEHOLDER_PREVIEW
        if (previewFile) {
          const uploaded = await uploadSingleFile(previewFile, 'previews')
          previewUrl = uploaded.url
        }

        // 2. Arquivos originais (download)
        const uploadedFiles: { format: string; url: string; size: number }[] = []
        const originalFilesToUpload = otherFiles.length > 0 ? otherFiles : files
        for (const file of originalFilesToUpload) {
          const uploaded = await uploadSingleFile(file, 'files')
          const ext = file.name.split('.').pop()?.toUpperCase() || 'CDR'
          const validFormats = ['CDR', 'AI', 'PDF', 'OTF', 'PNG', 'JPG']
          const format = validFormats.includes(ext) ? ext : 'CDR'
          uploadedFiles.push({ format, url: uploaded.url, size: uploaded.size })
        }

        const res = await fetch('/api/artworks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            categoryId,
            status: activeStatus,
            isFree,
            tagNames,
            previewUrl,
            files: uploadedFiles,
          }),
        })
        const result = await res.json()
        if (!result.success) {
          throw new Error(result.error || 'Erro ao cadastrar arte no banco de dados.')
        }
      }

      router.push('/admin/artes')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro ao processar a arte.')
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
            ? 'Atualize os metadados de catálogo e, se quiser, troque a imagem de capa.'
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
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl py-12 px-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
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
              multiple={!isEdit}
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="p-3 bg-white rounded-full border border-nks-gray-200/60 shadow-nks-sm mb-2.5">
              <Upload className="h-5 w-5 text-nks-gray-400" />
            </div>
            <span className="text-xs font-black text-nks-black block mb-0.5">
              {isEdit ? 'Trocar imagem de capa' : 'Arraste os arquivos aqui'}
            </span>
            <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-wider mb-4 block">
              {isEdit ? 'PNG - JPG - opcional' : 'CDR - AI - PDF - OTF - até 50 MB cada'}
            </span>
            <button
              type="button"
              className="bg-white hover:bg-nks-gray-100 border border-nks-gray-250 text-nks-gray-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-nks-sm"
            >
              Selecionar {isEdit ? 'imagem' : 'arquivos'}
            </button>
          </div>

          {/* Lista de arquivos selecionados (novos) */}
          {files.length > 0 && (
            <div className="flex flex-col gap-2.5 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider px-1">
                {isEdit ? 'Nova capa' : `Arquivos Selecionados (${files.length})`}
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

          {/* Arquivos originais já existentes (somente leitura, em edição) */}
          {isEdit && initialData?.files && initialData.files.filter((f) => f.format !== 'PNG' && f.format !== 'JPG').length > 0 && (
            <div className="flex flex-col gap-2.5 mt-1">
              <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider px-1">
                Arquivos originais ({initialData.files.filter((f) => f.format !== 'PNG' && f.format !== 'JPG').length})
              </span>
              <div className="flex flex-col gap-2">
                {initialData.files
                  .filter((f) => f.format !== 'PNG' && f.format !== 'JPG')
                  .map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-nks-gray-200 bg-nks-gray-100/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-nks-gray-100 border border-nks-gray-200/80 text-nks-gray-750 px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider uppercase min-w-[36px] text-center">
                          {file.format}
                        </div>
                        <FileText className="h-3.5 w-3.5 text-nks-gray-400" />
                      </div>
                      <span className="text-[10px] text-nks-gray-400 font-bold uppercase">
                        {(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB
                      </span>
                    </div>
                  ))}
              </div>
              <span className="text-[10px] font-semibold text-nks-gray-400 px-1">
                A gestão dos arquivos de download ainda não é editável por aqui.
              </span>
            </div>
          )}

          {/* Galeria de imagens adicionais (edit mode) */}
          {isEdit && (
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
                  Nenhuma imagem adicional. Use "+ adicionar" para incluir fotos do produto na galeria.
                </span>
              )}
            </div>
          )}
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
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitTag()
                    } else if (e.key === 'Escape') {
                      setIsAddingTag(false)
                      setNewTag('')
                    }
                  }}
                  onBlur={commitTag}
                  autoFocus
                  className="bg-white text-nks-black text-xs font-bold px-3 py-1 border border-nks-red rounded focus:outline-none w-28 shadow-nks-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="inline-flex items-center text-nks-gray-400 hover:text-nks-red font-bold text-xs px-3 py-1 bg-white border border-dashed border-nks-gray-350 hover:border-nks-red/30 rounded cursor-pointer transition-all"
                >
                  + adicionar tag
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">
              Status
            </label>
            <div className="grid grid-cols-3 gap-3">
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
              <button
                type="button"
                onClick={() => setStatus('ARCHIVED')}
                className={`py-2.5 px-4 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                  status === 'ARCHIVED'
                    ? 'bg-nks-gray-100 border-nks-gray-300 text-nks-black shadow-nks-sm'
                    : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-50'
                }`}
              >
                Inativo
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
              Marcar como grátis (visível, baixável por visitantes)
            </label>
          </div>

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
