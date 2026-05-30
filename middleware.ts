import { auth } from './src/lib/auth/auth'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'

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
