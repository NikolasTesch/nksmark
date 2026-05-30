'use client'

import * as React from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, User as UserIcon, ShieldAlert, X } from 'lucide-react'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  menuItems: { name: string; path: string }[]
  session: { user?: { name?: string | null; email?: string | null } } | null
  userRole?: string
}

export function MobileMenu({ open, onClose, menuItems, session, userRole }: MobileMenuProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden flex justify-end">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative z-10 w-4/5 max-w-xs h-full bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Menu
            </span>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors py-1.5 border-b border-slate-50 dark:border-slate-800"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          {session ? (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-slate-500 flex items-center gap-1.5 px-1">
                <UserIcon className="h-3.5 w-3.5" /> Logado: {session.user?.name || 'Membro'}
              </span>
              
              {userRole === 'ADMIN' && (
                <Link href="/admin" onClick={onClose}>
                  <Button variant="outline" className="w-full gap-2 font-semibold text-xs border-violet-200 text-violet-600 hover:bg-violet-50">
                    <ShieldAlert className="h-4 w-4" /> Painel Admin
                  </Button>
                </Link>
              )}
              
              <Button
                onClick={() => {
                  onClose()
                  signOut({ callbackUrl: '/' })
                }}
                variant="ghost"
                className="w-full gap-2 text-xs text-red-500 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair da Conta
              </Button>
            </div>
          ) : (
            <Link href="/login" onClick={onClose}>
              <Button className="w-full gap-2 font-semibold text-xs rounded-lg">
                <LogIn className="h-4 w-4" /> Entrar como Equipe
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
