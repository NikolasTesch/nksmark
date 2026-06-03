'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderPlus, Tag as TagIcon, Settings, Trash2, Loader2, AlertCircle, GripVertical } from 'lucide-react'
import { useAdminContent } from '@/hooks/useAdminContent'
import { Category } from '@prisma/client'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableCategoryRow({
  category,
  actionLoading,
  onToggle,
}: {
  category: Category
  actionLoading: boolean
  onToggle: (c: Category) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3.5 border border-nks-gray-200 rounded-sm bg-nks-gray-100/40 hover:bg-nks-gray-100/80 transition-colors"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="text-nks-gray-400 hover:text-nks-gray-700 cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="h-4 w-4 rounded-sm border border-nks-gray-200 shadow-sm" style={{ backgroundColor: category.color || '#ccc' }} />
        <span className="text-sm font-bold text-nks-black">{category.name}</span>
      </div>

      <label className="flex items-center gap-2 text-xs font-bold text-nks-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={category.showInFilter}
          disabled={actionLoading}
          onChange={() => onToggle(category)}
          className="rounded-sm text-nks-red focus:ring-nks-red h-4 w-4 cursor-pointer"
        />
        Aparece no filtro da Loja
      </label>
    </div>
  )
}

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
    reorderCategories,
    addTag,
    deleteTag,
  } = useAdminContent()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [reorderLoading, setReorderLoading] = React.useState(false)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    const newOrder = arrayMove(categories, oldIndex, newIndex).map((c) => c.id)

    setReorderLoading(true)
    await reorderCategories(newOrder)
    setReorderLoading(false)
  }

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
        <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black mb-1">
          Gestão de Conteúdo
        </h1>
        <p className="text-xs font-semibold text-nks-gray-700">
          Gerencie as categorias, tags e a ordenação dos filtros de exibição do catálogo.
        </p>
      </div>

      <div className="flex border-b border-nks-gray-200 gap-6 mb-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-xs font-display font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
            activeTab === 'categories'
              ? 'border-nks-red text-nks-red'
              : 'border-transparent text-nks-gray-400 hover:text-nks-black'
          }`}
        >
          <FolderPlus className="h-4 w-4" /> Categorias
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`pb-3 text-xs font-display font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
            activeTab === 'tags'
              ? 'border-nks-red text-nks-red'
              : 'border-transparent text-nks-gray-400 hover:text-nks-black'
          }`}
        >
          <TagIcon className="h-4 w-4" /> Tags
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`pb-3 text-xs font-display font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
            activeTab === 'filters'
              ? 'border-nks-red text-nks-red'
              : 'border-transparent text-nks-gray-400 hover:text-nks-black'
          }`}
        >
          <Settings className="h-4 w-4" /> Ordenação de Filtros
        </button>
      </div>

      {(error || actionError) && (
        <div className="bg-nks-red-subtle border border-nks-red p-4 rounded-sm flex items-center gap-3 text-xs font-semibold text-nks-red-dark">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
        </div>
      ) : (
        <>
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[18px] items-start">
              <div className="lg:col-span-5 bg-white border border-nks-gray-200 p-6 rounded-sm shadow-nks-sm flex flex-col gap-4.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1">
                  Nova Categoria
                </span>
                <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">Nome da Categoria</label>
                    <Input
                      type="text"
                      placeholder="Ex: Estampas"
                      value={catName}
                      onChange={(e) => {
                        setCatName(e.target.value)
                        setCatSlug(e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'))
                      }}
                      className="rounded-sm text-nks-black"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">Slug da URL</label>
                    <Input
                      type="text"
                      placeholder="estampas"
                      value={catSlug}
                      onChange={(e) => setCatSlug(e.target.value)}
                      className="rounded-sm text-nks-black"
                      required
                      disabled
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">Cor de Badge</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="h-10 w-16 border border-nks-gray-200 rounded-sm cursor-pointer bg-white p-0.5"
                      />
                      <span className="text-xs text-nks-gray-450 font-mono font-bold uppercase">{catColor}</span>
                    </div>
                  </div>

                  <Button type="submit" disabled={actionLoading} className="w-full mt-2 font-display font-extrabold uppercase tracking-wider text-xs h-11 rounded-sm bg-nks-red hover:bg-nks-red-dark text-white cursor-pointer transition-all active:scale-[0.99] border-none shadow-nks-sm">
                    {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Criar Categoria
                  </Button>
                </form>
              </div>

              <div className="lg:col-span-7 border border-nks-gray-200 rounded-sm overflow-hidden bg-white shadow-nks-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-nks-black text-white border-b border-nks-gray-200 font-display font-extrabold text-[11px] uppercase tracking-[0.08em]">
                        <th className="py-3.5 px-4">Cor</th>
                        <th className="py-3.5 px-4">Nome</th>
                        <th className="py-3.5 px-4">Slug</th>
                        <th className="py-3.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nks-gray-200">
                      {categories.map((c) => (
                        <tr key={c.id} className="hover:bg-nks-gray-100/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="h-5 w-5 rounded-sm border border-nks-gray-200 shadow-xs" style={{ backgroundColor: c.color || '#ccc' }} />
                          </td>
                          <td className="py-3.5 px-4 font-bold text-nks-black">{c.name}</td>
                          <td className="py-3.5 px-4 font-mono text-xs text-nks-gray-400">{c.slug}</td>
                          <td className="py-3.5 px-4 text-right">
                            <Button 
                              onClick={() => handleDeleteCategory(c.id)} 
                              variant="ghost" 
                              size="icon" 
                              disabled={actionLoading}
                              className="h-8 w-8 text-nks-red hover:text-nks-red-dark hover:bg-nks-red-subtle border border-nks-red/20 rounded-sm cursor-pointer hover:bg-nks-red-subtle/50 disabled:opacity-30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-nks-gray-400 font-semibold text-xs">Nenhuma categoria cadastrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[18px] items-start">
              <div className="lg:col-span-5 bg-white border border-nks-gray-200 p-6 rounded-sm shadow-nks-sm flex flex-col gap-4.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1">
                  Nova Tag
                </span>
                <form onSubmit={handleAddTag} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">Nome da Tag</label>
                    <Input
                      type="text"
                      placeholder="Ex: sublimacao"
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      className="rounded-sm text-nks-black"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={actionLoading} className="w-full mt-2 font-display font-extrabold uppercase tracking-wider text-xs h-11 rounded-sm bg-nks-red hover:bg-nks-red-dark text-white cursor-pointer transition-all active:scale-[0.99] border-none shadow-nks-sm">
                    {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Criar Tag
                  </Button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-nks-gray-200 p-6 rounded-sm shadow-nks-sm flex flex-col gap-4.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">
                  Tags Cadastradas
                </span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span 
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nks-gray-100 border border-nks-gray-200 text-xs rounded-sm text-nks-gray-705 font-mono font-bold"
                    >
                      #{t.name}
                      <button 
                        onClick={() => handleDeleteTag(t.id)} 
                        disabled={actionLoading}
                        className="text-nks-red hover:text-nks-red-dark font-black ml-1.5 cursor-pointer disabled:opacity-50 text-sm leading-none"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-nks-gray-400 font-semibold py-4">Nenhuma tag cadastrada.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="bg-white border border-nks-gray-200 p-6 rounded-sm shadow-nks-sm flex flex-col gap-6 max-w-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-extrabold uppercase tracking-tight text-nks-black text-[16px] mb-1">Configurações de Exibição</h3>
                  <p className="text-xs font-semibold text-nks-gray-750">
                    Arraste para reordenar. Marque o checkbox para exibir a categoria no filtro da loja.
                  </p>
                </div>
                {reorderLoading && <Loader2 className="h-4 w-4 animate-spin text-nks-red shrink-0 mt-1" />}
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-3">
                    {categories.map((c) => (
                      <SortableCategoryRow
                        key={c.id}
                        category={c}
                        actionLoading={actionLoading || reorderLoading}
                        onToggle={handleToggleFilter}
                      />
                    ))}
                    {categories.length === 0 && (
                      <p className="text-xs text-nks-gray-400 font-semibold py-4 text-center">Nenhuma categoria cadastrada.</p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </>
      )}
    </div>
  )
}
