import { describe, it, expect, vi } from 'vitest'
import { Role } from '@prisma/client'

vi.mock('next-auth', () => ({
  default: () => ({
    auth: (fn: any) => fn,
  }),
}))

import { middlewareHandler } from '../middleware'

function makeRequest(pathname: string, role?: Role, isLoggedIn = true) {
  const url = new URL(`http://localhost${pathname}`)
  return {
    nextUrl: url,
    auth: isLoggedIn ? { user: { role } } : null,
  }
}

describe('middlewareHandler — Controle de acesso às rotas /admin', () => {
  it('redireciona para /login se não estiver logado ao acessar /admin', () => {
    const res = middlewareHandler(makeRequest('/admin/artes', undefined, false))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/login')
  })

  it('redireciona CLIENT para /loja ao tentar acessar /admin/artes', () => {
    const res = middlewareHandler(makeRequest('/admin/artes', Role.CLIENT))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/loja')
  })

  it('permite FASE acessar /admin/artes', () => {
    const res = middlewareHandler(makeRequest('/admin/artes', Role.FASE))
    expect(res.status).toBe(200)
  })

  it('permite FASE acessar /admin/artes/nova', () => {
    const res = middlewareHandler(makeRequest('/admin/artes/nova', Role.FASE))
    expect(res.status).toBe(200)
  })

  it('permite FASE acessar /admin/artes/art-123', () => {
    const res = middlewareHandler(makeRequest('/admin/artes/art-123', Role.FASE))
    expect(res.status).toBe(200)
  })

  it('redireciona FASE para /admin/artes ao acessar /admin', () => {
    const res = middlewareHandler(makeRequest('/admin', Role.FASE))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/admin/artes')
  })

  it('redireciona FASE para /admin/artes ao tentar acessar /admin/usuarios', () => {
    const res = middlewareHandler(makeRequest('/admin/usuarios', Role.FASE))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/admin/artes')
  })

  it('redireciona FASE para /admin/artes ao tentar acessar /admin/vendas', () => {
    const res = middlewareHandler(makeRequest('/admin/vendas', Role.FASE))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/admin/artes')
  })

  it('permite ADMIN acessar /admin/artes', () => {
    const res = middlewareHandler(makeRequest('/admin/artes', Role.ADMIN))
    expect(res.status).toBe(200)
  })

  it('permite ADMIN acessar /admin/usuarios', () => {
    const res = middlewareHandler(makeRequest('/admin/usuarios', Role.ADMIN))
    expect(res.status).toBe(200)
  })

  it('permite ADMIN acessar /admin (dashboard)', () => {
    const res = middlewareHandler(makeRequest('/admin', Role.ADMIN))
    expect(res.status).toBe(200)
  })
})
