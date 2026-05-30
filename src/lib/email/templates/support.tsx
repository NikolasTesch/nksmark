import * as React from 'react'

interface SupportEmailTemplateProps {
  name: string
  email: string
  message: string
}

export const SupportEmailTemplate: React.FC<Readonly<SupportEmailTemplateProps>> = ({
  name,
  email,
  message,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
    <h2 style={{ color: '#3b82f6' }}>Novo Contato de Suporte — NKS Art</h2>
    <p>Olá, admin. Você recebeu uma nova mensagem através do formulário de suporte:</p>
    <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
      <p><strong>Nome:</strong> {name}</p>
      <p><strong>Email:</strong> {email}</p>
      <p><strong>Mensagem:</strong></p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
    </div>
    <p style={{ fontSize: '12px', color: '#6b7280' }}>
      Este email foi gerado automaticamente pelo portal NKS Art.
    </p>
  </div>
)
