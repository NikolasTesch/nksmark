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
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen p-6 flex flex-col justify-between shadow-lg shrink-0">
      <div className="flex flex-col gap-8">
        
        <div className="flex flex-col gap-1">
          <span className="font-extrabold text-lg text-white tracking-wide">NKS Art Admin</span>
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Área Protegida</span>
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = isLinkActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/35'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4 pt-6 border-t border-slate-800">
        <Link 
          href="/loja" 
          className="flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
          target="_blank"
        >
          <span>Ir para a Loja</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
        
        <button
          onClick={() => signOut({ callbackUrl: '/loja' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all text-left w-full"
        >
          <LogOut className="h-4.5 w-4.5" />
          Sair do Admin
        </button>
      </div>
    </aside>
  )
}
