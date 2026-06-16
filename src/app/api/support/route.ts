import { NextResponse } from 'next/server'
import { supportSchema } from '@/lib/validations/support'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import { SupportEmailTemplate } from '@/lib/email/templates/support'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import prisma from '@/lib/prisma'
import * as React from 'react'

export async function POST(req: Request) {
  try {
    const ip = await getClientIp()
    const limit = rateLimit(`support:${ip}`, 3, 60_000)
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Muitos chamados em sequência. Aguarde um momento e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    }

    const body = await req.json()
    const result = supportSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, message } = result.data

    // Persiste o chamado de suporte no banco de dados
    await prisma.supportTicket.create({
      data: {
        name,
        email,
        message,
      },
    })

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {

      try {
        const { error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: process.env.ADMIN_EMAIL || 'nikolasdtesch@gmail.com',
          subject: 'Novo Chamado de Suporte Técnico - NKS Art',
          react: React.createElement(SupportEmailTemplate, {
            name,
            email,
            message,
          }),
        })
        if (error) {
          console.error('Error sending email via Resend API:', error)
          return NextResponse.json(
            { success: false, error: 'Erro ao enviar o e-mail de suporte.' },
            { status: 500 }
          )
        }
      } catch (err) {
        console.error('Unexpected error sending email via Resend:', err)
        return NextResponse.json(
          { success: false, error: 'Erro inesperado ao enviar o chamado de suporte.' },
          { status: 500 }
        )
      }
    } else {
      console.log('--- Suporte Recebido (RESEND_API_KEY não configurada) ---')
      console.log(`Nome: ${name}`)
      console.log(`Email: ${email}`)
      console.log(`Mensagem: ${message}`)
      console.log('---------------------------------------------------------')
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in support API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
