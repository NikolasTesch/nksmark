'use client'

import * as React from 'react'
import { Category, Tag } from '@prisma/client'
import { SearchBar } from '../shared/SearchBar'
import { Button } from '@/components/ui/button'
import { Sparkles, Grid } from 'lucide-react'

interface ArtworkFiltersProps {
  categories: Category[]
  tags: Tag[]
  selectedCategory?: string
  selectedTag?: string
  search: string
  isFree?: boolean
  onCategorySelect: (id?: string) => void
  onTagSelect: (id?: string) => void
  onSearchChange: (value: string) => void
  onIsFreeSelect: (free?: boolean) => void
  onReset: () => void
}

export function ArtworkFilters({
  categories,
  tags,
  selectedCategory,
  selectedTag,
  search,
  isFree,
  onCategorySelect,
  onTagSelect,
  onSearchChange,
  onIsFreeSelect,
  onReset,
}: ArtworkFiltersProps) {
  return (
    <div className="flex flex-col gap-6 p-6 bg-white border border-nks-gray-200 rounded-lg shadow-nks-sm mb-8 animate-in fade-in duration-300">
      
      {/* Top Search & Reset Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <SearchBar value={search} onChange={onSearchChange} />
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button 
            onClick={() => onIsFreeSelect(isFree ? undefined : true)}
            variant={isFree ? 'default' : 'outline'}
            className="rounded gap-2 text-xs font-semibold px-4 h-9"
          >
            <Sparkles className="h-4 w-4" />
            Só Gratuitas
          </Button>
          
          {(selectedCategory || selectedTag || search || isFree !== undefined) && (
            <Button onClick={onReset} variant="ghost" className="text-xs text-nks-gray-700 hover:text-nks-black rounded h-9">
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Categories Row */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold text-nks-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Grid className="h-3.5 w-3.5" /> Categorias
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onCategorySelect(undefined)}
            variant={!selectedCategory ? 'default' : 'outline'}
            className="rounded text-xs px-4 h-8"
          >
            Todas
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              onClick={() => onCategorySelect(cat.id)}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              className="rounded text-xs px-4 h-8 transition-all"
              style={
                selectedCategory === cat.id && cat.color
                  ? { backgroundColor: cat.color, borderColor: 'transparent', color: '#fff' }
                  : {}
              }
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tags Row */}
      {tags.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-nks-gray-200 pt-4">
          <span className="text-xs font-bold text-nks-gray-400 uppercase tracking-wider">
            Tags populares
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagSelect(selectedTag === tag.id ? undefined : tag.id)}
                className={`font-mono text-xs px-2.5 py-1 rounded border transition-all ${
                  selectedTag === tag.id
                    ? 'bg-nks-red border-nks-red text-white font-medium'
                    : 'bg-nks-gray-100 border-nks-gray-200 hover:bg-nks-gray-200 text-nks-gray-700'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
