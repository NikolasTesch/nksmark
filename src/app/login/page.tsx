'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError('Credenciais inválidas. Verifique seu email e senha de equipe.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Ocorreu um erro no servidor de autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10 flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
        
        <div className="text-center flex flex-col items-center gap-1.5">
          <Link href="/" className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-sans">
            NKS Art
          </Link>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Acesso de Equipe</span>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/60 p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-red-400 font-semibold leading-normal font-sans">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-500" /> Email Corporativo
            </label>
            <Input
              type="email"
              placeholder="seu-email@equipe.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-950/40 border-slate-800 text-white rounded-lg h-10 placeholder:text-slate-500 focus-visible:ring-indigo-550"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-500" /> Senha de Equipe
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-950/40 border-slate-800 text-white rounded-lg h-10 placeholder:text-slate-500 focus-visible:ring-indigo-550"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl font-bold h-11 bg-gradient-to-r from-violet-600 to-indigo-650 text-white shadow-lg gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Autenticar Acesso'
            )}
          </Button>
        </form>

        <div className="text-center border-t border-slate-800/80 pt-4 mt-1">
          <span className="text-[10px] text-slate-550 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-500" /> Acesso restrito para equipe homologada FASE.
          </span>
          <Link href="/" className="text-xs text-indigo-400 hover:underline mt-2 block font-semibold">
            ← Voltar para o Site Público
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500 animate-pulse" />
      </div>
    }>
      <LoginContent />
    </React.Suspense>
  )
}
