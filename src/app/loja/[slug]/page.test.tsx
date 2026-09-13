// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

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

const { sessionMock, cartMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
  cartMock: { addToCart: vi.fn(), isInCart: vi.fn(() => false) },
}))
vi.mock('next-auth/react', () => ({ useSession: () => sessionMock() }))
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({ addToCart: cartMock.addToCart, isInCart: cartMock.isInCart }),
}))

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
  tags: [] as { id: string; name: string; slug: string }[],
  files: [
    { id: 'f1', format: 'CDR', url: null, size: 100, artworkId: 'art-1' },
    { id: 'f2', format: 'PNG', url: 'https://cdn.test/preview.png', size: 200, artworkId: 'art-1' },
  ],
  _count: { downloads: 0 },
}

function makeArtwork(overrides: Partial<typeof artwork> = {}): typeof artwork {
  return { ...artwork, ...overrides }
}

function mockResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response)
}

function setupFetch(paidArtworkIds: string[] = []) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('categoryId')) {
      return mockResponse({
        success: true,
        items: [makeArtwork({ id: 'rel-1', slug: 'relacionada', title: 'Relacionada' })],
      })
    }
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

function mockSession(role?: string, email = 'u@x.com') {
  sessionMock.mockReturnValue(
    role
      ? { data: { user: { id: 'u', role, email } }, status: 'authenticated' }
      : { data: null, status: 'unauthenticated' }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  setupFetch()
  cartMock.isInCart.mockReturnValue(false)
  cartMock.addToCart.mockResolvedValue({ success: true, error: null })
  mockSession()
})

describe('ArtworkDetailsPage — botão de ação por role', () => {
  it('VISITOR: exibe "Entrar para comprar" com o preço da arte', async () => {
    sessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Entrar para comprar/i)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('CLIENT sem compra: exibe "Adicionar ao carrinho"', async () => {
    sessionMock.mockReturnValue({
      data: { user: { id: 'u1', role: 'CLIENT', email: 'c@x.com' } },
      status: 'authenticated',
    })
    setupFetch([])
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Adicionar ao carrinho/i)
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

  it('VISITOR em arte grátis: exibe "Entrar para baixar" e selo Grátis', async () => {
    const free = makeArtwork({ isFree: true, priceCents: 0 })
    fetchMock.mockImplementation((url: string) =>
      url.includes('/api/artworks')
        ? mockResponse({ success: true, data: [free] })
        : mockResponse({ success: true, data: [] })
    )
    render(<ArtworkDetailsPage />)
    expect(await screen.findAllByText(/Entrar para baixar/i)).toBeTruthy()
    expect((await screen.findAllByText('Grátis')).length).toBeGreaterThan(0)
  })
})

describe('ArtworkDetailsPage — estados de exibição', () => {
  it('arte não localizada (data vazia): mostra mensagem e link de volta', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('/api/artworks')
        ? mockResponse({ success: true, data: [] })
        : mockResponse({ success: true, data: [] })
    )
    render(<ArtworkDetailsPage />)
    expect(await screen.findByText(/Arte não localizada no catálogo/i)).toBeTruthy()
    expect(screen.getByText(/Voltar para o catálogo/i)).toBeTruthy()
  })

  it('falha de rede ao buscar arte: também cai no estado não localizada', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network')))
    render(<ArtworkDetailsPage />)
    expect(await screen.findByText(/Arte não localizada no catálogo/i)).toBeTruthy()
  })

  it('com tags: renderiza a seção "Tags" com os badges', async () => {
    const tagged = makeArtwork({
      tags: [
        { id: 't1', name: 'floral', slug: 'floral' },
        { id: 't2', name: 'minimal', slug: 'minimal' },
      ],
    })
    fetchMock.mockImplementation((url: string) =>
      url.includes('/api/artworks')
        ? mockResponse({ success: true, data: [tagged] })
        : mockResponse({ success: true, data: [] })
    )
    render(<ArtworkDetailsPage />)
    expect(await screen.findByText(/Tags/i)).toBeTruthy()
    expect(screen.getByText('#floral')).toBeTruthy()
    expect(screen.getByText('#minimal')).toBeTruthy()
  })

  it('artes relacionadas: renderiza a seção "Você também pode gostar"', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('categoryId')) {
        return mockResponse({
          success: true,
          items: [makeArtwork({ id: 'rel-1', slug: 'relacionada', title: 'Relacionada' })],
        })
      }
      if (url.includes('/api/artworks')) return mockResponse({ success: true, data: [artwork] })
      return mockResponse({ success: true, data: [] })
    })
    render(<ArtworkDetailsPage />)
    expect(await screen.findByText(/Você também pode gostar/i)).toBeTruthy()
  })

  it('arte de coleção: renderiza seção e título da coleção', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/public/collections')) {
        return mockResponse({
          success: true,
          data: {
            collections: [
              {
                id: 'col-1',
                title: 'Coleção Verão',
                slug: 'colecao-verao',
                description: null,
                artworks: [makeArtwork({ id: 'col-art-1', slug: 'outra', title: 'Outra Arte' })],
              },
            ],
          },
        })
      }
      if (url.includes('/api/artworks')) return mockResponse({ success: true, data: [artwork] })
      return mockResponse({ success: true, data: [] })
    })
    render(<ArtworkDetailsPage />)
    expect(await screen.findByText(/Outras artes desta coleção/i)).toBeTruthy()
    expect(screen.getByText('Coleção Verão')).toBeTruthy()
  })
})

describe('ArtworkDetailsPage — compra e carrinho', () => {
  it('CLIENT com compra PAGA: mostra aviso "Compra confirmada"', async () => {
    mockSession('CLIENT')
    setupFetch(['art-1'])
    render(<ArtworkDetailsPage />)
    expect(await screen.findByText(/Compra confirmada/i)).toBeTruthy()
  })

  it('CLIENT com arte já no carrinho: CTA vira "Ir para o carrinho"', async () => {
    mockSession('CLIENT')
    cartMock.isInCart.mockReturnValue(true)
    render(<ArtworkDetailsPage />)
    expect(await screen.findAllByText(/Ir para o carrinho/i)).toBeTruthy()
  })

  it('CLIENT: falha ao adicionar ao carrinho mostra mensagem de erro', async () => {
    mockSession('CLIENT')
    cartMock.addToCart.mockResolvedValue({ success: false, error: 'Estoque esgotado' })
    render(<ArtworkDetailsPage />)
    const buttons = await screen.findAllByText(/Adicionar ao carrinho/i)
    fireEvent.click(buttons[0])
    expect(await screen.findByText('Estoque esgotado')).toBeTruthy()
  })
})
