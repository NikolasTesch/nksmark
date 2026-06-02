'use client'

import * as React from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, User as UserIcon, ShieldAlert, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  menuItems: { name: string; path: string }[]
  session: { user?: { name?: string | null; email?: string | null } } | null
  userRole?: string
}

export function MobileMenu({ open, onClose, menuItems, session, userRole }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative z-10 w-4/5 max-w-[280px] h-full bg-nks-black text-white p-6 flex flex-col justify-between shadow-2xl border-l border-white/10"
          >
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="font-display font-extrabold uppercase tracking-[0.05em] text-sm text-nks-red">
                  Navegação
                </span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-sm hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex flex-col gap-1.5">
                {menuItems.map((item, idx) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                  >
                    <Link
                      href={item.path}
                      onClick={onClose}
                      className="block text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 px-2 py-2 rounded-sm border-b border-white/5 transition-all"
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </div>

            {/* User Session Actions */}
            <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
              {session ? (
                <div className="flex flex-col gap-3">
                  <span className="text-[11px] uppercase tracking-[0.05em] text-white/60 flex items-center gap-1.5 px-2">
                    <UserIcon className="h-3.5 w-3.5 text-nks-red" /> {session.user?.name || 'Membro'}
                  </span>
                  
                  {userRole === 'ADMIN' && (
                    <Link href="/admin" onClick={onClose} className="w-full">
                      <Button variant="outline" className="w-full gap-2 font-semibold text-xs border-white/20 text-white hover:bg-white/10 bg-transparent rounded-sm">
                        <ShieldAlert className="h-4 w-4 text-nks-red-light" /> Painel Admin
                      </Button>
                    </Link>
                  )}
                  
                  <Button
                    onClick={() => {
                      onClose()
                      signOut({ callbackUrl: '/loja' })
                    }}
                    variant="ghost"
                    className="w-full gap-2 text-xs text-nks-red-light hover:bg-nks-red-subtle/10 hover:text-white bg-transparent rounded-sm"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair da Conta
                  </Button>
                </div>
              ) : (
                <Link href="/login" onClick={onClose} className="w-full">
                  <Button className="w-full gap-2 font-semibold text-xs rounded-sm bg-nks-red hover:bg-nks-red-dark text-white">
                    <LogIn className="h-4 w-4" /> Entrar como Equipe
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
