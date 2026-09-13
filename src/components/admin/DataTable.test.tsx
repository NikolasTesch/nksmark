// @vitest-environment jsdom
import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable } from './DataTable'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

type Row = { id: string; name: string; extra: string; value: string }

const columns = [
  { id: 'name', header: 'Nome', render: (r: Row) => r.name },
  {
    id: 'extra',
    header: 'Extra',
    hideOnMobile: true,
    render: (r: Row) => r.extra,
  },
  { id: 'value', header: 'Valor', render: (r: Row) => r.value },
]

const rows: Row[] = [{ id: '1', name: 'Alpha', extra: 'oculto-no-mobile', value: '10' }]

describe('DataTable', () => {
  it('mostra EmptyState quando não há linhas', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        emptyTitle="Nada aqui"
        emptyDescription="Cadastre o primeiro item."
      />,
    )
    expect(screen.getByText('Nada aqui')).toBeTruthy()
    expect(screen.getByText('Cadastre o primeiro item.')).toBeTruthy()
  })

  it('marca colunas hideOnMobile e não as inclui nos cards', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyTitle="Vazio" />,
    )

    expect(container.querySelectorAll('[data-hide-on-mobile="true"]').length).toBeGreaterThan(0)
    expect(container.querySelector('.overflow-x-auto')).toBeTruthy()
    expect(container.querySelector('.md\\:hidden')).toBeTruthy()

    const extras = screen.getAllByText('oculto-no-mobile')
    expect(extras).toHaveLength(1)
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
  })

  it('snapshot da tabela com uma linha', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyTitle="Vazio" />,
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})
