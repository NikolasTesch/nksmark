'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Loader2, AlertCircle, Mail, Shield, Check, X } from 'lucide-react'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { formatDate } from '@/lib/utils/format'

export default function UsuariosPage() {
  const { users, loading, error, createUser, deleteUser } = useAdminUsers()

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [role, setRole] = React.useState('FASE')
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    if (password.length < 8) {
      setActionError('A senha deve ter ao menos 8 caracteres.')
      return
    }

    setActionLoading(true)
    setActionError(null)
    const result = await createUser(name, email, role, password)
    setActionLoading(false)

    if (result.success) {
      setName('')
      setEmail('')
      setPassword('')
      setRole('FASE')
    } else {
      setActionError(result.error || 'Erro ao cadastrar usuário.')
    }
  }

  const handleDeleteConfirm = async (id: string) => {
    setPendingDeleteId(null)
    setActionLoading(true)
    setActionError(null)
    const result = await deleteUser(id)
    setActionLoading(false)
    if (!result.success) {
      setActionError(result.error || 'Erro ao excluir usuário.')
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      
      <div>
        <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black mb-1">
          Gerenciar Equipe (Usuários)
        </h1>
        <p className="text-xs font-semibold text-nks-gray-700">
          Gerencie o acesso dos designers da equipe interna (role FASE) e outros administradores à plataforma.
        </p>
      </div>

      {(error || actionError) && (
        <div className="bg-nks-red-subtle border border-nks-red p-4 rounded-sm flex items-center gap-3 text-xs font-semibold text-nks-red-dark">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[18px] items-start">
        
        {/* Form Column */}
        <div className="lg:col-span-5 bg-white border border-nks-gray-200 p-6 rounded-sm shadow-nks-sm flex flex-col gap-4.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-nks-red" /> Adicionar Membro da Equipe
          </span>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider flex items-center gap-1">Nome Completo</label>
              <Input
                type="text"
                placeholder="Ex: Nikolas Tesch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider flex items-center gap-1">E-mail Corporativo</label>
              <Input
                type="email"
                placeholder="nome@equipe.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider flex items-center gap-1">Senha de Acesso</label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-sm"
                minLength={8}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">Nível de Acesso (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-sm border border-nks-gray-200 bg-white px-3.5 py-2.5 text-xs text-nks-black focus:outline-none focus:ring-1 focus:ring-nks-red focus:border-nks-red cursor-pointer font-semibold"
              >
                <option value="FASE">Equipe Interna (FASE) — Apenas Downloads</option>
                <option value="ADMIN">Administrador (ADMIN) — Acesso Total</option>
              </select>
            </div>

            <Button type="submit" disabled={actionLoading} className="w-full mt-2 font-display font-extrabold uppercase tracking-wider text-xs h-11 rounded-sm bg-nks-red hover:bg-nks-red-dark text-white cursor-pointer transition-all active:scale-[0.99] border-none shadow-nks-sm">
              {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Cadastrar Usuário
            </Button>
          </form>
        </div>

        {/* List Column */}
        <div className="lg:col-span-7 border border-nks-gray-200 rounded-sm overflow-hidden bg-white shadow-nks-sm">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-nks-black text-white border-b border-nks-gray-200 font-display font-extrabold text-[11px] uppercase tracking-[0.08em]">
                    <th className="py-3.5 px-4">Nome / E-mail</th>
                    <th className="py-3.5 px-4">Nível</th>
                    <th className="py-3.5 px-4">Cadastrado em</th>
                    <th className="py-3.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nks-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-nks-gray-100/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-nks-black">
                            {user.name || 'Sem Nome'}
                          </span>
                          <span className="text-[10px] text-nks-gray-400 font-mono flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border font-display tracking-wider ${
                          user.role === 'ADMIN'
                            ? 'bg-nks-black text-white border-nks-black'
                            : 'bg-nks-red-subtle text-nks-red border-nks-red/20'
                        }`}>
                          <Shield className="h-2.5 w-2.5" />
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-nks-gray-700 font-semibold">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {pendingDeleteId === user.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] font-bold text-nks-red hidden sm:block">Confirmar?</span>
                            <Button
                              onClick={() => handleDeleteConfirm(user.id)}
                              disabled={actionLoading}
                              size="sm"
                              className="h-7 px-2.5 gap-1 text-[10px] font-black bg-nks-red hover:bg-nks-red-dark text-white rounded-sm border-none"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => setPendingDeleteId(null)}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 border border-nks-gray-200 rounded-sm text-[10px] font-bold"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setPendingDeleteId(user.id)}
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading || user.id === 'admin'}
                            className="h-8 w-8 text-nks-red hover:text-nks-red-dark hover:bg-nks-red-subtle border border-nks-red/20 rounded-sm cursor-pointer hover:bg-nks-red-subtle/50 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-nks-gray-400 font-semibold text-xs">Nenhum membro cadastrado na equipe.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
