// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const { signInMock, sessionMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  sessionMock: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
  signIn: (...args: unknown[]) => signInMock(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const fetchMock = vi.fn()
global.fetch = fetchMock as typeof fetch

import CadastroPage from './page'

beforeEach(() => {
  vi.clearAllMocks()
  sessionMock.mockReturnValue({ status: 'unauthenticated', data: null })
  fetchMock.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
  signInMock.mockResolvedValue({ error: null })
})

describe('CadastroPage — estados do formulário', () => {
  it('renderiza o formulário de cadastro para usuário não autenticado', () => {
    render(<CadastroPage />)
    expect(screen.getByPlaceholderText(/Seu nome/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/seu-email/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/Mínimo 8 caracteres/i)).toBeTruthy()
  })

  it('estado de loading: botão desabilitado com spinner ao submeter', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {})) // nunca resolve

    render(<CadastroPage />)

    fireEvent.change(screen.getByPlaceholderText(/Seu nome/i), { target: { value: 'Teste' } })
    fireEvent.change(screen.getByPlaceholderText(/seu-email/i), { target: { value: 'teste@x.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 8 caracteres/i), { target: { value: 'senha123' } })

    const btn = screen.getByRole('button', { name: /Criar conta/i })
    fireEvent.submit(btn.closest('form')!)

    // Quando loading=true, o texto "Criar conta" some e o botão fica desabilitado
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Criar conta/i })).toBeNull()
    })

    // O botão submit ainda existe mas está disabled (exibe apenas o spinner Loader2)
    const submitBtn = screen.getAllByRole('button').find((b) => b.getAttribute('type') === 'submit')
    expect(submitBtn).toBeTruthy()
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('estado de erro: exibe banner com mensagem do backend', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false, error: 'E-mail já cadastrado' }),
    } as Response)

    render(<CadastroPage />)

    fireEvent.change(screen.getByPlaceholderText(/Seu nome/i), { target: { value: 'Teste' } })
    fireEvent.change(screen.getByPlaceholderText(/seu-email/i), { target: { value: 'dup@x.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 8 caracteres/i), { target: { value: 'senha123' } })
    fireEvent.submit(screen.getByRole('button', { name: /Criar conta/i }))

    expect(await screen.findByText(/E-mail já cadastrado/i)).toBeTruthy()
  })

  it('estado de sucesso: chama signIn após cadastro bem-sucedido', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)
    signInMock.mockResolvedValue({ error: null })

    render(<CadastroPage />)

    fireEvent.change(screen.getByPlaceholderText(/Seu nome/i), { target: { value: 'Novo' } })
    fireEvent.change(screen.getByPlaceholderText(/seu-email/i), { target: { value: 'novo@x.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 8 caracteres/i), { target: { value: 'senha123' } })
    fireEvent.submit(screen.getByRole('button', { name: /Criar conta/i }))

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', expect.objectContaining({ email: 'novo@x.com', password: 'senha123', redirect: false }))
    })
  })

  it('exibe erro genérico quando o fetch lança exceção', async () => {
    fetchMock.mockRejectedValue(new Error('network error'))

    render(<CadastroPage />)

    fireEvent.change(screen.getByPlaceholderText(/Seu nome/i), { target: { value: 'X' } })
    fireEvent.change(screen.getByPlaceholderText(/seu-email/i), { target: { value: 'x@x.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 8 caracteres/i), { target: { value: 'senha123' } })
    fireEvent.submit(screen.getByRole('button', { name: /Criar conta/i }))

    expect(await screen.findByText(/Ocorreu um erro no servidor/i)).toBeTruthy()
  })
})
