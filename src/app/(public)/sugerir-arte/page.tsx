'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, CheckCircle2, MessageSquareCode, Upload, X } from 'lucide-react'

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.993L2 22l5.233-1.371a9.936 9.936 0 004.777 1.224h.005c5.505 0 9.989-4.478 9.99-9.985A9.983 9.983 0 0012.012 2zm5.726 14.153c-.316.885-1.547 1.62-2.126 1.724-.527.094-1.218.175-3.52-.779-2.946-1.22-4.838-4.2-4.985-4.397-.147-.197-1.196-1.587-1.196-3.028 0-1.442.757-2.15 1.026-2.43.268-.28.587-.35.783-.35.197 0 .394.002.565.01.18.008.423-.07.662.502.247.592.846 2.07.92 2.217.073.148.12.32.02.518-.1.197-.15.32-.296.492-.147.173-.309.385-.44.516-.148.147-.303.308-.13.604.172.296.764 1.258 1.636 2.032.873.774 1.606 1.013 1.902 1.161.296.147.467.123.639-.074.172-.197.74-.862.937-1.158.197-.296.394-.247.662-.148.269.1.1.71 1.71 1.503.805.394.887.493 1.034.74.148.247.148.714-.168 1.6z"/>
  </svg>
)

export default function SugerirArtePage() {
  const [email, setEmail] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [image, setImage] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState('')

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511999999999'

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('O arquivo selecionado deve ser uma imagem (PNG, JPG, WEBP).')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 5MB.')
        return
      }
      setImage(file)
      setError('')
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImage(null)
    setImagePreview(null)
  }

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
      const formData = new FormData()
      formData.append('email', email)
      formData.append('description', description)
      if (image) {
        formData.append('image', image)
      }

      const res = await fetch('/api/suggestions', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setSuccess(true)
        setEmail('')
        setDescription('')
        setImage(null)
        setImagePreview(null)
      } else {
        const data = await res.json()
        setError(data.error || 'Ocorreu um erro no envio. Tente novamente mais tarde.')
      }
    } catch {
      setError('Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-300">
      <div className="mb-6">
        <span className="nks-eyebrow">Colaboração da Equipe</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-3xl sm:text-4xl text-nks-black mt-3 mb-4 flex items-center gap-2">
          <MessageSquareCode className="h-8 w-8 text-nks-red" /> Sugerir arte
        </h1>
        <p className="text-sm text-nks-gray-700">
          Não encontrou o tema ou vetor que precisava? Diga-nos sua necessidade! Nossa equipe analisa todas as sugestões para novas produções.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Formulário */}
        <div className="md:col-span-2">
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-nks-gray-700">Imagem de exemplo (opcional)</label>
                {!imagePreview ? (
                  <div className="border border-dashed border-nks-gray-200 rounded p-5 flex flex-col items-center justify-center gap-2 hover:bg-nks-gray-50/50 transition-colors cursor-pointer relative min-h-[100px]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="bg-nks-gray-100 p-2 rounded-full text-nks-gray-500">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-nks-black">Clique para enviar imagem</p>
                      <p className="text-[10px] text-nks-gray-400 mt-0.5">PNG, JPG ou WEBP de até 5MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative border border-nks-gray-200 rounded p-2 flex items-center gap-3 bg-nks-gray-50/30">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-14 w-14 object-cover rounded border border-nks-gray-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-nks-black truncate">{image?.name}</p>
                      <p className="text-[10px] text-nks-gray-400 mt-0.5">
                        {(image ? image.size / (1024 * 1024) : 0).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="h-8 w-8 p-0 text-nks-gray-400 hover:text-nks-red hover:bg-nks-red/10 rounded-full shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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

        {/* Card WhatsApp */}
        <div className="bg-white border border-nks-gray-200 rounded p-6 shadow-nks-sm flex flex-col gap-4 sticky top-20">
          <div className="flex items-center gap-3">
            <div className="bg-[#25D366]/10 p-2.5 rounded-full text-[#25D366]">
              <WhatsAppIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display font-bold uppercase tracking-[-0.01em] text-nks-black text-base leading-tight">
                Encomenda Direta
              </h3>
              <span className="text-[10px] text-nks-red font-bold uppercase tracking-[0.05em] block">
                Arte Personalizada
              </span>
            </div>
          </div>

          <p className="text-xs text-nks-gray-600 leading-relaxed">
            Precisa de uma estampa específica ou vetor exclusivo sob medida com urgência? Fale conosco direto no WhatsApp para fazer sua encomenda.
          </p>

          <hr className="border-nks-gray-100" />

          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
              'Olá! Gostaria de encomendar uma arte personalizada e exclusiva.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <Button className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white gap-2 font-semibold">
              <WhatsAppIcon className="h-4 w-4 shrink-0" /> Chamar no WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
