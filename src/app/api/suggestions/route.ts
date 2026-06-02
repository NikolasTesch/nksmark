import { NextResponse } from 'next/server'
import { suggestionSchema } from '@/lib/validations/suggestion'
import prisma from '@/lib/prisma'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import { SuggestionEmailTemplate } from '@/lib/email/templates/suggestion'
import { uploadFileToR2 } from '@/lib/r2/upload'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import * as React from 'react'

export async function POST(req: Request) {
  try {
    // Endpoint público: limita por IP para evitar flood de sugestões, abuso de
    // upload no R2 (storage/egress) e email bombing via Resend.
    const ip = await getClientIp()
    const limit = rateLimit(`suggestion:${ip}`, 5, 60_000)
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Muitas sugestões em sequência. Aguarde um momento e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    }

    const contentType = req.headers.get('content-type') || ''
    let email: string | null = null
    let description = ''
    let imageUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      email = (formData.get('email') as string) || null
      description = (formData.get('description') as string) || ''
      const file = formData.get('image') as File | null

      if (file && file.size > 0) {
        // Endpoint público: só aceitamos imagens reais e com tamanho limitado,
        // para não permitir hospedar conteúdo arbitrário (HTML/SVG/scripts) sob
        // o domínio público do R2 — evita phishing / XSS armazenado no domínio.
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

        if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json(
            { success: false, error: 'Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.' },
            { status: 400 }
          )
        }
        if (file.size > MAX_BYTES) {
          return NextResponse.json(
            { success: false, error: 'A imagem deve ter no máximo 5 MB.' },
            { status: 400 }
          )
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const uploadResult = await uploadFileToR2(
          buffer,
          file.name,
          file.type,
          'previews'
        )
        imageUrl = uploadResult.url
      }
    } else {
      const body = await req.json()
      email = body.email || null
      description = body.description || ''
      imageUrl = body.imageUrl || null
    }

    const result = suggestionSchema.safeParse({ email, description, imageUrl })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        email: email || null,
        description,
        imageUrl: imageUrl || null,
      },
    })

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {
      try {
        const { data, error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: process.env.ADMIN_EMAIL || 'nikolasdtesch@gmail.com',
          subject: 'Nova Sugestão de Arte - NKS Art',
          react: React.createElement(SuggestionEmailTemplate, {
            email: email || undefined,
            description,
            imageUrl,
          }),
        })
        if (error) {
          console.error('Error sending email via Resend API:', error)
        }
      } catch (err) {
        console.error('Unexpected error sending email via Resend:', err)
      }
    }

    return NextResponse.json({ success: true, data: { id: suggestion.id } }, { status: 201 })
  } catch (error) {
    console.error('Error in suggestions API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
