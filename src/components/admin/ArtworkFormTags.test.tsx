// @vitest-environment jsdom
import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ArtworkFormNks } from './ArtworkFormNks'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Vetores',
    slug: 'vetores',
    color: null,
    showInFilter: false,
    filterOrder: 0,
    createdAt: new Date(),
  },
]

const mockTags = [
  { id: 'tag-1', name: 'vetor' },
  { id: 'tag-2', name: 'floral' },
  { id: 'tag-3', name: 'adesivo' },
]

describe('ArtworkFormNks - Gerenciamento de Tags', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockTags }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    })
  })

  it('exibe tags iniciais da arte', async () => {
    render(
      <ArtworkFormNks
        mode="edit"
        categories={mockCategories}
        initialData={{
          title: 'Arte Teste',
          tags: [{ name: 'estampa' }],
        }}
      />
    )

    expect(screen.getByText('estampa')).toBeTruthy()
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tags'))
  })

  it('abre dropdown com lista de tags cadastradas ao clicar em adicionar tag', async () => {
    render(
      <ArtworkFormNks
        mode="create"
        categories={mockCategories}
      />
    )

    const addBtn = screen.getByRole('button', { name: /adicionar tag/i })
    fireEvent.click(addBtn)

    // Aguarda carregar as tags da API
    await waitFor(() => {
      expect(screen.getByText('#vetor')).toBeTruthy()
      expect(screen.getByText('#floral')).toBeTruthy()
      expect(screen.getByText('#adesivo')).toBeTruthy()
    })
  })

  it('seleciona uma tag existente ao clicar sobre ela no dropdown', async () => {
    render(
      <ArtworkFormNks
        mode="create"
        categories={mockCategories}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /adicionar tag/i }))

    await waitFor(() => {
      expect(screen.getByText('#vetor')).toBeTruthy()
    })

    // Clica na tag existente
    fireEvent.mouseDown(screen.getByText('#vetor'))

    // Deve aparecer como tag selecionada (badge com botão X)
    expect(screen.getByText('vetor')).toBeTruthy()

    // Não deve mais aparecer como disponível no dropdown
    expect(screen.queryByText('#vetor')).toBeNull()
  })

  it('cria uma nova tag digitada pelo usuário', async () => {
    render(
      <ArtworkFormNks
        mode="create"
        categories={mockCategories}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /adicionar tag/i }))

    const input = screen.getByPlaceholderText('Buscar ou criar tag...')
    fireEvent.change(input, { target: { value: 'Minha Nova Tag' } })

    // Deve mostrar a opção de criar
    await waitFor(() => {
      expect(screen.getByText(/Criar tag “minha-nova-tag”/i)).toBeTruthy()
    })

    fireEvent.mouseDown(screen.getByText(/Criar tag “minha-nova-tag”/i))

    // Deve ter sido adicionada à lista
    expect(screen.getByText('minha-nova-tag')).toBeTruthy()
  })

  it('permite remover uma tag selecionada', async () => {
    render(
      <ArtworkFormNks
        mode="edit"
        categories={mockCategories}
        initialData={{
          title: 'Arte Teste',
          tags: [{ name: 'para-remover' }],
        }}
      />
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tags'))

    const tagBadge = screen.getByText('para-remover')
    expect(tagBadge).toBeTruthy()

    const containerSpan = tagBadge.closest('span')
    expect(containerSpan).toBeTruthy()
    const removeBtn = containerSpan!.querySelector('button')
    expect(removeBtn).toBeTruthy()
    fireEvent.click(removeBtn!)

    expect(screen.queryByText('para-remover')).toBeNull()
  })
})
