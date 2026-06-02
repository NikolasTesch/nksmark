'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { File as PrismaFile, Artwork } from '@prisma/client'
import { FormatBadge } from './FormatBadge'
import { Download, Mail, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { formatBytes } from '@/lib/utils/format'

interface DownloadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artwork: Artwork
  files: PrismaFile[]
  userRole?: string
  onDownloadRequest: (fileId: string, email?: string) => Promise<string | null>
}

export function DownloadModal({
  open,
  onOpenChange,
  artwork,
  files,
  userRole,
  onDownloadRequest,
}: DownloadModalProps) {
  const [email, setEmail] = React.useState('')
  const [loadingFileId, setLoadingFileId] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState('')
  const [errorMessage, setErrorMessage] = React.useState('')

  const isFaseOrAdmin = userRole === 'FASE' || userRole === 'ADMIN'

  const handleDownload = async (file: PrismaFile) => {
    if (!isFaseOrAdmin) {
      setErrorMessage('Apenas membros da equipe interna (Fase) podem realizar downloads.')
      return
    }

    setLoadingFileId(file.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const signedUrl = await onDownloadRequest(file.id, email || undefined)
      if (signedUrl) {
        const a = document.createElement('a')
        a.href = signedUrl
        a.download = `${artwork.title.toLowerCase().replace(/\s+/g, '-')}.${file.format.toLowerCase()}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        setSuccessMessage(`Download do arquivo ${file.format} iniciado com sucesso!`)
      } else {
        setErrorMessage('Erro ao gerar URL segura de download. Tente novamente.')
      }
    } catch {
      setErrorMessage('Falha na comunicação com o servidor.')
    } finally {
      setLoadingFileId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Baixar Arquivo Original</DialogTitle>
          <DialogDescription>
            Escolha o formato ideal para edição ou impressão de <strong>{artwork.title}</strong>.
          </DialogDescription>
        </DialogHeader>

        {!isFaseOrAdmin && (
          <div className="bg-nks-red-subtle border border-nks-red/20 p-3.5 rounded flex items-start gap-3 my-2 animate-in fade-in duration-300">
            <AlertTriangle className="h-5 w-5 text-nks-red shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-nks-red-dark block">Download Bloqueado</span>
              <span className="text-xs text-nks-red-dark/80 leading-normal">
                Você está logado como visitante. Downloads são permitidos apenas para a equipe interna (role FASE).
              </span>
            </div>
          </div>
        )}

        {isFaseOrAdmin && (
          <div className="flex flex-col gap-1.5 my-2">
            <label className="text-xs font-bold text-nks-gray-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Confirmar Email de Registro (Opcional)
            </label>
            <Input
              type="email"
              placeholder="seu-email@equipe.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded h-9 border-nks-gray-200"
            />
            <span className="text-[10px] text-nks-gray-400 leading-none">
              {"Isso ajuda a catalogar seu histórico na aba \"Meus Downloads\"."}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 my-2">
          <span className="text-xs font-bold text-nks-gray-400 uppercase tracking-wider block">
            Formatos Disponíveis
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            {files.map((file) => {
              const isLoading = loadingFileId === file.id
              return (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-3 border border-nks-gray-200 rounded hover:bg-nks-gray-100 transition-colors bg-white"
                >
                  <div className="flex items-center gap-3">
                    <FormatBadge format={file.format} />
                    <span className="text-xs font-bold text-nks-gray-700">
                      Tamanho: {formatBytes(file.size)}
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => handleDownload(file)}
                    disabled={!isFaseOrAdmin || loadingFileId !== null}
                    size="sm"
                    className="gap-1.5 font-semibold text-xs px-3.5 h-8 rounded"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {isLoading ? 'Aguarde...' : 'Baixar'}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 p-3.5 rounded flex items-center gap-2.5 text-xs text-green-800 animate-in fade-in duration-300 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-nks-red-subtle border border-nks-red/20 p-3.5 rounded flex items-center gap-2.5 text-xs text-nks-red-dark animate-in fade-in duration-300">
            <AlertTriangle className="h-4 w-4 text-nks-red shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded h-9">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
