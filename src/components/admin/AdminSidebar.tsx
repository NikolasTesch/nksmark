'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Upload, Sliders, Users, BarChart3, LogOut, History } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function AdminSidebar() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Artes', path: '/admin/artes', icon: <LayoutGrid className="h-4.5 w-4.5" /> },
    { name: 'Upload', path: '/admin/artes/nova', icon: <Upload className="h-4.5 w-4.5" /> },
    { name: 'Conteúdo', path: '/admin/conteudo', icon: <Sliders className="h-4.5 w-4.5" /> },
    { name: 'Usuários Fase', path: '/admin/usuarios', icon: <Users className="h-4.5 w-4.5" /> },
    { name: 'Log de downloads', path: '/admin/downloads', icon: <History className="h-4.5 w-4.5" /> },
  ]


  const isLinkActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  return (
    <aside className="w-64 bg-nks-black text-white min-h-screen p-6 flex flex-col justify-between border-r border-white/5 shrink-0 shadow-nks">
      <div className="flex flex-col gap-6">
        
        {/* Logo NKS | ADMIN */}
        <div className="flex items-center gap-2 py-2">
          <span className="font-display font-black text-[18px] text-white uppercase tracking-tight">NKS</span>
          <span className="text-white/20 font-light text-[18px]">|</span>
          <span className="font-display font-medium text-[11px] text-white/50 uppercase tracking-widest mt-0.5">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {navItems.map((item) => {
            const active = isLinkActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
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
      </div>

      {/* User profile footer */}
      <div className="flex items-center justify-between pt-5 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-nks-red flex items-center justify-center text-white font-display font-black text-sm shadow-nks-sm">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white leading-tight">Admin NKS</span>
            <span className="text-[10px] text-nks-gray-400 font-medium leading-none mt-0.5">admin@nksart.com.br</span>
          </div>
        </div>
        
        <button
          onClick={() => signOut({ callbackUrl: '/loja' })}
          className="text-white/40 hover:text-nks-red transition-colors p-2 hover:bg-white/5 rounded-lg cursor-pointer"
          title="Sair"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </aside>
  )
}

