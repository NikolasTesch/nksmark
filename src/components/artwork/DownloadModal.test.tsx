// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DownloadModal } from './DownloadModal'

// Radix usa APIs de layout ausentes no jsdom; stubs mínimos para renderizar.
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

const artwork = { id: 'art-1', title: 'Minha Arte' } as never

function file(id: string, format: string) {
  return { id, format, url: `files/${id}`, size: 100, artworkId: 'art-1' } as never
}

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  artwork,
  userRole: 'FASE',
  onDownloadRequest: vi.fn(),
  onZipDownloadRequest: vi.fn(),
}

describe('DownloadModal', () => {
  it('exibe o botão "Baixar todos (.zip)" quando há mais de um arquivo', () => {
    render(<DownloadModal {...baseProps} files={[file('f1', 'CDR'), file('f2', 'OTF')]} />)
    expect(screen.getByText(/Baixar todos \(\.zip\)/i)).toBeTruthy()
  })

  it('não exibe o botão de .zip quando há apenas um arquivo', () => {
    render(<DownloadModal {...baseProps} files={[file('f1', 'CDR')]} />)
    expect(screen.queryByText(/Baixar todos \(\.zip\)/i)).toBeNull()
  })

  it('não exibe o botão de .zip para visitante mesmo com vários arquivos', () => {
    render(<DownloadModal {...baseProps} userRole="VISITOR" files={[file('f1', 'CDR'), file('f2', 'OTF')]} />)
    expect(screen.queryByText(/Baixar todos \(\.zip\)/i)).toBeNull()
  })
})
