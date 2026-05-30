import * as React from 'react'

interface SuggestionEmailTemplateProps {
  email?: string
  description: string
}

export const SuggestionEmailTemplate: React.FC<Readonly<SuggestionEmailTemplateProps>> = ({
  email,
  description,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
    <h2 style={{ color: '#ec4899' }}>Nova Sugestão de Arte — NKS Art</h2>
    <p>Olá, admin. Um usuário enviou uma sugestão de nova arte:</p>
    <div style={{ backgroundColor: '#fdf2f8', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
      <p><strong>Email do Sugerente:</strong> {email || 'Anônimo'}</p>
      <p><strong>Descrição da Ideia:</strong></p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{description}</p>
    </div>
    <p style={{ fontSize: '12px', color: '#6b7280' }}>
      Este email foi gerado automaticamente pelo portal NKS Art.
    </p>
  </div>
)
