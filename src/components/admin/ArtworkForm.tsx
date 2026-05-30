'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Category, Tag, Status } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileUploader } from './FileUploader'
import { Loader2, Plus, Sparkles } from 'lucide-react'

interface ArtworkFormProps {
  categories: Category[]
  tags?: Tag[]
  initialData?: {
    title?: string
    description?: string
    categoryId?: string
    status?: Status
    isFree?: boolean
    tags?: { name: string }[]
  } | null
  onSubmit: (formData: Record<string, unknown>, files: File[]) => Promise<void>
}

export function ArtworkForm({ categories, initialData, onSubmit }: ArtworkFormProps) {
  const router = useRouter()
  const [title, setTitle] = React.useState(initialData?.title || '')
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [categoryId, setCategoryId] = React.useState(initialData?.categoryId || '')
  const [status, setStatus] = React.useState<Status>(initialData?.status || 'DRAFT')
  const [isFree, setIsFree] = React.useState<boolean>(initialData?.isFree ?? true)
  const [tagNames, setTagNames] = React.useState<string[]>(initialData?.tags?.map((t: { name: string }) => t.name) || [])
  const [newTag, setNewTag] = React.useState('')
  const [files, setFiles] = React.useState<File[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleAddTag = () => {
    if (newTag.trim() && !tagNames.includes(newTag.trim())) {
      setTagNames([...tagNames, newTag.trim().toLowerCase()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (name: string) => {
    setTagNames(tagNames.filter((t) => t !== name))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      setError('O título é obrigatório')
      return
    }
    if (!categoryId) {
      setError('Selecione uma categoria')
      return
    }
    if (files.length === 0 && !initialData) {
      setError('Adicione pelo menos um arquivo de download')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onSubmit(
        {
          title,
          description,
          categoryId,
          status,
          isFree,
          tagNames,
        },
        files
      )
      router.push('/admin/artes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao processar formulário.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-300">
      
      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-lg text-xs font-semibold border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Título da Arte</label>
        <Input
          type="text"
          placeholder="Ex: Estampa Camisa Corrida 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Descrição (Opcional)</label>
        <textarea
          placeholder="Forneça detalhes adicionais como dimensões recomendadas..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:ring-1 dark:border-slate-800 dark:bg-slate-950"
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Status de Publicação</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:ring-1 dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="DRAFT">Rascunho (Draft)</option>
            <option value="PUBLISHED">Publicado (Published)</option>
            <option value="ARCHIVED">Arquivado (Archived)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2.5 py-1">
        <input
          type="checkbox"
          id="is-free-checkbox"
          checked={isFree}
          onChange={(e) => setIsFree(e.target.checked)}
          className="h-4.5 w-4.5 rounded border-slate-350 text-indigo-650 focus:ring-indigo-500"
        />
        <label htmlFor="is-free-checkbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Arte Gratuita para equipe
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Tags da Arte</label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Adicione tag (ex: vetor, sublimacao)"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          />
          <Button type="button" onClick={handleAddTag} variant="outline" size="sm" className="h-9 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {tagNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tagNames.map((tag) => (
              <span 
                key={tag} 
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-md text-xs font-semibold"
              >
                #{tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="text-red-500 hover:text-red-700 ml-1">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Arquivos Originais (Download)</label>
        <FileUploader
          selectedFiles={files}
          onFilesSelected={(newFiles) => setFiles([...files, ...newFiles])}
          onRemoveFile={(idx) => setFiles(files.filter((_, i) => i !== idx))}
        />
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => router.back()}
          disabled={submitting}
          className="rounded-lg h-10 px-6"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={submitting}
          className="rounded-lg gap-2 h-10 px-8 font-semibold shadow-md"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? 'Atualizar Arte' : 'Cadastrar Arte'}
        </Button>
      </div>
    </form>
  )
}
