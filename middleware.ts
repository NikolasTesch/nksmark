import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { edgeAuthConfig } from './src/lib/auth/edge-config'

// Middleware roda no Edge Runtime: usa apenas a config edge-safe (sem Prisma
// nem scrypt). A config completa com providers fica em ./src/lib/auth/auth.
const { auth } = NextAuth(edgeAuthConfig)

export function middlewareHandler(req: { auth: { user?: { role?: Role } } | null; nextUrl: URL }) {
  const isLoggedIn = !!req.auth
  const isOnAdmin = req.nextUrl.pathname.startsWith('/admin')
  const userRole = req.auth?.user?.role

  if (isOnAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
    if (userRole === Role.ADMIN) {
      // ADMIN tem acesso irrestrito a todas as áreas administrativas
    } else if (userRole === Role.FASE) {
      // FASE (equipe interna) acessa o catálogo de artes e criação/edição
      const isArtworkRoute =
        req.nextUrl.pathname === '/admin/artes' ||
        req.nextUrl.pathname.startsWith('/admin/artes/')
      if (!isArtworkRoute) {
        return NextResponse.redirect(new URL('/admin/artes', req.nextUrl))
      }
    } else {
      return NextResponse.redirect(new URL('/loja', req.nextUrl))
    }
  }

  const isOnMeusDownloads = req.nextUrl.pathname.startsWith('/meus-downloads')
  if (isOnMeusDownloads) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
    if (userRole !== Role.FASE && userRole !== Role.ADMIN) {
      return NextResponse.redirect(new URL('/loja', req.nextUrl))
    }
  }

  // /minhas-compras é a área do cliente pagante (CLIENT). Equipe FASE/ADMIN
  // também pode acessar; visitante é mandado ao login.
  const isOnMinhasCompras = req.nextUrl.pathname.startsWith('/minhas-compras')
  if (isOnMinhasCompras) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
    if (userRole !== Role.CLIENT && userRole !== Role.FASE && userRole !== Role.ADMIN) {
      return NextResponse.redirect(new URL('/loja', req.nextUrl))
    }
  }

  return NextResponse.next()
}

export default auth((req) => middlewareHandler(req as unknown as { auth: { user?: { role?: Role } } | null; nextUrl: URL }))

export const config = {
  matcher: ['/admin/:path*', '/meus-downloads/:path*', '/minhas-compras/:path*'],
}
