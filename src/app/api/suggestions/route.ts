import { NextResponse } from 'next/server'
import { suggestionSchema } from '@/lib/validations/suggestion'
import prisma from '@/lib/prisma'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import { SuggestionEmailTemplate } from '@/lib/email/templates/suggestion'
import * as React from 'react'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = suggestionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, description } = result.data

    const suggestion = await prisma.suggestion.create({
      data: {
        email: email || null,
        description,
      },
    })

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: process.env.ADMIN_EMAIL || 'admin@nksart.com.br',
          subject: 'Nova Sugestão de Arte - NKS Art',
          react: React.createElement(SuggestionEmailTemplate, {
            email: email || undefined,
            description,
          }),
        })
      } catch (err) {
        console.error('Error sending email via Resend:', err)
      }
    }

    return NextResponse.json({ success: true, data: { id: suggestion.id } }, { status: 201 })
  } catch (error) {
    console.error('Error in suggestions API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
