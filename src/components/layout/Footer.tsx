import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Send } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-nks-black text-white mt-auto py-12">
      <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Column 1 - Brand & Tagline */}
        <div className="flex flex-col gap-3 md:col-span-2">
          <Link href="/" className="w-fit block">
            <Image
              src="/brand/nks-logo-mark-white.png"
              alt="NKS Art"
              width={120}
              height={30}
              className="h-[30px] w-auto"
            />
          </Link>
          <p className="text-sm text-white/55 max-w-sm leading-relaxed mt-1">
            Catálogo curado de artes para sublimação — estampas, frases e vetores prontos.
            Baixe em CDR, AI, PDF e OTF. Acesso de download liberado para a equipe interna.
          </p>
          <div className="flex items-center gap-3 mt-2 text-white/45">
            <Link href="https://instagram.com" className="hover:text-primary transition-colors" target="_blank" rel="noreferrer">
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </Link>
            <Link href="https://facebook.com" className="hover:text-primary transition-colors" target="_blank" rel="noreferrer">
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </Link>
            <Link href="https://youtube.com" className="hover:text-primary transition-colors" target="_blank" rel="noreferrer">
              <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </Link>
            <Link href="https://telegram.org" className="hover:text-white transition-colors"><Send className="h-4.5 w-4.5" /></Link>
          </div>
        </div>

        {/* Column 2 - Quick links */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.14em]">
            Navegação
          </span>
          <nav className="flex flex-col gap-2.5">
            <Link href="/loja" className="text-sm text-white/60 hover:text-white transition-colors">Catálogo completo</Link>
            <Link href="/gratis" className="text-sm text-white/60 hover:text-white transition-colors">Artes grátis</Link>
            <Link href="/sugerir-arte" className="text-sm text-white/60 hover:text-white transition-colors">Sugerir arte</Link>
            <Link href="/quem-somos" className="text-sm text-white/60 hover:text-white transition-colors">Quem somos</Link>
          </nav>
        </div>

        {/* Column 3 - Technical Support */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-medium text-white/40 uppercase tracking-[0.14em]">
            Ajuda & contato
          </span>
          <nav className="flex flex-col gap-2.5">
            <Link href="/faq" className="text-sm text-white/60 hover:text-white transition-colors">FAQ</Link>
            <Link href="/suporte" className="text-sm text-white/60 hover:text-white transition-colors">Suporte</Link>
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Acesso da equipe</Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-white/40 leading-none">
          &copy; {currentYear} NKS Art. Todos os direitos reservados.
        </p>
        <p className="text-xs text-white/40 flex items-center gap-1">
          Feito com <Heart className="h-3 w-3 text-nks-red fill-current" /> por quem trabalha com isso o dia todo.
        </p>
      </div>
    </footer>
  )
}
