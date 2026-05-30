'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, CheckCircle2, MessageSquareCode } from 'lucide-react'

export default function SugerirArtePage() {
  const [email, setEmail] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.length < 10) {
      setError('A descrição do tema deve conter pelo menos 10 caracteres.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined, description }),
      })

      if (res.ok) {
        setSuccess(true)
        setEmail('')
        setDescription('')
      } else {
        setError('Ocorreu um erro no envio. Tente novamente mais tarde.')
      }
    } catch {
      setError('Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 max-w-xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-2 flex items-center gap-2">
          <MessageSquareCode className="h-8 w-8 text-primary" /> Sugerir Arte
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Não encontrou o tema ou vetor que precisava? Diga-nos sua necessidade! Nossa equipe analisa todas as sugestões para novas produções.
        </p>
      </div>

      {success ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-500 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">Sugestão enviada com sucesso!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-450 max-w-xs">
            Agradecemos a sua contribuição. Fique de olho no catálogo, pois novas artes são adicionadas semanalmente.
          </p>
          <Button onClick={() => setSuccess(false)} variant="outline" className="mt-2 rounded-lg">
            Enviar Outra Sugestão
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {error && (
            <div className="bg-red-50 text-red-850 border border-red-200 p-3 rounded-lg text-xs font-semibold font-mono">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Seu Email (Opcional)</label>
            <Input
              type="email"
              placeholder="exemplo@equipe.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg h-10 border-slate-200 dark:border-slate-800"
            />
            <span className="text-[10px] text-slate-400 leading-none">
              Deixe seu email caso queira receber um aviso quando o tema for publicado.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Descrição da Ideia / Tema</label>
            <textarea
              placeholder="Detalhe o tema da estampa (ex: 'Artes no tema ciclismo retro com bicicletas clássicas em curvas para camisetas')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400"
              required
            />
            <span className="text-[10px] text-slate-400 leading-none">
              Mínimo de 10 caracteres. Tente fornecer detalhes de cores, formatos e público-alvo.
            </span>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl font-bold h-11 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md gap-2"
          >
            {loading ? 'Processando...' : (
              <>
                <Send className="h-4.5 w-4.5" /> Enviar Sugestão
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
