'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LayoutGrid, Upload, Sliders, Users, LogOut, History, Menu, X } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { name: 'Artes', path: '/admin/artes', icon: <LayoutGrid className="h-4 w-4" /> },
  { name: 'Upload', path: '/admin/artes/nova', icon: <Upload className="h-4 w-4" /> },
  { name: 'Conteúdo', path: '/admin/conteudo', icon: <Sliders className="h-4 w-4" /> },
  { name: 'Usuários Fase', path: '/admin/usuarios', icon: <Users className="h-4 w-4" /> },
  { name: 'Log de downloads', path: '/admin/downloads', icon: <History className="h-4 w-4" /> },
]

function NavLinks({ pathname, onLinkClick }: { pathname: string; onLinkClick?: () => void }) {
  const isLinkActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin'
    if (path === '/admin/artes') {
      return pathname === '/admin/artes' || (pathname.startsWith('/admin/artes/') && pathname !== '/admin/artes/nova')
    }
    return pathname.startsWith(path)
  }

  return (
    <nav className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const active = isLinkActive(item.path)
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={onLinkClick}
            className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold transition-all rounded-lg ${
              active
                ? 'bg-nks-red text-white font-bold shadow-nks-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter() {
  const { data: session } = useSession()
  const name = session?.user?.name || 'Admin NKS'
  const email = session?.user?.email || ''
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="flex items-center justify-between pt-5 border-t border-white/5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-nks-red flex items-center justify-center text-white font-display font-black text-sm shadow-nks-sm shrink-0">
          {initial}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-white leading-tight truncate">{name}</span>
          {email && (
            <span className="text-[10px] text-nks-gray-400 font-medium leading-none mt-0.5 truncate">{email}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/loja' })}
        className="text-white/40 hover:text-nks-red transition-colors p-2 hover:bg-white/5 rounded-lg cursor-pointer shrink-0"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  const close = () => setIsMobileOpen(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-30 bg-nks-black border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-[16px] text-white uppercase tracking-tight">NKS</span>
          <span className="text-white/20 font-light text-[16px]">|</span>
          <span className="font-display font-medium text-[10px] text-white/50 uppercase tracking-widest">Admin</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      {isMobileOpen && (
        <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-nks-black text-white p-6 flex flex-col justify-between border-r border-white/5 shadow-2xl overflow-y-auto">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-[18px] text-white uppercase tracking-tight">NKS</span>
                <span className="text-white/20 font-light text-[18px]">|</span>
                <span className="font-display font-medium text-[11px] text-white/50 uppercase tracking-widest mt-0.5">Admin</span>
              </div>
              <button
                onClick={close}
                className="text-white/50 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} onLinkClick={close} />
          </div>
          <UserFooter />
        </aside>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-nks-black text-white min-h-screen p-6 flex-col justify-between border-r border-white/5 shrink-0 shadow-nks">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 py-2">
            <span className="font-display font-black text-[18px] text-white uppercase tracking-tight">NKS</span>
            <span className="text-white/20 font-light text-[18px]">|</span>
            <span className="font-display font-medium text-[11px] text-white/50 uppercase tracking-widest mt-0.5">Admin</span>
          </div>
          <NavLinks pathname={pathname} />
        </div>
        <UserFooter />
      </aside>
    </>
  )
}
