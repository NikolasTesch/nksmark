// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'arte-teste' }),
  useRouter: () => ({ push: vi.fn() }),
}))

const { sessionMock } = vi.hoisted(() => ({ sessionMock: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession: () => sessionMock() }))

// Stubs de componentes complexos para isolar o comportamento do botão
vi.mock('@/components/artwork/ArtworkPreview', () => ({ ArtworkPreview: () => null }))
vi.mock('@/components/artwork/DownloadModal', () => ({
  DownloadModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="download-modal" /> : null,
}))
vi.mock('@/components/layout/Header', () => ({ Header: () => null }))
vi.mock('@/components/layout/Footer', () => ({ Footer: () => null }))
vi.mock('@/components/artwork/ArtworkCard', () => ({ ArtworkCard: () => null }))
vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }),
}))

const fetchMock = vi.fn()
global.fetch = fetchMock as typeof fetch

import ArtworkDetailsPage from './page'

const artwork = {
  id: 'art-1',
  title: 'Arte Teste',
  slug: 'arte-teste',
  description: null,
  status: 'PUBLISHED',
  isFree: false,
  priceCents: 1500,
  previewUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Categoria', slug: 'categoria', color: null, showInFilter: true, filterOrder: 0 },
  tags: [],
  files: [{ id: 'f1', format: 'CDR', url: null, size: 100, artworkId: 'art-1' }],
  _count: { downloads: 0 },
}

function mockResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response)
}

function setupFetch(paidArtworkIds: string[] = []) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/api/artworks')) {
      return mockResponse({ success: true, data: [artwork] })
    }
    if (url.includes('/api/orders')) {
      return mockResponse({
        success: true,
        data: paidArtworkIds.map((id) => ({ status: 'PAID', artwork: { id } })),
      })
    }
    return mockResponse({ success: true, data: [] })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupFetch()
  sessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })
})

describe('ArtworkDetailsPage — botão de ação por role', () => {
  it('VISITOR: exibe "Entrar para comprar" com o preço da arte', async () => {
    sessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Entrar para comprar/i)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('CLIENT sem compra: exibe "Comprar por R$"', async () => {
    sessionMock.mockReturnValue({
      data: { user: { id: 'u1', role: 'CLIENT', email: 'c@x.com' } },
      status: 'authenticated',
    })
    setupFetch([])
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Comprar por/i)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('CLIENT com compra PAGA: exibe "Baixar arte comprada"', async () => {
    sessionMock.mockReturnValue({
      data: { user: { id: 'u1', role: 'CLIENT', email: 'c@x.com' } },
      status: 'authenticated',
    })
    setupFetch(['art-1'])
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Baixar arte comprada/i)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('FASE: exibe "Liberar downloads"', async () => {
    sessionMock.mockReturnValue({
      data: { user: { id: 'u2', role: 'FASE', email: 'f@x.com' } },
      status: 'authenticated',
    })
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Liberar downloads/i)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('ADMIN: exibe "Liberar downloads"', async () => {
    sessionMock.mockReturnValue({
      data: { user: { id: 'u3', role: 'ADMIN', email: 'a@x.com' } },
      status: 'authenticated',
    })
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Liberar downloads/i)
    expect(buttons.length).toBeGreaterThan(0)
  })
})
