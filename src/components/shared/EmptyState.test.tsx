// @vitest-environment jsdom
import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from './EmptyState'
import { ShoppingCart } from 'lucide-react'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('EmptyState — contrato da loja', () => {
  it('renderiza título padrão e CTA Limpar Filtros', () => {
    const onReset = vi.fn()
    render(<EmptyState onReset={onReset} />)

    expect(screen.getByText('Nenhuma arte encontrada')).toBeTruthy()
    expect(
      screen.getByText(/Tente ajustar seus filtros de busca ou limpe as seleções atuais/i),
    ).toBeTruthy()

    const btn = screen.getByRole('button', { name: /Limpar Filtros/i })
    fireEvent.click(btn)
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})

describe('EmptyState — carrinho', () => {
  it('exibe CTA Ver a loja apontando para /loja', () => {
    render(
      <EmptyState
        icon={ShoppingCart}
        title="Seu carrinho está vazio"
        description="Explore o catálogo."
        actionHref="/loja"
        actionLabel="Ver a loja"
      />,
    )

    expect(screen.getByText('Seu carrinho está vazio')).toBeTruthy()
    const cta = screen.getByRole('link', { name: /Ver a loja/i })
    expect(cta.getAttribute('href')).toBe('/loja')
  })
})
