'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Menu, X, LogIn, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import { MobileMenu } from './MobileMenu'

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const isLinkActive = (path: string) => pathname === path

  const menuItems = [
    { name: 'Loja', path: '/loja' },
    { name: 'Suporte', path: '/suporte' },
    { name: 'Sugerir Arte', path: '/sugerir-arte' },
    { name: 'Quem Somos', path: '/quem-somos' },
    { name: 'FAQ', path: '/faq' },
  ]

  const userRole = (session?.user as { role?: string })?.role
  if (userRole === 'FASE' || userRole === 'ADMIN') {
    menuItems.push({ name: 'Meus Downloads', path: '/meus-downloads' })
  }
  if (userRole === 'CLIENT') {
    menuItems.push({ name: 'Minhas Compras', path: '/minhas-compras' })
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-nks-black">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">

        {/* Logo + nav institucional */}
        <div className="flex items-center gap-9">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/nks-logo-mark-white.png"
              alt="NKS Art"
              width={120}
              height={30}
              className="h-[30px] w-auto"
              priority
            />
          </Link>

          {/* Desktop Menu Links with Magic Underline */}
          <nav className="hidden md:flex items-center gap-[22px]">
            {menuItems.map((item) => {
              const active = isLinkActive(item.path)
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative text-sm font-medium pb-1.5 transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-white/65 hover:text-white'
                  }`}
                >
                  <span>{item.name}</span>
                  {active && (
                    <motion.div
                      layoutId="header-active-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-nks-red"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Authentication Actions */}
        <div className="hidden md:flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-2.5">
              {userRole === 'ADMIN' ? (
                <Link href="/admin">
                  <span className="inline-flex items-center gap-1 bg-nks-black text-white border border-white/25 px-2 py-1 rounded-sm text-[11px] font-medium uppercase tracking-[0.08em]">
                    <ShieldAlert className="h-3.5 w-3.5" /> Admin
                  </span>
                </Link>
              ) : (
                <span className="bg-nks-red-subtle text-nks-red-dark border border-nks-red px-2 py-1 rounded-sm text-[11px] font-medium uppercase tracking-[0.05em]">
                  {userRole === 'CLIENT' ? 'Cliente' : 'Fase'}
                </span>
              )}
              <span className="text-[13px] font-medium text-white flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" /> {session.user?.name || (userRole === 'CLIENT' ? 'Cliente NKS' : 'Equipe NKS')}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/loja' })}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/55 hover:text-white transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm">
                <LogIn className="h-4 w-4" /> Entrar
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded text-white/80 hover:bg-white/10 transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        menuItems={menuItems}
        session={session}
        userRole={userRole}
      />
    </header>
  )
}
