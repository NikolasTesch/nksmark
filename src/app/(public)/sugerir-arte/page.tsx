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
        <span className="nks-eyebrow">Colaboração da Equipe</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-3xl sm:text-4xl text-nks-black mt-3 mb-4 flex items-center gap-2">
          <MessageSquareCode className="h-8 w-8 text-nks-red" /> Sugerir arte
        </h1>
        <p className="text-sm text-nks-gray-700">
          Não encontrou o tema ou vetor que precisava? Diga-nos sua necessidade! Nossa equipe analisa todas as sugestões para novas produções.
        </p>
      </div>

      {success ? (
        <div className="bg-nks-gray-100 border border-nks-gray-200 p-6 rounded flex flex-col items-center text-center gap-3">
          <CheckCircle2 className="h-12 w-12 text-nks-black shrink-0" />
          <h3 className="text-lg font-semibold text-nks-black">Sugestão enviada com sucesso!</h3>
          <p className="text-sm text-nks-gray-700 max-w-xs">
            Agradecemos a sua contribuição. Fique de olho no catálogo, pois novas artes são adicionadas semanalmente.
          </p>
          <Button onClick={() => setSuccess(false)} variant="outline" className="mt-2">
            Enviar outra sugestão
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
            <label className="text-xs font-bold text-nks-gray-700">Seu email (opcional)</label>
            <Input
              type="email"
              placeholder="exemplo@equipe.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-nks-gray-200"
            />
            <span className="text-[10px] text-nks-gray-400 leading-none">
              Deixe seu email caso queira receber um aviso quando o tema for publicado.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-nks-gray-700">Descrição da ideia / tema</label>
            <textarea
              placeholder="Detalhe o tema da estampa (ex: 'Artes no tema ciclismo retro com bicicletas clássicas em curvas para camisetas')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[120px] w-full rounded border border-nks-gray-200 bg-white px-3 py-2 text-sm transition-colors placeholder:text-nks-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nks-red focus-visible:border-nks-red"
              required
            />
            <span className="text-[10px] text-nks-gray-400 leading-none">
              Mínimo de 10 caracteres. Tente fornecer detalhes de cores, formatos e público-alvo.
            </span>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-11 gap-2"
          >
            {loading ? 'Processando...' : (
              <>
                <Send className="h-4 w-4" /> Enviar sugestão
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
