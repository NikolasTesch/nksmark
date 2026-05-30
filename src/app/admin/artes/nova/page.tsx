'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Category, Status } from '@prisma/client'
import { ChevronLeft, Loader2, Upload, Check, X, ChevronDown } from 'lucide-react'
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

  // Form States
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  const [status, setStatus] = React.useState<Status>('PUBLISHED') // 'PUBLISHED' is equivalent to 'Ativo' in Image 2
  const [isFree, setIsFree] = React.useState<boolean>(true)
  const [tagNames, setTagNames] = React.useState<string[]>([])
  const [newTag, setNewTag] = React.useState('')
  const [isAddingTag, setIsAddingTag] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  // Drag and drop states
  const [dragActive, setDragActive] = React.useState(false)

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files)
      setFiles(prev => [...prev, ...filesArray])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files)
      setFiles(prev => [...prev, ...filesArray])
    }
  }

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
    if (files.length === 0) {
      setError('Selecione ou arraste pelo menos um arquivo.')
      return
    }

    setSubmitting(true)
    setError('')

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

      const activeStatus = forceStatus || status

      // 3. Send payload to API
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
      setError(e instanceof Error ? e.message : 'Erro ao processar criação da arte.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2 animate-in fade-in duration-300">
      
      {/* Breadcrumb & Navigation */}
      <div>
        <Link href="/admin/artes" className="inline-flex items-center gap-1.5 text-[11px] font-black text-nks-gray-400 hover:text-nks-red uppercase tracking-wider mb-3 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Voltar para Listagem
        </Link>
        <h1 className="font-display text-[28px] font-black uppercase tracking-tight text-nks-black leading-none">
          NOVA ARTE
        </h1>
        <p className="text-xs font-semibold text-nks-gray-400 mt-1.5">
          Envie os arquivos e preencha os metadados de catálogo.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-nks-red text-xs font-bold p-4 border border-nks-red/20 rounded-lg animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center py-20 justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
        </div>
      ) : (
        <form onSubmit={(e) => handleSubmit(e)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: Seletor de Arquivos & Listagem */}
          <div className="lg:col-span-5 flex flex-col gap-5 bg-white border border-nks-gray-200 rounded-xl p-6 shadow-nks-sm">
            
            {/* Drag & Drop Area */}
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
                accept=".cdr,.ai,.pdf,.otf,.png,.jpg"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="p-3 bg-white rounded-full border border-nks-gray-200/60 shadow-nks-sm mb-2.5">
                <Upload className="h-5 w-5 text-nks-gray-400" />
              </div>
              <span className="text-xs font-black text-nks-black block mb-0.5">Arraste os arquivos aqui</span>
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

            {/* List of Files */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-[10px] font-black text-nks-gray-400 uppercase tracking-wider px-1">
                  Arquivos Selecionados ({files.length})
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
                              setFiles(prev => prev.filter((_, i) => i !== idx))
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

          {/* COLUNA DIREITA: Formulário de Metadados */}
          <div className="lg:col-span-7 flex flex-col gap-6 bg-white border border-nks-gray-200 rounded-xl p-6 shadow-nks-sm">
            
            {/* Título da Arte */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">Título da arte</label>
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
              <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">Categoria</label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full bg-[#f3f4f6] text-nks-black text-xs font-bold px-4 py-3 rounded-lg border border-transparent focus:border-nks-gray-200 focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all duration-200"
                >
                  <option value="" className="font-semibold">Selecione uma categoria</option>
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
              <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">Tags</label>
              <div className="flex flex-wrap gap-1.5 items-center p-2 bg-[#f3f4f6] rounded-lg min-h-[46px] border border-transparent">
                {tagNames.map((tag) => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-nks-gray-200/70 text-nks-gray-700 rounded text-xs font-bold shadow-nks-sm transition-all"
                  >
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => setTagNames(tagNames.filter(t => t !== tag))} 
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
                        const trimmed = newTag.trim().toLowerCase()
                        if (trimmed && !tagNames.includes(trimmed)) {
                          setTagNames([...tagNames, trimmed])
                        }
                        setNewTag('')
                        setIsAddingTag(false)
                      } else if (e.key === 'Escape') {
                        setIsAddingTag(false)
                        setNewTag('')
                      }
                    }}
                    onBlur={() => {
                      const trimmed = newTag.trim().toLowerCase()
                      if (trimmed && !tagNames.includes(trimmed)) {
                        setTagNames([...tagNames, trimmed])
                      }
                      setNewTag('')
                      setIsAddingTag(false)
                    }}
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
              <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">Status</label>
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

            {/* Descrição (Opcional) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-nks-gray-400">Descrição (Opcional)</label>
              <textarea
                placeholder="Forneça detalhes adicionais como dimensões recomendadas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#f3f4f6] text-nks-black placeholder:text-nks-gray-400 text-xs font-bold px-4 py-3 rounded-lg border border-transparent focus:border-nks-gray-200 focus:bg-white focus:outline-none transition-all duration-200 resize-y min-h-[60px]"
              />
            </div>

            {/* Marcar como grátis */}
            <div className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="is-free-checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-nks-gray-300 text-nks-red focus:ring-nks-red cursor-pointer accent-nks-red"
              />
              <label htmlFor="is-free-checkbox" className="text-xs font-bold text-nks-gray-700 cursor-pointer select-none">
                Marcar como grátis (visível, baixável por visitantes)
              </label>
            </div>

            {/* Botões de Ação */}
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
                Publicar arte
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'DRAFT')}
                disabled={submitting}
                className="bg-white hover:bg-nks-gray-100 disabled:bg-nks-gray-50 border border-nks-gray-250 text-nks-gray-750 text-xs font-black py-3.5 px-6 rounded-lg transition-colors cursor-pointer shadow-nks-sm text-center"
              >
                Salvar rascunho
              </button>
            </div>

          </div>

        </form>
      )}

    </div>
  )
}

