import * as React from 'react'

interface PaymentConfirmedEmailProps {
  customerName?: string | null
  artworkTitle: string
  amountFormatted: string
  downloadsUrl: string
}

export const PaymentConfirmedEmailTemplate: React.FC<Readonly<PaymentConfirmedEmailProps>> = ({
  customerName,
  artworkTitle,
  amountFormatted,
  downloadsUrl,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#1A1A1A' }}>
    <h2 style={{ color: '#dd0b0e' }}>Pagamento confirmado — NKS Art</h2>
    <p>Olá{customerName ? `, ${customerName}` : ''}! Seu pagamento foi aprovado com sucesso. 🎉</p>
    <div style={{ backgroundColor: '#F8F9FA', padding: '16px', borderRadius: '8px', margin: '20px 0' }}>
      <p style={{ margin: '4px 0' }}>
        <strong>Arte:</strong> {artworkTitle}
      </p>
      <p style={{ margin: '4px 0' }}>
        <strong>Valor pago:</strong> {amountFormatted}
      </p>
    </div>
    <p>Seu download já está liberado e fica disponível permanentemente na sua conta:</p>
    <p style={{ margin: '24px 0' }}>
      <a
        href={downloadsUrl}
        style={{
          backgroundColor: '#dd0b0e',
          color: '#FFFFFF',
          textDecoration: 'none',
          padding: '12px 22px',
          borderRadius: '6px',
          fontWeight: 'bold',
          display: 'inline-block',
        }}
      >
        Baixar minha arte
      </a>
    </p>
    <p style={{ fontSize: '12px', color: '#5D6D7E' }}>
      Se o botão não funcionar, acesse: {downloadsUrl}
    </p>
    <p style={{ fontSize: '12px', color: '#5D6D7E' }}>
      Este e-mail foi gerado automaticamente pelo portal NKS Art.
    </p>
  </div>
)
