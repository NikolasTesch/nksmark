import { useState, useEffect } from 'react'

export interface DownloadHistoryItem {
  id: string
  artworkId: string
  artworkSlug?: string
  artworkTitle: string
  previewUrl: string
  format: string
  downloadedAt: string
}

export function useDownloadHistory() {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/downloads')
      const result = await res.json()
      if (result.success) {
        // API succeeded: use server data (even if empty — don't mix with localStorage)
        setHistory(result.data)
      } else {
        loadFromLocalStorage()
      }
    } catch {
      loadFromLocalStorage()
    } finally {
      setLoading(false)
    }
  }

  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem('nks_art_download_history')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setHistory(parsed)
      } catch (e) {
        console.error('Error parsing download history', e)
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial on-mount (sincroniza com a API)
    fetchHistory()
  }, [])

  const addToHistory = (item: Omit<DownloadHistoryItem, 'downloadedAt'>) => {
    const newItem: DownloadHistoryItem = {
      ...item,
      downloadedAt: new Date().toISOString(),
    }
    const updated = [newItem, ...history.filter((h) => h.id !== item.id)].slice(0, 100)
    setHistory(updated)
    localStorage.setItem('nks_art_download_history', JSON.stringify(updated))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('nks_art_download_history')
  }

  return {
    history,
    loading,
    addToHistory,
    clearHistory,
    refresh: fetchHistory,
  }
}
