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
        <span className="nks-eyebrow">Atendimento e Ajuda</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-3xl sm:text-4xl text-nks-black mt-3 mb-4 flex items-center gap-2">
          <LifeBuoy className="h-8 w-8 text-nks-red" /> Suporte técnico
        </h1>
        <p className="text-sm text-nks-gray-700">
          Está com dificuldades para abrir algum vetor ou extrair uma fonte? Mande uma mensagem direta para a nossa equipe técnica resolver seu problema!
        </p>
      </div>

      {success ? (
        <div className="bg-nks-gray-100 border border-nks-gray-200 p-6 rounded flex flex-col items-center text-center gap-3">
          <CheckCircle2 className="h-12 w-12 text-nks-black shrink-0" />
          <h3 className="text-lg font-semibold text-nks-black">Contato enviado!</h3>
          <p className="text-sm text-nks-gray-700 max-w-xs">
            Nossa equipe técnica já recebeu seu chamado. Responderemos em seu email corporativo cadastrado em menos de 2 horas.
          </p>
          <Button onClick={() => setSuccess(false)} variant="outline" className="mt-2">
            Enviar outra mensagem
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 bg-white border border-nks-gray-200 rounded shadow-nks-sm">
          {error && (
            <div className="bg-nks-red-subtle text-nks-red-dark border border-nks-red/20 p-3 rounded text-xs font-semibold font-mono">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-nks-gray-700">Nome completo</label>
            <Input
              type="text"
              placeholder="Digite seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-nks-gray-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-nks-gray-700">Seu email corporativo</label>
            <Input
              type="email"
              placeholder="seu-email@equipe.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-nks-gray-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-nks-gray-700">Descrição do problema</label>
            <textarea
              placeholder="Descreva detalhadamente a falha técnica ou erro ao abrir o arquivo (ex: 'O arquivo .CDR no Illustrator abre em branco')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex min-h-[120px] w-full rounded border border-nks-gray-200 bg-white px-3 py-2 text-sm transition-colors placeholder:text-nks-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nks-red focus-visible:border-nks-red"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-11 gap-2"
          >
            {loading ? 'Processando chamado...' : (
              <>
                <Send className="h-4 w-4" /> Abrir chamado técnico
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
