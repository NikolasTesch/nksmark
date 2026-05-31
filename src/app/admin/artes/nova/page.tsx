'use client'

import * as React from 'react'
import { Category } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import { ArtworkFormNks } from '@/components/admin/ArtworkFormNks'

export default function NovaArtePage() {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setCategories(res.data)
        }
      })
      .catch((err) => console.error('Erro ao buscar categorias:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center py-20 justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
      </div>
    )
  }

  return <ArtworkFormNks mode="create" categories={categories} />
}
