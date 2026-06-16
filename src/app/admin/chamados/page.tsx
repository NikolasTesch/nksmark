'use client'

import * as React from 'react'
import { 
  LifeBuoy, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Mail, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react'
import { useAdminSupport, SupportTicket } from '@/hooks/useAdminSupport'
import { formatRelativeTime } from '@/lib/utils/format'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function AdminSupportPage() {
  const { tickets, loading, error, refresh, updateStatus } = useAdminSupport()
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const handleStatusToggle = async (ticket: SupportTicket, e: React.MouseEvent) => {
    e.stopPropagation()
    setUpdatingId(ticket.id)
    const newStatus = ticket.status === 'PENDING' ? 'RESOLVED' : 'PENDING'
    await updateStatus(ticket.id, newStatus)
    setUpdatingId(null)
  }

  // Stats
  const totalCount = tickets.length
  const pendingCount = tickets.filter(t => t.status === 'PENDING').length
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length

  return (
    <div className="flex flex-col gap-6 py-2 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-black uppercase tracking-tight text-nks-black mb-1 flex items-center gap-2.5">
            <LifeBuoy className="h-7 w-7 text-nks-red" /> Chamados de Suporte
          </h1>
          <p className="text-xs font-semibold text-nks-gray-400">
            Gerencie e responda as dúvidas e problemas técnicos enviados pelos clientes.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center justify-center p-2.5 border border-nks-gray-200 bg-white hover:bg-nks-gray-100 text-nks-black rounded-sm transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
          title="Atualizar Chamados"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-nks-red' : 'text-nks-black'}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-nks-gray-200 rounded-lg p-4 shadow-nks-sm flex flex-col gap-1">
          <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-wider">Total de Chamados</span>
          <span className="text-2xl font-black text-nks-black leading-none mt-1">{totalCount}</span>
        </div>
        
        <div className="bg-white border border-nks-gray-200 rounded-lg p-4 shadow-nks-sm flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-wider">Pendentes / Abertos</span>
            <span className="h-2 w-2 rounded-full bg-nks-red animate-pulse" />
          </div>
          <span className="text-2xl font-black text-nks-red leading-none mt-1">{pendingCount}</span>
        </div>

        <div className="bg-white border border-nks-gray-200 rounded-lg p-4 shadow-nks-sm flex flex-col gap-1">
          <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-wider">Resolvidos</span>
          <span className="text-2xl font-black text-nks-black leading-none mt-1">{resolvedCount}</span>
        </div>
      </div>

      {error && (
        <div className="bg-nks-red-subtle border border-nks-red/20 p-4 rounded-sm flex items-center gap-3 text-xs font-semibold text-nks-red-dark">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button 
              onClick={refresh} 
              className="underline hover:text-nks-red cursor-pointer uppercase tracking-wider font-extrabold text-[10px]"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Main Content list */}
      <div className="flex flex-col gap-3">
        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3 bg-white border border-nks-gray-200 rounded-lg shadow-nks-sm">
            <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
            <span className="text-xs text-nks-gray-400 font-semibold uppercase tracking-wider">
              Carregando chamados...
            </span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6 bg-white border border-nks-gray-200 rounded-lg shadow-nks-sm">
            <div className="h-12 w-12 rounded-full bg-nks-gray-100 flex items-center justify-center text-nks-gray-400">
              <MessageSquare className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-nks-black">Nenhum chamado registrado</span>
              <span className="text-xs text-nks-gray-400 font-semibold max-w-[280px]">
                Parabéns! Nenhum chamado de suporte pendente no banco de dados.
              </span>
            </div>
          </div>
        ) : (
          tickets.map((ticket, index) => {
            const isExpanded = expandedId === ticket.id
            const isPending = ticket.status === 'PENDING'
            const isUpdating = updatingId === ticket.id

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.4) }}
                className={`border rounded-lg bg-white shadow-nks-sm transition-all overflow-hidden ${
                  isExpanded ? 'border-nks-black' : 'border-nks-gray-200 hover:border-nks-gray-300'
                }`}
              >
                {/* Header of the Card (Always Visible) */}
                <div 
                  onClick={() => toggleExpand(ticket.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-nks-black text-sm sm:text-base leading-tight truncate">
                        {ticket.name}
                      </span>
                      
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-full ${
                        isPending 
                          ? 'bg-nks-red/10 text-nks-red border border-nks-red/20' 
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {isPending ? (
                          <>
                            <Clock className="h-2.5 w-2.5" /> Pendente
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-2.5 w-2.5" /> Resolvido
                          </>
                        )}
                      </span>
                    </div>
                    
                    <span className="text-xs text-nks-gray-500 font-medium truncate flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0 text-nks-gray-400" />
                      {ticket.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5 mt-2 sm:mt-0">
                    <span className="text-[10px] text-nks-gray-400 font-semibold uppercase tracking-wider">
                      {formatRelativeTime(new Date(ticket.createdAt))}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Mark as Resolved button */}
                      <Button
                        size="sm"
                        variant={isPending ? 'default' : 'outline'}
                        onClick={(e) => handleStatusToggle(ticket, e)}
                        disabled={isUpdating}
                        className={`h-8 px-3 text-[10px] font-bold uppercase tracking-wider ${
                          isPending 
                            ? 'bg-nks-black hover:bg-nks-black/95 text-white' 
                            : 'hover:bg-nks-gray-100'
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isPending ? (
                          'Marcar resolvido'
                        ) : (
                          'Reabrir chamado'
                        )}
                      </Button>

                      {/* Expand Chevron */}
                      <div className="text-nks-gray-400 hover:text-nks-black p-1">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Section (Details) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-nks-gray-100 bg-nks-gray-50/50"
                    >
                      <div className="p-5 flex flex-col gap-4 text-sm">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-nks-gray-400 uppercase tracking-wider">
                            Mensagem / Descrição do Problema
                          </span>
                          <div className="bg-white border border-nks-gray-200 rounded p-4 text-nks-gray-800 font-medium leading-relaxed whitespace-pre-wrap font-sans text-xs sm:text-sm shadow-inner">
                            {ticket.message}
                          </div>
                        </div>

                        {/* Expand actions */}
                        <div className="flex items-center gap-3 justify-end pt-1">
                          <a
                            href={`mailto:${ticket.email}?subject=Suporte NKS Art — Chamado de Suporte&body=Olá ${ticket.name},%0D%0A%0D%0ARecebemos seu chamado de suporte referente ao erro abaixo:%0D%0A"${ticket.message}"%0D%0A%0D%0A[Insira sua resposta aqui]%0D%0A%0D%0AAtenciosamente,%0D%0ASuporte NKS Art`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 gap-1.5 text-xs font-semibold hover:bg-nks-gray-100"
                            >
                              <Mail className="h-3.5 w-3.5 text-nks-gray-600" />
                              Responder por E-mail
                              <ExternalLink className="h-3 w-3 text-nks-gray-400" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

    </div>
  )
}
