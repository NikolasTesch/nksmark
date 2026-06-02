'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/loja'
  const { status } = useSession()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl)
    }
  }, [status, router, callbackUrl])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-nks-black flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-nks-gray-400" />
      </div>
    )
  }

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
    <div className="min-h-screen bg-nks-black flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      
      <div className="w-full max-w-md bg-nks-gray-900 border border-white/10 p-8 rounded shadow-nks-lg relative z-10 flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
        
        <div className="text-center flex flex-col items-center gap-1.5">
          <Link href="/loja" className="font-display font-extrabold uppercase tracking-[-0.03em] leading-none text-2xl text-white">
            NKS Art
          </Link>
          <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-[0.12em] block mt-1">Acesso de equipe</span>
        </div>

        {error && (
          <div className="bg-nks-red-subtle border border-nks-red/20 p-3.5 rounded flex items-start gap-2.5 text-xs text-nks-red-dark font-semibold leading-normal">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-nks-red" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-nks-gray-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-nks-gray-400" /> Email corporativo
            </label>
            <Input
              type="email"
              placeholder="seu-email@equipe.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-nks-black border-white/10 text-white rounded h-10 placeholder:text-nks-gray-400 focus-visible:ring-nks-red focus-visible:border-nks-red"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-nks-gray-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-nks-gray-400" /> Senha de equipe
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-nks-black border-white/10 text-white rounded h-10 placeholder:text-nks-gray-400 focus-visible:ring-nks-red focus-visible:border-nks-red"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-11 gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Autenticar acesso'
            )}
          </Button>
        </form>

        <div className="text-center border-t border-white/10 pt-4 mt-1">
          <span className="text-[10px] text-nks-gray-400 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-nks-red" /> Acesso restrito para equipe homologada FASE.
          </span>
          <Link href="/loja" className="text-xs text-nks-red hover:underline mt-2 block font-semibold hover:text-nks-red-light">
            ← Voltar para o catálogo
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-nks-black flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-nks-gray-400 animate-pulse" />
      </div>
    }>
      <LoginContent />
    </React.Suspense>
  )
}
