'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderPlus, Tag as TagIcon, Settings, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { useAdminContent } from '@/hooks/useAdminContent'
import { Category } from '@prisma/client'

export default function ConteudoPage() {
  const [activeTab, setActiveTab] = React.useState<'categories' | 'tags' | 'filters'>('categories')
  const {
    categories,
    tags,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    deleteTag,
  } = useAdminContent()

  const [catName, setCatName] = React.useState('')
  const [catColor, setCatColor] = React.useState('#6366f1')
  const [catSlug, setCatSlug] = React.useState('')
  const [tagName, setTagName] = React.useState('')
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName) return

    setActionLoading(true)
    setActionError(null)
    const result = await addCategory(catName, catColor)
    setActionLoading(false)

    if (result.success) {
      setCatName('')
      setCatSlug('')
    } else {
      setActionError(result.error || 'Erro ao criar categoria.')
    }
  }

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName) return

    setActionLoading(true)
    setActionError(null)
    const result = await addTag(tagName)
    setActionLoading(false)

    if (result.success) {
      setTagName('')
    } else {
      setActionError(result.error || 'Erro ao criar tag.')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Deseja remover esta categoria?')) {
      setActionLoading(true)
      setActionError(null)
      const result = await deleteCategory(id)
      setActionLoading(false)
      if (!result.success) {
        setActionError(result.error || 'Erro ao deletar categoria.')
      }
    }
  }

  const handleDeleteTag = async (id: string) => {
    if (confirm('Deseja remover esta tag?')) {
      setActionLoading(true)
      setActionError(null)
      const result = await deleteTag(id)
      setActionLoading(false)
      if (!result.success) {
        setActionError(result.error || 'Erro ao deletar tag.')
      }
    }
  }

  const handleToggleFilter = async (category: Category) => {
    setActionLoading(true)
    setActionError(null)
    const result = await updateCategory(category.id, {
      showInFilter: !category.showInFilter,
    })
    setActionLoading(false)
    if (!result.success) {
      setActionError(result.error || 'Erro ao atualizar filtro.')
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-1">
          Gestão de Conteúdo
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie as categorias, tags e a ordenação dos filtros de exibição do catálogo.
        </p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 mb-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
            activeTab === 'categories'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <FolderPlus className="h-4 w-4" /> Categorias
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
            activeTab === 'tags'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <TagIcon className="h-4 w-4" /> Tags
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
            activeTab === 'filters'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Settings className="h-4 w-4" /> Ordenação de Filtros
        </button>
      </div>

      {(error || actionError) && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-4 rounded-xl flex items-center gap-3 text-sm text-red-800 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-450" />
        </div>
      ) : (
        <>
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  Nova Categoria
                </span>
                <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 font-semibold">Nome da Categoria</label>
                    <Input
                      type="text"
                      placeholder="Ex: Estampas"
                      value={catName}
                      onChange={(e) => {
                        setCatName(e.target.value)
                        setCatSlug(e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'))
                      }}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 font-semibold">Slug da URL</label>
                    <Input
                      type="text"
                      placeholder="estampas"
                      value={catSlug}
                      onChange={(e) => setCatSlug(e.target.value)}
                      required
                      disabled
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 font-semibold">Cor de Badge</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="h-10 w-16 border rounded cursor-pointer"
                      />
                      <span className="text-xs text-slate-450 font-mono font-bold uppercase">{catColor}</span>
                    </div>
                  </div>

                  <Button type="submit" disabled={actionLoading} className="w-full mt-2 font-bold text-xs h-10 rounded-xl cursor-pointer">
                    {actionLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Criar Categoria
                  </Button>
                </form>
              </div>

              <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs uppercase tracking-wider">
                        <th className="py-3 px-4">Cor</th>
                        <th className="py-3 px-4">Nome</th>
                        <th className="py-3 px-4">Slug</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {categories.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="h-5 w-5 rounded-full border border-slate-250 shadow-xs" style={{ backgroundColor: c.color || '#ccc' }} />
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{c.name}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">{c.slug}</td>
                          <td className="py-3 px-4 text-right">
                            <Button 
                              onClick={() => handleDeleteCategory(c.id)} 
                              variant="ghost" 
                              size="icon" 
                              disabled={actionLoading}
                              className="h-8 w-8 text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">Nenhuma categoria cadastrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  Nova Tag
                </span>
                <form onSubmit={handleAddTag} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 font-semibold">Nome da Tag</label>
                    <Input
                      type="text"
                      placeholder="Ex: sublimacao"
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={actionLoading} className="w-full mt-2 font-bold text-xs h-10 rounded-xl cursor-pointer">
                    {actionLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Criar Tag
                  </Button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tags Cadastradas
                </span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span 
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 dark:bg-slate-950 dark:border-slate-800 text-xs rounded-lg text-slate-700 dark:text-slate-350 font-sans font-medium"
                    >
                      #{t.name}
                      <button 
                        onClick={() => handleDeleteTag(t.id)} 
                        disabled={actionLoading}
                        className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer disabled:opacity-50"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-sm text-slate-400 py-4">Nenhuma tag cadastrada.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col gap-6 max-w-2xl">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">Configurações de Exibição</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Escolha quais categorias devem aparecer no filtro da loja e ative ou desative-as sem excluí-las.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {categories.map((c) => (
                  <div 
                    key={c.id} 
                    className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-4.5 w-4.5 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: c.color || '#ccc' }} />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-505 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.showInFilter}
                          disabled={actionLoading}
                          onChange={() => handleToggleFilter(c)}
                          className="rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        Aparece no filtro da Loja
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
