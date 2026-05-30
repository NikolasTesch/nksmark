'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LifeBuoy, Send, CheckCircle2 } from 'lucide-react'

export default function SuportePage() {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) {
      setError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })

      if (res.ok) {
        setSuccess(true)
        setName('')
        setEmail('')
        setMessage('')
      } else {
        setError('Ocorreu um erro ao enviar sua mensagem. Tente novamente.')
      }
    } catch {
      setError('Falha ao conectar com o servidor de suporte.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 max-w-xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-2 flex items-center gap-2">
          <LifeBuoy className="h-8 w-8 text-primary" /> Suporte Técnico
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Está com dificuldades para abrir algum vetor ou extrair uma fonte? Mande uma mensagem direta para a nossa equipe técnica resolver seu problema!
        </p>
      </div>

      {success ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-500 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">Contato enviado!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-450 max-w-xs">
            Nossa equipe técnica já recebeu seu chamado. Responderemos em seu email corporativo cadastrado em menos de 2 horas.
          </p>
          <Button onClick={() => setSuccess(false)} variant="outline" className="mt-2 rounded-lg">
            Enviar Outra Mensagem
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {error && (
            <div className="bg-red-50 text-red-800 border border-red-200 p-3 rounded-lg text-xs font-semibold font-mono">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nome Completo</label>
            <Input
              type="text"
              placeholder="Digite seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg h-10 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Seu Email Corporativo</label>
            <Input
              type="email"
              placeholder="seu-email@equipe.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg h-10 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Descrição do Problema</label>
            <textarea
              placeholder="Descreva detalhadamente a falha técnica ou erro ao abrir o arquivo (ex: 'O arquivo .CDR no Illustrator abre em branco')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl font-bold h-11 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md gap-2"
          >
            {loading ? 'Processando chamado...' : (
              <>
                <Send className="h-4.5 w-4.5" /> Abrir Chamado Técnico
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
