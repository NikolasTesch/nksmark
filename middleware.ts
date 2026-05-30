import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { edgeAuthConfig } from './src/lib/auth/edge-config'

// Middleware roda no Edge Runtime: usa apenas a config edge-safe (sem Prisma
// nem scrypt). A config completa com providers fica em ./src/lib/auth/auth.
const { auth } = NextAuth(edgeAuthConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnAdmin = req.nextUrl.pathname.startsWith('/admin')
  const userRole = (req.auth?.user as { role?: Role })?.role

  if (isOnAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
    if (userRole !== Role.ADMIN) {
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  const isOnMeusDownloads = req.nextUrl.pathname.startsWith('/meus-downloads')
  if (isOnMeusDownloads) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
    if (userRole !== Role.FASE && userRole !== Role.ADMIN) {
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/meus-downloads/:path*'],
}
