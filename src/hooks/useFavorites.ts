'use client'

import { useCallback, useSyncExternalStore } from 'react'

// Favoritos vivem só no client (localStorage) — não há entidade no schema (Fase 2).
// Usamos um store de módulo + useSyncExternalStore para manter todos os cards e a
// loja em sincronia sem precisar de context provider.
const STORAGE_KEY = 'nks:favorites'

let favorites: Set<string> = new Set()
let initialized = false
const listeners = new Set<() => void>()

// Snapshot estável: só muda de referência quando o conteúdo muda, evitando loops
// no useSyncExternalStore.
let snapshot: string[] = []

function loadFromStorage() {
  if (initialized || typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    favorites = new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    favorites = new Set()
  }
  snapshot = Array.from(favorites)
  initialized = true
}

function emit() {
  snapshot = Array.from(favorites)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      /* armazenamento indisponível — segue só em memória */
    }
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  loadFromStorage()
  listeners.add(listener)
  // Sincroniza entre abas
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      try {
        const parsed = e.newValue ? (JSON.parse(e.newValue) as string[]) : []
        favorites = new Set(Array.isArray(parsed) ? parsed : [])
      } catch {
        favorites = new Set()
      }
      snapshot = Array.from(favorites)
      listeners.forEach((l) => l())
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot(): string[] {
  loadFromStorage()
  return snapshot
}

// No servidor o snapshot é sempre vazio (favoritos são client-only).
function getServerSnapshot(): string[] {
  return []
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids])

  const toggleFavorite = useCallback((id: string) => {
    if (favorites.has(id)) favorites.delete(id)
    else favorites.add(id)
    emit()
  }, [])

  return {
    favoriteIds: ids,
    favoritesCount: ids.length,
    isFavorite,
    toggleFavorite,
  }
}
