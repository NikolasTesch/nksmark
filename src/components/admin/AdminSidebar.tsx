'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Image as ImageIcon, FolderTree, Users, LogOut, ExternalLink } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function AdminSidebar() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { name: 'Gerenciar Artes', path: '/admin/artes', icon: <ImageIcon className="h-4.5 w-4.5" /> },
    { name: 'Gestão de Conteúdo', path: '/admin/conteudo', icon: <FolderTree className="h-4.5 w-4.5" /> },
    { name: 'Gerenciar Equipe', path: '/admin/usuarios', icon: <Users className="h-4.5 w-4.5" /> },
  ]

  const isLinkActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  return (
    <aside className="w-64 bg-nks-black text-white min-h-screen p-6 flex flex-col justify-between border-r border-white/10 shrink-0 shadow-nks">
      <div className="flex flex-col gap-8">
        
        <div className="flex flex-col gap-1">
          <span className="font-display font-extrabold text-[17px] text-white uppercase tracking-tight">NKS Art Admin</span>
          <span className="text-[9px] text-nks-red font-bold uppercase tracking-widest">Área Protegida</span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isLinkActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 py-2.5 text-xs font-semibold transition-all rounded-none border-l-[3px] ${
                  active
                    ? 'bg-white/10 text-white font-bold border-l-nks-red pl-2.5'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border-l-transparent pl-[13px]'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
        <Link 
          href="/loja" 
          className="flex items-center justify-between text-[11px] font-medium text-white/60 hover:text-white transition-colors"
          target="_blank"
        >
          <span>Ir para a Loja</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
        
        <button
          onClick={() => signOut({ callbackUrl: '/loja' })}
          className="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-bold text-white/70 hover:text-nks-red hover:bg-nks-red-subtle/10 border border-white/15 hover:border-nks-red transition-all cursor-pointer text-center w-full"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair do Admin
        </button>
      </div>
    </aside>
  )
}
